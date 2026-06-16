import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { redis } from '../utils/redis.js';
import { ScraperService } from '../services/scraper.service.js';
import axios from 'axios';

export async function catalogRoutes(server: FastifyInstance) {
  // Hook de autenticação para todas as rotas de catálogo (exceto proxy)
  server.addHook('preHandler', async (request, reply) => {
    if (request.url.includes('/proxy')) {
      return; // Permite acesso público para o player Video.js carregar os segmentos
    }
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

      // Se for canal FAST direto, roteia através do proxy de CORS local para não bloquear na Smart TV/Navegador
      if (channel.sourceType === 'M3U8_FAST') {
        return reply.send({ 
          url: `/api/v1/catalog/proxy?url=${encodeURIComponent(channel.externalId)}`, 
          headers: {} 
        });
      }

      if (channel.sourceType === 'IFRAME_CAM_AFFILIATE') {
        return reply.send({ url: channel.externalId, headers: {} });
      }

      if (channel.sourceType === 'YOUTUBE_LIVE') {
        // Retorna a URL de transmissão ao vivo contínua baseada no ID do canal do YouTube
        return reply.send({ 
          url: `https://www.youtube.com/embed/live_stream?channel=${channel.externalId}&autoplay=1`,
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

  // POST /v1/catalog/live-resolve
  server.post('/live-resolve', async (request, reply) => {
    const { channelId } = request.body as { channelId: string };
    if (!channelId) {
      return reply.code(400).send({ error: 'O parâmetro channelId é obrigatório.' });
    }

    try {
      const apiKey = process.env.YOUTUBE_API_KEY || 'AIzaSyCqSst_dnDR560tHd4MWvsPYywv1VcXgxw';
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`;
      
      const response = await axios.get(ytUrl, { timeout: 10000 });
      const newVideoId = response.data?.items?.[0]?.id?.videoId;

      if (!newVideoId) {
        return reply.code(404).send({ error: 'Nenhuma transmissão ao vivo encontrada para este canal.' });
      }

      const cacheKey = `youtube:live:${channelId}`;
      try {
        await redis.set(cacheKey, newVideoId, 'EX', 3600);
      } catch (redisErr) {
        server.log.error(redisErr, 'Erro ao salvar live no Redis');
      }

      return reply.send({ 
        videoId: newVideoId,
        url: `https://www.youtube.com/embed/${newVideoId}?autoplay=1&enablejsapi=1`
      });
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Erro ao resolver nova live do YouTube.' });
    }
  });

  // GET /v1/catalog/proxy - Proxy de CORS para canais FAST/M3U8
  server.get('/proxy', async (request, reply) => {
    const { url } = request.query as { url: string };
    if (!url) {
      return reply.code(400).send({ error: 'O parâmetro url é obrigatório.' });
    }

    try {
      const { data, headers } = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });

      let responseData = data;
      const rawContentType = headers['content-type'];
      const contentType = typeof rawContentType === 'string' ? rawContentType : 'application/x-mpegURL';

      if (contentType.includes('mpegurl') || contentType.includes('mpegURL') || url.includes('.m3u8')) {
        const text = data.toString('utf8');
        const parsedUrl = new URL(url);
        const baseUrl = parsedUrl.origin + parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/') + 1);

        const lines = text.split('\n');
        const rewrittenLines = lines.map((line: string) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http')) {
            if (trimmed.startsWith('/')) {
              return parsedUrl.origin + trimmed;
            } else {
              return baseUrl + trimmed;
            }
          }
          return line;
        });
        responseData = Buffer.from(rewrittenLines.join('\n'));
      }

      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Content-Type', contentType);
      return reply.send(responseData);
    } catch (err: any) {
      server.log.error(err);
      return reply.code(502).send({ error: 'Erro ao fazer proxy da transmissão.' });
    }
  });
}
