import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, UserInfo } from '../utils/api.js';
import Player from '../components/Player.js';
import { Tv, LogOut, ShieldAlert, MonitorPlay, Radio, Heart, Flame } from 'lucide-react';

interface Channel {
  id: string;
  title: string;
  category: 'NEWS' | 'MOVIES' | 'ADULT_CONTENT' | 'LIVE_CAMS' | 'PODCASTS';
  sourceType: string;
  externalId: string;
  thumbnailUrl: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [categories, setCategories] = useState<Record<string, Channel[]>>({});
  const [rawChannels, setRawChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Controle do Player
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  // Acessibilidade Smart TV: Foco via Teclado
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const activeUser = apiClient.getUser();
    if (!activeUser) {
      navigate('/login');
      return;
    }
    setUser(activeUser);
    fetchGrid();
  }, [navigate]);

  const fetchGrid = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.request('/catalog/grid');
      setCategories(data.categories || {});
      setRawChannels(data.rawList || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar a grade de canais.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const refreshToken = apiClient.getRefreshToken();
    if (refreshToken) {
      await apiClient.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    apiClient.clearAuth();
    navigate('/login');
  };

  // Escuta teclas de setas do controle remoto / teclado
  useEffect(() => {
    if (loading || rawChannels.length === 0 || activeChannel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowRight') {
        setFocusedIndex(prev => (prev + 1) % rawChannels.length);
      } else if (e.key === 'ArrowLeft') {
        setFocusedIndex(prev => (prev - 1 + rawChannels.length) % rawChannels.length);
      } else if (e.key === 'ArrowDown') {
        // Pular 4 itens (simulando linha de grid)
        setFocusedIndex(prev => (prev + 4) % rawChannels.length);
      } else if (e.key === 'ArrowUp') {
        setFocusedIndex(prev => (prev - 4 + rawChannels.length) % rawChannels.length);
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        setActiveChannel(rawChannels[focusedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, rawChannels, focusedIndex, activeChannel]);

  // Rolar para o elemento focado para manter a visibilidade na TV
  useEffect(() => {
    if (focusedIndex >= 0 && cardRefs.current[focusedIndex]) {
      cardRefs.current[focusedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, [focusedIndex]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'NEWS': return <Radio className="w-5 h-5 text-blue-400" />;
      case 'MOVIES': return <MonitorPlay className="w-5 h-5 text-indigo-400" />;
      case 'ADULT_CONTENT': return <Flame className="w-5 h-5 text-rose-500" />;
      case 'LIVE_CAMS': return <Heart className="w-5 h-5 text-pink-400" />;
      default: return <Tv className="w-5 h-5 text-stone-400" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'NEWS': return 'Notícias';
      case 'MOVIES': return 'Filmes & Séries FAST';
      case 'ADULT_CONTENT': return 'Canais Adultos';
      case 'LIVE_CAMS': return 'Webcams ao Vivo';
      case 'PODCASTS': return 'Podcasts';
      default: return category;
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col pb-16 md:pb-0">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-md border-b border-stone-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Tv className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-400">
            TV Motel
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-stone-500 uppercase">Usuário</span>
            <span className="text-sm text-stone-300 font-medium">{user?.email}</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 hover:bg-stone-900 text-stone-400 hover:text-white p-2.5 rounded-xl border border-transparent hover:border-stone-850 transition-all focus:outline-none"
            title="Sair da plataforma"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden md:inline text-sm font-semibold">Sair</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 max-w-7xl w-full mx-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-stone-400 text-sm">Carregando catálogo de entretenimento...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
            <ShieldAlert className="w-12 h-12 text-red-500" />
            <h2 className="text-lg font-bold text-red-200">Falha ao obter a grade do sistema</h2>
            <p className="text-red-300/80 text-sm">{error}</p>
            <button
              onClick={fetchGrid}
              className="bg-primary hover:bg-primary-hover text-white font-bold py-2.5 px-6 rounded-xl transition-all"
            >
              Recarregar Grade
            </button>
          </div>
        )}

        {!loading && !error && rawChannels.length === 0 && (
          <div className="text-center py-20">
            <Tv className="w-16 h-16 text-stone-750 mx-auto mb-4" />
            <p className="text-stone-400 text-lg">Nenhum canal ativo cadastrado no catálogo.</p>
          </div>
        )}

        {!loading && !error && Object.keys(categories).map(categoryKey => (
          <section key={categoryKey} className="mb-10">
            <div className="flex items-center gap-2 mb-4 border-b border-stone-900 pb-2">
              {getCategoryIcon(categoryKey)}
              <h2 className="text-xl font-bold tracking-wide text-stone-200">
                {getCategoryLabel(categoryKey)}
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {categories[categoryKey].map(channel => {
                // Descobrir o índice absoluto na lista para acessibilidade via teclado
                const absoluteIndex = rawChannels.findIndex(c => c.id === channel.id);
                const isFocused = absoluteIndex === focusedIndex;

                return (
                  <div
                    key={channel.id}
                    ref={el => cardRefs.current[absoluteIndex] = el}
                    onClick={() => setActiveChannel(channel)}
                    className={`group cursor-pointer bg-stone-900 border border-stone-850 rounded-2xl overflow-hidden hover:scale-102 transition-all duration-200 ${
                      isFocused ? 'tv-active-focus' : ''
                    }`}
                  >
                    {/* Imagem/Card Preview */}
                    <div className="relative aspect-video bg-stone-950 overflow-hidden">
                      <img
                        src={channel.thumbnailUrl}
                        alt={channel.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90" />
                      
                      {/* Categoria Badge */}
                      <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/10 uppercase tracking-wider text-stone-300">
                        {channel.sourceType.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Título */}
                    <div className="p-4">
                      <h3 className="font-bold text-stone-200 group-hover:text-primary transition-colors line-clamp-1 text-sm md:text-base">
                        {channel.title}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* Player Modal */}
      {activeChannel && (
        <Player
          title={activeChannel.title}
          sourceType={activeChannel.sourceType}
          channelId={activeChannel.id}
          onBack={() => setActiveChannel(null)}
          resolveStreamUrl={() => apiClient.request(`/catalog/stream/${activeChannel.id}`)}
        />
      )}
    </div>
  );
}
