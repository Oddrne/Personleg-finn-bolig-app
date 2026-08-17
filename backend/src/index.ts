import { buildApp } from './app.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

const app = await buildApp();
await app.listen({ port, host: '0.0.0.0' });
