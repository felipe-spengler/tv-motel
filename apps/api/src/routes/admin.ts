import { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';

interface ChannelBody {
  title: string;
  category: 'NEWS' | 'MOVIES' | 'ADULT_CONTENT' | 'LIVE_CAMS' | 'PODCASTS';
  sourceType: 'YOUTUBE_LIVE' | 'M3U8_FAST' | 'SCRAPER_XVIDEOS' | 'IFRAME_CAM_AFFILIATE';
  externalId: string;
  thumbnailUrl: string;
  isActive?: boolean;
  orderPriority?: number;
}

export async function adminRoutes(server: FastifyInstance) {
  // Pre-handler hook to authenticate and verify ADMIN role
  server.addHook('preHandler', async (request, reply) => {
    try {
      const decoded = await request.jwtVerify() as { role: string };
      if (decoded.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
      }
    } catch (err) {
      return reply.code(401).send({ error: 'Não autorizado.' });
    }
  });

  // GET /v1/admin/metrics - Estatísticas Gerais do Sistema
  server.get('/metrics', async (request, reply) => {
    try {
      const totalUsers = await prisma.user.count();
      const activeSessionsCount = await prisma.userSession.count();
      
      const activeSessions = await prisma.userSession.findMany({
        include: {
          user: {
            select: {
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          lastActivity: 'desc'
        }
      });

      return reply.send({
        totalUsers,
        activeSessionsCount,
        activeSessions
      });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao buscar métricas.' });
    }
  });

  // GET /v1/admin/users - Listagem Geral de Usuários
  server.get('/users', async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        include: {
          subscription: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return reply.send(users);
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao buscar lista de usuários.' });
    }
  });

  // PUT /v1/admin/users/:id/status - Suspender/Ativar Usuário
  server.put('/users/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: 'ACTIVE' | 'SUSPENDED' };

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return reply.code(400).send({ error: 'Status inválido. Deve ser ACTIVE ou SUSPENDED.' });
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { status }
      });

      // Se o usuário foi suspenso, derrubar todas as sessões ativas dele
      if (status === 'SUSPENDED') {
        await prisma.userSession.deleteMany({
          where: { userId: id }
        });
      }

      return reply.send(updatedUser);
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao atualizar status do usuário.' });
    }
  });

  // CRUD DO CATÁLOGO DE CANAIS

  // GET /v1/admin/channels - Buscar todos os canais (ativos e inativos)
  server.get('/channels', async (request, reply) => {
    try {
      const channels = await prisma.catalogChannel.findMany({
        orderBy: {
          orderPriority: 'desc'
        }
      });
      return reply.send(channels);
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao buscar canais.' });
    }
  });

  // POST /v1/admin/channels - Criar canal
  server.post('/channels', async (request, reply) => {
    const body = request.body as ChannelBody;

    try {
      const channel = await prisma.catalogChannel.create({
        data: {
          title: body.title,
          category: body.category,
          sourceType: body.sourceType,
          externalId: body.externalId,
          thumbnailUrl: body.thumbnailUrl,
          isActive: body.isActive !== undefined ? body.isActive : true,
          orderPriority: body.orderPriority || 0
        }
      });
      return reply.code(211).send(channel);
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao criar canal no catálogo.' });
    }
  });

  // PUT /v1/admin/channels/:id - Atualizar canal
  server.put('/channels/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as ChannelBody;

    try {
      const updatedChannel = await prisma.catalogChannel.update({
        where: { id },
        data: {
          title: body.title,
          category: body.category,
          sourceType: body.sourceType,
          externalId: body.externalId,
          thumbnailUrl: body.thumbnailUrl,
          isActive: body.isActive !== undefined ? body.isActive : true,
          orderPriority: body.orderPriority !== undefined ? body.orderPriority : 0
        }
      });
      return reply.send(updatedChannel);
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao atualizar canal.' });
    }
  });

  // DELETE /v1/admin/channels/:id - Deletar canal
  server.delete('/channels/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.catalogChannel.delete({
        where: { id }
      });
      return reply.send({ message: 'Canal deletado com sucesso.' });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao deletar canal.' });
    }
  });
}
