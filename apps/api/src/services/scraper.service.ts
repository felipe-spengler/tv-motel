import axios from 'axios';
import * as cheerio from 'cheerio';

export class ScraperService {
  /**
   * Obtém a URL real de streaming de um vídeo do XVideos baseado no seu ID/slug externo.
   * @param externalId O ID ou slug do vídeo (ex: "video12345/titulo_do_video")
   */
  static async scrapeXVideos(externalId: string): Promise<string> {
    const targetUrl = externalId.startsWith('http') 
      ? externalId 
      : `https://www.xvideos.com/${externalId}`;

    try {
      const { data: html } = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.xvideos.com/'
        },
        timeout: 10000
      });

      // Padrões comuns no player HTML5 do XVideos:
      const hlsMatch = html.match(/html5player\.setVideoHLS\s*\(\s*'([^']+)'\s*\)/);
      if (hlsMatch && hlsMatch[1]) {
        return hlsMatch[1];
      }

      const highMatch = html.match(/html5player\.setVideoUrlHigh\s*\(\s*'([^']+)'\s*\)/);
      if (highMatch && highMatch[1]) {
        return highMatch[1];
      }

      const lowMatch = html.match(/html5player\.setVideoUrlLow\s*\(\s*'([^']+)'\s*\)/);
      if (lowMatch && lowMatch[1]) {
        return lowMatch[1];
      }

      throw new Error('Não foi possível encontrar uma URL de streaming válida no player HTML5.');
    } catch (error: any) {
      console.warn(`[Scraper Warning] Falha ao raspar XVideos para id ${externalId}: ${error.message}. Utilizando stream de demonstração (fallback HLS).`);
      // Fallback HLS seguro para evitar 502/404 e manter a TV funcionando
      return 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
    }
  }

  /**
   * Obtém uma lista de vídeos do XVideos com base em um termo de busca e página.
   * Se a query estiver vazia, carrega a home do XVideos (vídeos populares).
   */
  static async scrapeXVideosList(query?: string, page: number = 1): Promise<any[]> {
    const baseUrl = 'https://www.xvideos.com/';
    const url = query 
      ? `${baseUrl}?k=${encodeURIComponent(query)}&p=${page}`
      : `${baseUrl}?p=${page}`;

    try {
      const { data: html } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://www.xvideos.com/'
        },
        timeout: 10000
      });

      const $ = cheerio.load(html);
      const videos: any[] = [];

      $('.mozaique .thumb-block').each((_i, elem) => {
        const $elem = $(elem);
        const path = $elem.find('p.title a').attr('href');
        const title = $elem.find('p.title a').attr('title') || $elem.find('p.title a').text();
        const duration = $elem.find('.duration').first().text().trim();
        const thumb = $elem.find('.thumb img').attr('data-src') || $elem.find('.thumb img').attr('src');

        if (path && title) {
          // Filtrar: Apenas vídeos com 5 minutos ou mais
          if (duration) {
            // Correspondência de padrão de minuto (ex: "5 min", "18 min", "5 minutos")
            const minMatch = duration.match(/(\d+)\s*(min|m|minuto|minute)/i);
            if (minMatch) {
              const minutes = parseInt(minMatch[1], 10);
              if (minutes < 5) return; // ignora vídeos com menos de 5 min
            }
          }

          videos.push({
            id: path.replace(/^\//, ''), // remove leading slash
            title: title.trim(),
            duration: duration || '',
            thumbnailUrl: thumb || 'https://images.unsplash.com/photo-1598128558393-70ff21433be0?q=80&w=400'
          });
        }
      });

      return videos;
    } catch (error: any) {
      console.error(`Erro ao listar vídeos do XVideos para query ${query}:`, error.message);
      return [];
    }
  }
}

