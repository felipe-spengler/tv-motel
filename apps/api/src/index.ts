import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { catalogRoutes } from './routes/catalog.js';
import { adminRoutes } from './routes/admin.js';

dotenv.config();

const server = Fastify({
  logger: process.env.NODE_ENV === 'development' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  } : true,
});

const PORT = Number(process.env.PORT) || 5050;
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  try {
    // Register CORS
    await server.register(cors, {
      origin: true,
      credentials: true,
    });

    // Register JWT
    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'supersecretkeychangeinproduction',
    });

    // Register Routes
    await server.register(authRoutes, { prefix: '/v1/auth' });
    await server.register(catalogRoutes, { prefix: '/v1/catalog' });
    await server.register(adminRoutes, { prefix: '/v1/admin' });

    // Health check
    server.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Start server
    await server.listen({ port: PORT, host: HOST });
    console.log(`Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();
