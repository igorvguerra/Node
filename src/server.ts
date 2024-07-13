import fastify from "fastify";
import { createTrip } from "./routes/create-trips";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { confirmTrip } from "./routes/confirm-trip";
import cors from '@fastify/cors';
import { confirmParticipants } from "./routes/confirm-participant";
import { createActivity } from "./routes/create-activity";

const app = fastify();

app.register(cors, {
    origin: true,
})

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(createTrip)
app.register(confirmTrip)
app.register(confirmParticipants)
app.register(createActivity)

app.listen({ port: 3333}).then(() => {
    console.log('Server running!')
});

