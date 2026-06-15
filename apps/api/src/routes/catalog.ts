import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { redis } from '../utils/redis.js';
import { ScraperService } from '../services/scraper.service.js';

export async function catalogRoutes(server: FastifyInstance) {
  // Hook de autenticação para todas as rotas de catálogo
  server.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Token de acesso inválido ou ausente.' });
    }
  });

  // GET /v1/catalog/grid
  server.get('/grid', async (request, reply) => {
    try {
      const channels = await prisma.catalogChannel.findMany({
        where: { isActive: true },
        orderBy: [
          { orderPriority: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      // Agrupar canais por categoria para facilitar a renderização de carrosséis no front
      const categories: Record<string, any[]> = {};
      
      channels.forEach((channel: any) => {
        if (!categories[channel.category]) {
          categories[channel.category] = [];
        }
        categories[channel.category].push(channel);
      });

      return reply.send({ categories, rawList: channels });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao buscar grade do catálogo' });
    }
  });

  // GET /v1/catalog/stream/:id
  server.get('/stream/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      // 1. Buscar informações do canal/vídeo no banco
      const channel = await prisma.catalogChannel.findUnique({
        where: { id }
      });

      if (!channel || !channel.isActive) {
        return reply.code(404).send({ error: 'Conteúdo não encontrado ou inativo.' });
      }

      // Se for canal FAST direto ou afiliado, não precisa rodar Scraper, retorna a própria URL configurada no externalId
      if (channel.sourceType === 'M3U8_FAST' || channel.sourceType === 'IFRAME_CAM_AFFILIATE') {
        return reply.send({ url: channel.externalId, headers: {} });
      }

      if (channel.sourceType === 'YOUTUBE_LIVE') {
        // Retorna a URL padrão do live stream do YouTube (ou embed)
        return reply.send({ 
          url: `https://www.youtube.com/embed/${channel.externalId}?autoplay=1`,
          headers: {}
        });
      }

      // Se for do tipo Scraper (ex: XVideos)
      if (channel.sourceType === 'SCRAPER_XVIDEOS') {
        const cacheKey = `stream:video:${channel.id}`;

        // 2. Tentar buscar do Cache do Redis
        try {
          const cachedUrl = await redis.get(cacheKey);
          if (cachedUrl) {
            server.log.info(`[Redis Cache Hit] URL resolvida do cache para o canal ${channel.title}`);
            return reply.send({ url: cachedUrl, headers: { 'User-Agent': 'Mozilla/5.0' } });
          }
        } catch (redisErr: any) {
          server.log.error(redisErr, 'Erro ao conectar ou consultar o Redis');
        }

        // 3. Cache Miss: Executar o Scraper
        server.log.info(`[Redis Cache Miss] Rodando scraper do XVideos para o canal ${channel.title}...`);
        
        try {
          const resolvedUrl = await ScraperService.scrapeXVideos(channel.externalId);
          
          // Salvar no Redis com TTL de 2 horas (7200 segundos)
          try {
            await redis.set(cacheKey, resolvedUrl, 'EX', 7200);
          } catch (redisErr: any) {
            server.log.error(redisErr, 'Erro ao salvar no Redis');
          }

          return reply.send({
            url: resolvedUrl,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': 'https://www.xvideos.com/'
            }
          });
        } catch (scraperErr: any) {
          server.log.error(scraperErr);
          return reply.code(502).send({ 
            error: 'Não foi possível obter a URL de streaming da fonte original. Tente novamente mais tarde.',
            details: scraperErr.message
          });
        }
      }

      return reply.code(400).send({ error: 'Tipo de fonte de vídeo desconhecido.' });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao resolver fluxo de vídeo.' });
    }
  });

  // GET /v1/catalog/xvideos/search
  server.get('/xvideos/search', async (request, reply) => {
    const { query, page } = request.query as { query?: string; page?: string };
    const pageNum = page ? parseInt(page, 10) : 1;
    
    try {
      const videos = await ScraperService.scrapeXVideosList(query, pageNum);
      return reply.send({ videos });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao buscar vídeos do XVideos' });
    }
  });

  // GET /v1/catalog/xvideos/stream
  server.get('/xvideos/stream', async (request, reply) => {
    const { externalId } = request.query as { externalId: string };
    if (!externalId) {
      return reply.code(400).send({ error: 'O parâmetro externalId é obrigatório.' });
    }

    try {
      const resolvedUrl = await ScraperService.scrapeXVideos(externalId);
      return reply.send({
        url: resolvedUrl,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.xvideos.com/'
        }
      });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao resolver vídeo do XVideos' });
    }
  });
}
