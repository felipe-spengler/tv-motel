const { PrismaClient } = require('./client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Criar Usuário Admin Padrão
  const adminEmail = 'admin@motelinteligente.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        subscription: {
          create: {
            planType: 'PREMIUM'
          }
        }
      }
    });
    console.log('Admin user created:', admin.email);
  }

  // 2. Criar Usuário Teste Comum
  const userEmail = 'teste@motelinteligente.com';
  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail }
  });

  if (!existingUser) {
    const passwordHash = await bcrypt.hash('user123', 10);
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        subscription: {
          create: {
            planType: 'FREE'
          }
        }
      }
    });
    console.log('Test user created:', user.email);
  }

  // 3. Criar Código de Ativação de Teste (794613)
  const testCode = '794613';
  const existingCode = await prisma.activationCode.findUnique({
    where: { code: testCode }
  });

  if (!existingCode) {
    await prisma.activationCode.create({
      data: {
        code: testCode,
        clientName: 'Administrador (Teste)',
        maxDevices: 1,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Expira em 1 ano
        isActive: true
      }
    });
    console.log('Test activation code created:', testCode);
  }

  // 4. Criar Canais Padrão no Catálogo
  const channels = [
    {
      title: 'Globo Ao Vivo',
      category: 'NEWS',
      sourceType: 'M3U8_FAST',
      externalId: 'https://amg00716-globo-amg00716c1-tcl-br-9495.playouts.now.amagi.tv/playlist.m3u8',
      thumbnailUrl: 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?q=80&w=400',
      orderPriority: 10,
    },
    {
      title: 'UOL Ao Vivo',
      category: 'NEWS',
      sourceType: 'YOUTUBE_LIVE',
      externalId: '@UOL',
      thumbnailUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=400',
      orderPriority: 9,
    },
    {
      title: 'Jovem Pan News Ao Vivo',
      category: 'NEWS',
      sourceType: 'M3U8_FAST',
      externalId: 'https://d6yfbj4xxtrod.cloudfront.net/out/v1/7836eb391ec24452b149f3dc6df15bbd/index.m3u8',
      thumbnailUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=400',
      orderPriority: 8,
    },
    {
      title: 'CazéTV Ao Vivo',
      category: 'NEWS',
      sourceType: 'YOUTUBE_LIVE',
      externalId: '@CazeTV',
      thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=400',
      orderPriority: 7,
    },
    {
      title: 'Canal GOAT Ao Vivo',
      category: 'NEWS',
      sourceType: 'YOUTUBE_LIVE',
      externalId: '@CanalGoat',
      thumbnailUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=400',
      orderPriority: 6,
    },
    {
      title: 'FIFA+ Ao Vivo',
      category: 'MOVIES',
      sourceType: 'M3U8_FAST',
      externalId: 'https://e3be9ac5.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/TEctYnJfRklGQVBsdXNQb3J0dWd1ZXNlX0hMUw/playlist.m3u8',
      thumbnailUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=400',
      orderPriority: 5,
    },
  ];

  // Limpar catálogo existente para garantir atualização total dos links/ids
  await prisma.catalogChannel.deleteMany({});
  console.log('Cleared existing catalog channels.');

  for (const channel of channels) {
    await prisma.catalogChannel.create({
      data: channel
    });
    console.log('Channel created:', channel.title);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
