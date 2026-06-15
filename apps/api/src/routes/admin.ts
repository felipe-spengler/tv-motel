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
      const totalCodes = await prisma.activationCode.count();
      const activeSessionsCount = await prisma.userSession.count();
      
      const activeSessions = await prisma.userSession.findMany({
        include: {
          user: {
            select: {
              email: true,
              role: true
            }
          },
          activationCode: {
            select: {
              code: true,
              clientName: true
            }
          }
        },
        orderBy: {
          lastActivity: 'desc'
        }
      });

      return reply.send({
        totalUsers,
        totalCodes,
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

  // GESTÃO DE CÓDIGOS DE ATIVAÇÃO

  // GET /v1/admin/codes - Listar todos os códigos
  server.get('/codes', async (request, reply) => {
    try {
      const codes = await prisma.activationCode.findMany({
        include: {
          _count: {
            select: { sessions: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return reply.send(codes);
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao buscar códigos de ativação.' });
    }
  });

  interface CodeCreateBody {
    clientName: string;
    maxDevices: number;
    expiresAt: string;
    code?: string;
  }

  // POST /v1/admin/codes - Criar código de ativação
  server.post('/codes', async (request, reply) => {
    const { clientName, maxDevices, expiresAt, code: customCode } = request.body as CodeCreateBody;

    if (!clientName || !maxDevices || !expiresAt) {
      return reply.code(400).send({ error: 'Nome do cliente, limite de dispositivos e data de expiração são obrigatórios.' });
    }

    try {
      let codeStr = customCode;
      if (!codeStr) {
        // Gerar código único de 6 dígitos
        let attempts = 0;
        while (attempts < 10) {
          const candidate = Math.floor(100000 + Math.random() * 900000).toString();
          const existing = await prisma.activationCode.findUnique({ where: { code: candidate } });
          if (!existing) {
            codeStr = candidate;
            break;
          }
          attempts++;
        }
      }

      if (!codeStr) {
        return reply.code(500).send({ error: 'Não foi possível gerar um código numérico único automaticamente.' });
      }

      const newCode = await prisma.activationCode.create({
        data: {
          code: codeStr,
          clientName,
          maxDevices: Number(maxDevices),
          expiresAt: new Date(expiresAt),
          isActive: true
        }
      });

      return reply.code(211).send(newCode);
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao criar código de ativação.' });
    }
  });

  interface CodeUpdateBody {
    clientName?: string;
    maxDevices?: number;
    expiresAt?: string;
    isActive?: boolean;
  }

  // PUT /v1/admin/codes/:id - Atualizar código de ativação
  server.put('/codes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as CodeUpdateBody;

    try {
      const updateData: any = {};
      if (body.clientName !== undefined) updateData.clientName = body.clientName;
      if (body.maxDevices !== undefined) updateData.maxDevices = Number(body.maxDevices);
      if (body.expiresAt !== undefined) updateData.expiresAt = new Date(body.expiresAt);
      if (body.isActive !== undefined) updateData.isActive = body.isActive;

      const updated = await prisma.activationCode.update({
        where: { id },
        data: updateData
      });

      // Se desativado, derrubar sessões
      if (body.isActive === false) {
        await prisma.userSession.deleteMany({
          where: { activationCodeId: id }
        });
      }

      return reply.send(updated);
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao atualizar código.' });
    }
  });

  // DELETE /v1/admin/codes/:id - Excluir código
  server.delete('/codes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.activationCode.delete({
        where: { id }
      });
      return reply.send({ message: 'Código de ativação removido com sucesso.' });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao excluir código.' });
    }
  });

  // POST /v1/admin/codes/:id/clear - Limpar todos os dispositivos conectados daquele código
  server.post('/codes/:id/clear', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.userSession.deleteMany({
        where: { activationCodeId: id }
      });
      return reply.send({ message: 'Todos os dispositivos conectados foram deslogados com sucesso.' });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao desconectar dispositivos vinculados.' });
    }
  });

  // DELETE /v1/admin/sessions/:id - Desconectar uma sessão/dispositivo específico
  server.delete('/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.userSession.delete({
        where: { id }
      });
      return reply.send({ message: 'Dispositivo desconectado com sucesso.' });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao desconectar dispositivo específico.' });
    }
  });
}
