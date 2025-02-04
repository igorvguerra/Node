import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod';
import { prisma } from "../lib/prisma";
import {dayjs} from "../lib/dayjs";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer';
import { ClientError } from "../errors/client-error";
import { env } from "../env";


export async function confirmTrip(app: FastifyInstance){
    app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId/confirm', {
        schema: {
            params:z.object({
                tripId: z.string().uuid(),
            })
        }
    }, async (request, reply) => {

        const { tripId } = request.params

        const trip = await prisma.trip.findUnique({
            where: {
                id: tripId,
            },
            include: {
                participants: {
                    where: {
                        is_owner: false,
                    }
                }
            }
        })

        if (!trip) {
            throw new ClientError("Trip not found.")
        }

        if (trip.is_confirmed) {
            return reply.redirect(`${env.WEB_BASE_URL}/trips/${tripId}`)
        }

        await prisma.trip.update({
            where: { id: tripId },
            data: { is_confirmed: true },
        })

       
        const formattedStartedDate = dayjs(trip.starts_at).format('LL')
        const formattedEndDate = dayjs(trip.ends_at).format('LL')

        
        const mail = await getMailClient()

        await Promise.all(
            trip.participants.map(async (participant) => {
                const confirmationLink = `${env.API_BASE_URL}/participants/${participant.id}/confirm`
                
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
            })
        )

        return reply.redirect(`${env.WEB_BASE_URL}/trips/${tripId}`)
    });
};
