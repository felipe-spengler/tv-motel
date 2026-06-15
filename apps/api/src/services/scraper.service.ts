import axios from 'axios';

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
      // html5player.setVideoHLS('https://...')
      // html5player.setVideoUrlHigh('https://...')
      // html5player.setVideoUrlLow('https://...')
      
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
      console.error(`Erro ao raspar XVideos para id ${externalId}:`, error.message);
      throw new Error(`Falha no scraper XVideos: ${error.message}`);
    }
  }
}
