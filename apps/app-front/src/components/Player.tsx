import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface PlayerProps {
  title: string;
  sourceType: string;
  channelId: string;
  onBack: () => void;
  resolveStreamUrl: () => Promise<{ url: string; headers: Record<string, string> }>;
}

export default function Player({ title, sourceType, onBack, resolveStreamUrl }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<any>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Carregar e resolver o link de streaming da API
  const loadStream = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await resolveStreamUrl();
      setStreamUrl(data.url);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar o link de streaming.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStream();
  }, [retryCount]);

  // Inicializar e destruir o player de vídeo do Video.js
  useEffect(() => {
    if (!videoRef.current || !streamUrl || sourceType === 'YOUTUBE_LIVE' || sourceType === 'IFRAME_CAM_AFFILIATE') return;

    // Inicializar Video.js
    const options = {
      autoplay: true,
      controls: true,
      responsive: true,
      fluid: true,
      sources: [{
        src: streamUrl,
        type: streamUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
      }]
    };

    playerRef.current = videojs(videoRef.current, options, () => {
      console.log('Video.js player is ready');
    });

    // Tratamento de erros do player
    playerRef.current.on('error', () => {
      setError('O streaming foi interrompido ou o link expirou.');
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [streamUrl, sourceType]);

  // Escuta tecla 'Esc' ou 'Back' para voltar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col justify-center items-center">
      {/* Barra superior de controle */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-stone-900/60 hover:bg-stone-800 border border-stone-800 text-white px-4 py-2 rounded-xl backdrop-blur-md transition-all focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </button>
        <h2 className="text-lg font-bold text-white tracking-wide truncate max-w-lg">
          Assistindo: <span className="text-primary">{title}</span>
        </h2>
        <div className="w-20"></div> {/* Spacer */}
      </div>

      {/* Área do Player */}
      <div className="w-full h-full flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-10 h-10 text-primary animate-spin" />
            <p className="text-stone-400 text-sm">Resolvendo link seguro de transmissão...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-4 text-center p-6 max-w-md bg-stone-900/80 border border-stone-800 rounded-2xl backdrop-blur-xl">
            <p className="text-red-400 text-sm font-semibold">{error}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-primary/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar Novamente (Atualizar Link)</span>
            </button>
          </div>
        )}

        {!loading && !error && streamUrl && (
          <>
            {sourceType === 'YOUTUBE_LIVE' ? (
              <iframe
                src={streamUrl}
                title={title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : sourceType === 'IFRAME_CAM_AFFILIATE' ? (
              <iframe
                src={streamUrl}
                title={title}
                className="w-full h-full border-0 bg-stone-950"
                allowFullScreen
              />
            ) : (
              <div data-vjs-player className="w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="video-js vjs-default-skin w-full h-full"
                  playsInline
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
