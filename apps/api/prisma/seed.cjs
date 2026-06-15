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
      title: 'Jovem Pan News Ao Vivo',
      category: 'NEWS',
      sourceType: 'YOUTUBE_LIVE',
      externalId: 'uf8n4zM8Rpw',
      thumbnailUrl: 'https://img.youtube.com/vi/uf8n4zM8Rpw/maxresdefault.jpg',
      orderPriority: 10,
    },
    {
      title: 'CNN Brasil Ao Vivo',
      category: 'NEWS',
      sourceType: 'YOUTUBE_LIVE',
      externalId: 'r53mrs3r3b4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=400',
      orderPriority: 9,
    },
    {
      title: 'Pluto TV Filmes Ação',
      category: 'MOVIES',
      sourceType: 'M3U8_FAST',
      externalId: 'https://images.pluto.tv/channels/5efbe41cb914900007b7c2cc/featuredImage.jpg',
      thumbnailUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=400',
      orderPriority: 5,
    },
    {
      title: 'Vídeo Adulto Teste (XVideos)',
      category: 'ADULT_CONTENT',
      sourceType: 'SCRAPER_XVIDEOS',
      externalId: 'video.ubdkild43ee/mulher_gostosa_massagem_relaxante',
      thumbnailUrl: 'https://images.unsplash.com/photo-1598128558393-70ff21433be0?q=80&w=400',
      isActive: true,
      orderPriority: 1,
    },
    {
      title: 'Chaturbate - Cams Recomendadas',
      category: 'LIVE_CAMS',
      sourceType: 'IFRAME_CAM_AFFILIATE',
      externalId: 'https://chaturbate.com/in/?track=default&tour=T10e&campaign=tvmotel',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400',
      orderPriority: 2,
    }
  ];

  for (const channel of channels) {
    const existing = await prisma.catalogChannel.findFirst({
      where: { title: channel.title }
    });

    if (!existing) {
      await prisma.catalogChannel.create({
        data: channel
      });
      console.log('Channel created:', channel.title);
    }
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
