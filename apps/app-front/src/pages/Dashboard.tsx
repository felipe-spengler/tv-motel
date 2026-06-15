import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, UserInfo } from '../utils/api.js';
import Player from '../components/Player.js';
import { Tv, LogOut, ShieldAlert, MonitorPlay, Radio, Heart, Flame, Search } from 'lucide-react';

interface Channel {
  id: string;
  title: string;
  category: 'NEWS' | 'MOVIES' | 'ADULT_CONTENT' | 'LIVE_CAMS' | 'PODCASTS';
  sourceType: string;
  externalId: string;
  thumbnailUrl: string;
  isDynamic?: boolean;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [categories, setCategories] = useState<Record<string, Channel[]>>({});
  const [rawChannels, setRawChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Abas e Busca XVideos
  const [activeTab, setActiveTab] = useState<'normal' | 'adult'>('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [dynamicVideos, setDynamicVideos] = useState<Channel[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

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

  // Carregar lista de XVideos populares por padrão na aba adulta
  useEffect(() => {
    if (activeTab === 'adult' && dynamicVideos.length === 0) {
      fetchXVideos('');
    }
    setFocusedIndex(-1); // Reseta o foco ao mudar de aba
  }, [activeTab]);

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

  const fetchXVideos = async (query: string) => {
    setSearchLoading(true);
    setSearchError('');
    try {
      const data = await apiClient.request(`/catalog/xvideos/search?query=${encodeURIComponent(query)}`);
      const list = (data.videos || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        category: 'ADULT_CONTENT' as const,
        sourceType: 'SCRAPER_XVIDEOS',
        externalId: v.id,
        thumbnailUrl: v.thumbnailUrl,
        isDynamic: true
      }));
      setDynamicVideos(list);
    } catch (err: any) {
      setSearchError(err.message || 'Erro ao buscar no XVideos.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = () => {
    fetchXVideos(searchQuery);
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

  // Compilar itens visíveis na aba atual para o controle de teclado
  const isAdultCategory = (cat: string) => cat === 'ADULT_CONTENT' || cat === 'LIVE_CAMS';

  const visibleItems = [
    ...rawChannels.filter(c => {
      const isAdult = isAdultCategory(c.category);
      return activeTab === 'adult' ? isAdult : !isAdult;
    }),
    ...(activeTab === 'adult' ? dynamicVideos : [])
  ];

  // Escuta teclas de setas do controle remoto / teclado
  useEffect(() => {
    if (loading || visibleItems.length === 0 || activeChannel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
        // Se estiver digitando na busca, não bloqueia o teclado para letras, apenas setas verticais
        const isTyping = document.activeElement?.tagName === 'INPUT';
        if (isTyping && ['Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          return;
        }
        e.preventDefault();
      }

      if (e.key === 'ArrowRight') {
        setFocusedIndex(prev => (prev + 1) % visibleItems.length);
      } else if (e.key === 'ArrowLeft') {
        setFocusedIndex(prev => (prev - 1 + visibleItems.length) % visibleItems.length);
      } else if (e.key === 'ArrowDown') {
        setFocusedIndex(prev => (prev + 4) % visibleItems.length);
      } else if (e.key === 'ArrowUp') {
        setFocusedIndex(prev => (prev - 4 + visibleItems.length) % visibleItems.length);
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        setActiveChannel(visibleItems[focusedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, visibleItems, focusedIndex, activeChannel]);

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

  const filteredCategoryKeys = Object.keys(categories).filter(key => {
    if (activeTab === 'adult') {
      return isAdultCategory(key);
    } else {
      return !isAdultCategory(key);
    }
  });

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

        {/* Tab Switcher */}
        {!loading && !error && (
          <div className="bg-stone-900/60 p-1 rounded-xl border border-stone-850 flex gap-1">
            <button
              onClick={() => setActiveTab('normal')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs transition-all focus:outline-none ${
                activeTab === 'normal'
                  ? 'bg-primary text-white shadow shadow-primary/25'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Canais & Filmes</span>
            </button>
            <button
              onClick={() => setActiveTab('adult')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs transition-all focus:outline-none ${
                activeTab === 'adult'
                  ? 'bg-rose-600 text-white shadow shadow-rose-600/25'
                  : 'text-stone-400 hover:text-rose-450'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Conteúdo Adulto 18+</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-stone-500 uppercase">Cliente / Dispositivo</span>
            <span className="text-sm text-stone-300 font-medium">{user?.clientName || user?.code}</span>
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

        {/* XVideos Search Bar for Adult Tab */}
        {!loading && !error && activeTab === 'adult' && (
          <div className="mb-8 max-w-lg mx-auto flex flex-col gap-3">
            <div className="bg-stone-900/60 p-2 rounded-2xl border border-stone-850 flex items-center gap-2">
              <Search className="w-5 h-5 text-stone-500 ml-2" />
              <input
                type="text"
                placeholder="Buscar no XVideos (ex: massagem)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="bg-transparent border-0 flex-1 px-2 py-2 text-stone-100 placeholder-stone-600 focus:outline-none text-sm"
              />
              <button
                onClick={handleSearch}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all focus:outline-none"
              >
                Buscar
              </button>
            </div>
            
            {/* Category pills for quick tags */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: '🔥 Geral', tag: '' },
                { label: '💆 Massagem', tag: 'massagem' },
                { label: '🇧🇷 Amador', tag: 'amador nacional' },
                { label: '💑 Casal', tag: 'casal' },
                { label: '💋 Oral', tag: 'boquete' },
                { label: '🍑 Anal', tag: 'anal' }
              ].map(pill => (
                <button
                  key={pill.label}
                  onClick={() => {
                    setSearchQuery(pill.tag);
                    fetchXVideos(pill.tag);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    searchQuery === pill.tag
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/10'
                      : 'bg-stone-900/40 text-stone-400 border-stone-800 hover:text-white hover:border-stone-700'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories Row */}
        {!loading && !error && filteredCategoryKeys.map(categoryKey => (
          <section key={categoryKey} className="mb-10">
            <div className="flex items-center gap-2 mb-4 border-b border-stone-900 pb-2">
              {getCategoryIcon(categoryKey)}
              <h2 className="text-xl font-bold tracking-wide text-stone-200">
                {getCategoryLabel(categoryKey)}
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {categories[categoryKey].map(channel => {
                const absoluteIndex = visibleItems.findIndex(c => c.id === channel.id);
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
                    </div>

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

        {/* Dynamic XVideos section */}
        {!loading && !error && activeTab === 'adult' && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4 border-b border-stone-900 pb-2">
              <Flame className="w-5 h-5 text-rose-500" />
              <h2 className="text-xl font-bold tracking-wide text-stone-200">
                {searchQuery ? `Vídeos sobre "${searchQuery}" no XVideos` : 'Vídeos em Destaque do XVideos'}
              </h2>
            </div>

            {searchLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-stone-500 text-xs">Raspando vídeos da rede do XVideos...</p>
              </div>
            )}

            {searchError && !searchLoading && (
              <p className="text-red-400 text-sm text-center py-6">{searchError}</p>
            )}

            {!searchLoading && !searchError && dynamicVideos.length === 0 && (
              <p className="text-stone-500 text-sm text-center py-6">Nenhum vídeo encontrado no XVideos para esta busca.</p>
            )}

            {!searchLoading && !searchError && dynamicVideos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {dynamicVideos.map(video => {
                  const absoluteIndex = visibleItems.findIndex(c => c.id === video.id);
                  const isFocused = absoluteIndex === focusedIndex;

                  return (
                    <div
                      key={video.id}
                      ref={el => cardRefs.current[absoluteIndex] = el}
                      onClick={() => setActiveChannel(video)}
                      className={`group cursor-pointer bg-stone-900 border border-stone-850 rounded-2xl overflow-hidden hover:scale-102 transition-all duration-200 ${
                        isFocused ? 'tv-active-focus' : ''
                      }`}
                    >
                      <div className="relative aspect-video bg-stone-950 overflow-hidden">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1598128558393-70ff21433be0?q=80&w=400';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90" />
                        
                        <span className="absolute top-3 left-3 bg-rose-650 text-white text-xs font-semibold px-2.5 py-1 rounded-lg border border-rose-500/20 uppercase tracking-wider">
                          XVideos
                        </span>
                      </div>

                      <div className="p-4">
                        <h3 className="font-bold text-stone-200 group-hover:text-rose-500 transition-colors line-clamp-1 text-sm md:text-base">
                          {video.title}
                        </h3>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Player Modal */}
      {activeChannel && (
        <Player
          title={activeChannel.title}
          sourceType={activeChannel.sourceType}
          channelId={activeChannel.id}
          onBack={() => setActiveChannel(null)}
          resolveStreamUrl={async () => {
            if (activeChannel.isDynamic) {
              return apiClient.request(`/catalog/xvideos/stream?externalId=${encodeURIComponent(activeChannel.id)}`);
            }
            return apiClient.request(`/catalog/stream/${activeChannel.id}`);
          }}
        />
      )}
    </div>
  );
}
