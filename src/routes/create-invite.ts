import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod';
import { prisma } from "../lib/prisma"; 
import {dayjs} from "../lib/dayjs";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer';




export async function createInvite(app: FastifyInstance){
    app.withTypeProvider<ZodTypeProvider>().post('/trips/:tripId/invites', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
            body: z.object({
                email: z.string().email(),
               
           }),
        },
    }, 
    
    async (request) => {
        const { tripId } = request.params
        const { email } = request.body

    const trip = await prisma.trip.findUnique({
        where: { id: tripId }
    })

    if (!trip) {
        throw new Error("Trip not found.")
    }


    const participant = await prisma.participant.create({
        data: {
            email,
            trip_id: tripId,
        }
    })

    const formattedStartedDate = dayjs(trip.starts_at).format('LL')
    const formattedEndDate = dayjs(trip.ends_at).format('LL')

        
    const mail = await getMailClient()


    const confirmationLink = `http://localhost:3333/participants/${participant.id}/confirm`
        const message = await mail.sendMail({
            from: {
                name: 'Team plann.er',
                address: 'hellos@plann.er',
            },
            to: participant.email,
            subject: `Confirm your presence on the trip to ${trip.destination} on ${formattedStartedDate}.`,
            html: `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1,6;">
                <p>You were invited to a trip to <strong>${trip.destination}</strong> on the dates of <strong>${formattedStartedDate}</strong> to <strong>${formattedEndDate}</strong></p>
                <p></p>
                <p>To confirm your presence on this trip please click on the link below.</p>
                <p></p>
                <p>
                    <a href="${confirmationLink}">Confirm trip</a>
                </p>
                <p></p>
                <p>If you have no knowledge about this trip, please disregard this email.</p>
            </div>
        `.trim()
        })
        
            console.log(nodemailer.getTestMessageUrl(message));

            return { participantId: participant.id}
        },
    )
};