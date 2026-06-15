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

interface ActivateBody {
  code: string;
  deviceType: 'WEB_MOBILE' | 'WEB_DESKTOP' | 'ANDROID_TV' | 'FIRE_STICK';
}

  // POST /v1/auth/activate
  server.post('/activate', async (request, reply) => {
    const { code, deviceType } = request.body as ActivateBody;

    if (!code || !deviceType) {
      return reply.code(400).send({ error: 'Código e tipo de dispositivo são obrigatórios' });
    }

    try {
      const activationCode = await prisma.activationCode.findUnique({
        where: { code }
      });

      if (!activationCode) {
        return reply.code(404).send({ error: 'Código de ativação não encontrado' });
      }

      if (!activationCode.isActive) {
        return reply.code(403).send({ error: 'Este código de ativação está suspenso/inativo' });
      }

      if (activationCode.expiresAt < new Date()) {
        return reply.code(403).send({ error: 'Este código de ativação está expirado' });
      }

      // Contar sessões ativas para este código
      const activeSessionsCount = await prisma.userSession.count({
        where: { activationCodeId: activationCode.id }
      });

      if (activeSessionsCount >= activationCode.maxDevices) {
        return reply.code(403).send({ error: 'Limite de dispositivos atingido para este código' });
      }

      // Criar nova sessão do dispositivo
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const ip = request.ip;

      await prisma.userSession.create({
        data: {
          activationCodeId: activationCode.id,
          deviceType,
          refreshToken,
          ipAddress: ip
        }
      });

      // Gerar Token JWT com dados da ativação
      const token = server.jwt.sign(
        {
          id: activationCode.id,
          code: activationCode.code,
          maxDevices: activationCode.maxDevices,
          clientName: activationCode.clientName,
          plan: activationCode.maxDevices >= 20 ? 'PREMIUM' : 'FREE'
        },
        { expiresIn: '1d' } // Expiração maior para dispositivos logados na TV
      );

      return reply.send({
        token,
        refreshToken,
        clientName: activationCode.clientName
      });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao validar código de ativação' });
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
        include: {
          user: { include: { subscription: true } },
          activationCode: true
        }
      });

      if (!session) {
        return reply.code(401).send({ error: 'Sessão inválida ou expirada' });
      }

      // Se for sessão de Admin (User)
      if (session.userId) {
        if (session.user?.status === 'SUSPENDED') {
          return reply.code(401).send({ error: 'Conta de administrador suspensa' });
        }

        await prisma.userSession.update({
          where: { id: session.id },
          data: { lastActivity: new Date() }
        });

        const planType = session.user?.subscription?.planType || 'FREE';
        const token = server.jwt.sign(
          { id: session.user?.id, email: session.user?.email, role: session.user?.role, plan: planType },
          { expiresIn: '1h' }
        );

        return reply.send({ token });
      }

      // Se for sessão de Dispositivo (ActivationCode)
      if (session.activationCodeId) {
        const code = session.activationCode;
        if (!code || !code.isActive || code.expiresAt < new Date()) {
          return reply.code(401).send({ error: 'Código de ativação suspenso ou expirado' });
        }

        await prisma.userSession.update({
          where: { id: session.id },
          data: { lastActivity: new Date() }
        });

        const token = server.jwt.sign(
          {
            id: code.id,
            code: code.code,
            maxDevices: code.maxDevices,
            clientName: code.clientName,
            plan: code.maxDevices >= 20 ? 'PREMIUM' : 'FREE'
          },
          { expiresIn: '1d' }
        );

        return reply.send({ token });
      }

      return reply.code(401).send({ error: 'Sessão inválida' });
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
