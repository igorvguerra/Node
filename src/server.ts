import fastify from "fastify";
import { prisma } from "./lib/prisma";

const app = fastify();

app.get('/register', async () => {
    await prisma.trip.create({
        data: {
            destination: 'Lisbon',
            starts_at: new Date(),
            ends_at: new Date(),
        },
    })

    return("Your register was sucessful.")
});

app.get('/list',  async() => {
   const trips = await prisma.trip.findMany()
    
    return trips
});

app.listen({ port: 3333}).then(() => {
    console.log('Server running!')
});