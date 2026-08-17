import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { registerRoutes } from './routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute'
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    reply.code(400).send({ error: message });
  });

  await registerRoutes(app);
  return app;
}
