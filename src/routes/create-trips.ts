import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {dayjs} from '../lib/dayjs';
import { z } from 'zod';
import { prisma } from "../lib/prisma"; 
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer';
import { ClientError } from "../errors/client-error";
import { env } from "../env";



export async function createTrip(app: FastifyInstance){
    app.withTypeProvider<ZodTypeProvider>().post('/trips', {
        schema: {
            body:z.object({
                destination: z.string().min(4),
                starts_at: z.coerce.date(),
                ends_at: z.coerce.date(),
                owner_name: z.string(),
                owner_email: z.string().email(),
                emails_to_invite: z.array(z.string().email()),
            })
        }
    }, async (request) => {
        const { destination, starts_at, ends_at, owner_name, owner_email, emails_to_invite } = request.body

        if (dayjs(starts_at).isBefore(new Date())){
            throw new ClientError("Invalid trip start date.")
        }

        if (dayjs(ends_at).isBefore(starts_at)){
            throw new ClientError("Invalid trip end date.")
        }
        
       

        const trip = await prisma.trip.create({
            data: {
                destination,
                starts_at,
                ends_at,
                participants: {
                    createMany: {
                        data: [
                            {
                                name: owner_name,
                                email:owner_email,
                                is_owner: true,
                                is_confirmed: true,
                            },
                            
                            ...emails_to_invite.map(email => {
                                return { email }
                            })
                        ]
                    } 
                }

                }
            
        })

        const formattedStartedDate = dayjs(starts_at).format('LL')
        const formattedEndDate = dayjs(ends_at).format('LL')

        const confirmationLink = `${env.API_BASE_URL}/trips/${trip.id}/confirm`

        const mail = await getMailClient()

        const message = await mail.sendMail({
            from: {
                name: 'Team plann.er',
                address: 'hellos@plann.er',
            },
            to: {
                name: owner_name,
                address: owner_email,
            },
            subject: `Confirm your trip to ${destination} on ${formattedStartedDate}.`,
            html: `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1,6;">
                <p>You have requested the creation of a trip to <strong>${destination}</strong> on the dates of <strong>${formattedStartedDate}</strong> to <strong>${formattedEndDate}</strong></p>
                <p></p>
                <p>To confirm your trip please click on the link below.</p>
                <p></p>
                <p>
                    <a href="${confirmationLink}">Confirm trip</a>
                </p>
                <p></p>
                <p>If you didn't request a trip, please disregard this email.</p>
            </div>
       `.trim()
        })
        
        console.log(nodemailer.getTestMessageUrl(message));

        return { tripId: trip.id }
    });
};