import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../utils/prisma.js';

interface RegisterBody {
  email: string;
  password?: string;
}

interface LoginBody {
  email: string;
  password?: string;
  deviceType?: 'WEB_MOBILE' | 'WEB_DESKTOP' | 'ANDROID_TV' | 'FIRE_STICK';
}

interface RefreshBody {
  refreshToken: string;
}

export async function authRoutes(server: FastifyInstance) {
  // POST /v1/auth/register
  server.post('/register', async (request, reply) => {
    const { email, password } = request.body as RegisterBody;

    if (!email || !password) {
      return reply.code(400).send({ error: 'E-mail e senha são obrigatórios' });
    }

    try {
      const userExists = await prisma.user.findUnique({ where: { email } });
      if (userExists) {
        return reply.code(409).send({ error: 'Este e-mail já está cadastrado' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          subscription: {
            create: {
              planType: 'FREE',
            },
          },
        },
        include: {
          subscription: true,
        },
      });

      return reply.code(211).send({
        message: 'Usuário cadastrado com sucesso',
        user: { id: user.id, email: user.email, role: user.role },
      });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // POST /v1/auth/login
  server.post('/login', async (request, reply) => {
    const { email, password, deviceType = 'WEB_DESKTOP' } = request.body as LoginBody;

    if (!email || !password) {
      return reply.code(400).send({ error: 'E-mail e senha são obrigatórios' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { subscription: true },
      });

      if (!user || user.status === 'SUSPENDED') {
        return reply.code(401).send({ error: 'Credenciais inválidas ou conta suspensa' });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return reply.code(401).send({ error: 'Credenciais inválidas' });
      }

      // Validação de Sessões Simultâneas:
      const activeSessionsCount = await prisma.userSession.count({
        where: { userId: user.id },
      });

      const planType = user.subscription?.planType || 'FREE';
      const maxSessions = planType === 'PREMIUM' ? 5 : 2;

      // Se exceder o limite, derrubamos a sessão mais antiga
      if (activeSessionsCount >= maxSessions) {
        const oldestSession = await prisma.userSession.findFirst({
          where: { userId: user.id },
          orderBy: { lastActivity: 'asc' },
        });

        if (oldestSession) {
          await prisma.userSession.delete({
            where: { id: oldestSession.id },
          });
        }
      }

      // Criar nova sessão
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const ip = request.ip;

      await prisma.userSession.create({
        data: {
          userId: user.id,
          deviceType,
          refreshToken,
          ipAddress: ip,
        },
      });

      // Gerar JWT Token
      const token = server.jwt.sign(
        { id: user.id, email: user.email, role: user.role, plan: planType },
        { expiresIn: '1h' }
      );

      return reply.send({
        token,
        refreshToken,
        user: { id: user.id, email: user.email, role: user.role, plan: planType },
      });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro interno ao realizar login' });
    }
  });

  // POST /v1/auth/refresh
  server.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as RefreshBody;

    if (!refreshToken) {
      return reply.code(400).send({ error: 'Refresh token é obrigatório' });
    }

    try {
      const session = await prisma.userSession.findUnique({
        where: { refreshToken },
        include: { user: { include: { subscription: true } } },
      });

      if (!session || session.user.status === 'SUSPENDED') {
        return reply.code(401).send({ error: 'Sessão inválida ou expirada' });
      }

      // Atualizar a última atividade da sessão
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastActivity: new Date() },
      });

      const planType = session.user.subscription?.planType || 'FREE';

      // Gerar novo JWT Token
      const token = server.jwt.sign(
        { id: session.user.id, email: session.user.email, role: session.user.role, plan: planType },
        { expiresIn: '1h' }
      );

      return reply.send({ token });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao renovar token de acesso' });
    }
  });

  // POST /v1/auth/logout
  server.post('/logout', async (request, reply) => {
    const { refreshToken } = request.body as RefreshBody;

    if (!refreshToken) {
      return reply.code(400).send({ error: 'Refresh token é obrigatório' });
    }

    try {
      await prisma.userSession.delete({
        where: { refreshToken },
      }).catch(() => {});

      return reply.send({ message: 'Logout realizado com sucesso' });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao deslogar' });
    }
  });
}
