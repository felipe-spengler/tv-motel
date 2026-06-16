import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { catalogRoutes } from './routes/catalog.js';
import { adminRoutes } from './routes/admin.js';
import { prisma } from './utils/prisma.js';
import { Category, SourceType } from '../prisma/client/index.js';

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

    // Auto-sync/seed channels on startup
    try {
      console.log('Checking database channels integrity...');
      const defaultChannels = [
        {
          title: 'Globo Ao Vivo',
          category: Category.NEWS,
          sourceType: SourceType.M3U8_FAST,
          externalId: 'https://amg00716-globo-amg00716c1-tcl-br-9495.playouts.now.amagi.tv/playlist.m3u8',
          thumbnailUrl: 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?q=80&w=400',
          orderPriority: 10,
        },
        {
          title: 'UOL Ao Vivo',
          category: Category.NEWS,
          sourceType: SourceType.YOUTUBE_LIVE,
          externalId: 'UCE46S_7YgNGz9bSxsL3f0_A',
          thumbnailUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=400',
          orderPriority: 9,
        },
        {
          title: 'Jovem Pan News Ao Vivo',
          category: Category.NEWS,
          sourceType: SourceType.M3U8_FAST,
          externalId: 'https://d6yfbj4xxtrod.cloudfront.net/out/v1/7836eb391ec24452b149f3dc6df15bbd/index.m3u8',
          thumbnailUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=400',
          orderPriority: 8,
        },
        {
          title: 'CazéTV Ao Vivo',
          category: Category.NEWS,
          sourceType: SourceType.YOUTUBE_LIVE,
          externalId: 'UC_3M2U0YmZst7fS3_C4S7Cg',
          thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=400',
          orderPriority: 7,
        },
        {
          title: 'Canal GOAT Ao Vivo',
          category: Category.NEWS,
          sourceType: SourceType.YOUTUBE_LIVE,
          externalId: 'UC6G9NdfofOWeYrcnUOn0jYg',
          thumbnailUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=400',
          orderPriority: 6,
        },
        {
          title: 'FIFA+ Ao Vivo',
          category: Category.MOVIES,
          sourceType: SourceType.M3U8_FAST,
          externalId: 'https://e3be9ac5.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/TEctYnJfRklGQVBsdXNQb3J0dWd1ZXNlX0hMUw/playlist.m3u8',
          thumbnailUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=400',
          orderPriority: 5,
        },
      ];

      const existingCount = await prisma.catalogChannel.count();
      const hasUol = await prisma.catalogChannel.findFirst({
        where: { title: 'UOL Ao Vivo' }
      });

      if (existingCount === 0 || !hasUol) {
        console.log('Seeding channels on startup because database does not have UOL Ao Vivo or is empty...');
        await prisma.catalogChannel.deleteMany({});
        for (const channel of defaultChannels) {
          await prisma.catalogChannel.create({ data: channel });
        }
        console.log('Startup database sync completed successfully!');
      } else {
        console.log('Database channels are up to date.');
      }
    } catch (dbErr) {
      console.error('Failed to auto-seed/sync channels on startup:', dbErr);
    }

    // Start server
    await server.listen({ port: PORT, host: HOST });
    console.log(`Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();
