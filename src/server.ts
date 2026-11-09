import { createServer } from 'node:http';
import { createHandler } from './app.ts';

const port = Number(process.env.PORT ?? 3000);
const rateLimit = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 120);

const server = createServer(createHandler({ rateLimit }));

server.listen(port, () => {
  console.log(`tr-validator-api listening on http://localhost:${port}`);
  console.log(`OpenAPI spec: http://localhost:${port}/openapi.json`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
