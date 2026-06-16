import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, UserInfo } from '../utils/api.js';
import Player from '../components/Player.js';
import { Tv, LogOut, ShieldAlert, MonitorPlay, Radio, Heart, Flame, Trophy } from 'lucide-react';

interface Channel {
  id: string;
  title: string;
  category: 'NEWS' | 'MOVIES' | 'ADULT_CONTENT' | 'LIVE_CAMS' | 'PODCASTS';
  sourceType: string;
  externalId: string;
  thumbnailUrl: string;
  isDynamic?: boolean;
}

const ADULT_CATEGORIES = [
  { label: '🔥 Geral', tag: '' },
  { label: '🇧🇷 Brasileiras', tag: 'brasileira' },
  { label: '🇧🇷 Amador', tag: 'amador' },
  { label: '💆 Massagem', tag: 'massagem' },
  { label: '💑 Casal', tag: 'casal' },
  { label: '👵 Coroas / MILF', tag: 'coroas milf' },
  { label: '👱‍♀️ Loiras', tag: 'loira' },
  { label: '👩 Morenas', tag: 'morena' },
  { label: '👩‍🦰 Ruivas', tag: 'ruiva' },
  { label: '🥵 Trans', tag: 'trans' },
  { label: '🍑 Anal', tag: 'anal' },
  { label: '💋 Oral', tag: 'boquete' },
  { label: '👥 Suruba', tag: 'suruba' },
  { label: '👩‍❤️‍👩 Lésbicas', tag: 'lesbicas' },
  { label: '👾 Hentai', tag: 'hentai' },
  { label: '🏢 Fetiche', tag: 'bdsm fetiche' },
  { label: '🎥 POV', tag: 'pov' },
  { label: '🥛 Gozada', tag: 'gozada creampie' },
  { label: '💦 Safadas', tag: 'safadas' },
  { label: '👩‍🏫 Colegial', tag: 'colegial' },
  { label: '👙 Peitudas', tag: 'peitudas' },
  { label: '🍑 Bunda Grande', tag: 'bunda' },
  { label: '👨‍❤️‍👨 Gay', tag: 'gay' },
  { label: '🧼 Banho', tag: 'banho' }
];

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

  // Acessibilidade Smart TV: Foco via Teclado/Controle Remoto
  const [focusSection, setFocusSection] = useState<'tabs' | 'categories' | 'channels'>('channels');
  const [focusedTabIndex, setFocusedTabIndex] = useState<number>(0); // 0: normal, 1: adult, 2: logout
  const [focusedCategoryIndex, setFocusedCategoryIndex] = useState<number>(0);
  const [focusedChannelIndex, setFocusedChannelIndex] = useState<number>(0);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const categoryRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const logoutRef = useRef<HTMLButtonElement | null>(null);

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

  // Manter o índice focado em limites seguros
  useEffect(() => {
    if (focusedChannelIndex >= visibleItems.length && visibleItems.length > 0) {
      setFocusedChannelIndex(visibleItems.length - 1);
    }
  }, [visibleItems.length, focusedChannelIndex]);

  // Escuta teclas de setas do controle remoto / teclado
  useEffect(() => {
    if (loading || activeChannel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
        return;
      }
      e.preventDefault();

      if (focusSection === 'tabs') {
        if (e.key === 'ArrowRight') {
          setFocusedTabIndex(prev => (prev + 1) % 3);
        } else if (e.key === 'ArrowLeft') {
          setFocusedTabIndex(prev => (prev - 1 + 3) % 3);
        } else if (e.key === 'ArrowDown') {
          if (activeTab === 'adult') {
            setFocusSection('categories');
            setFocusedCategoryIndex(0);
          } else {
            setFocusSection('channels');
            setFocusedChannelIndex(0);
          }
        } else if (e.key === 'Enter') {
          if (focusedTabIndex === 0) {
            setActiveTab('normal');
            setFocusSection('channels');
            setFocusedChannelIndex(0);
          } else if (focusedTabIndex === 1) {
            setActiveTab('adult');
            setFocusSection('categories');
            setFocusedCategoryIndex(0);
          } else if (focusedTabIndex === 2) {
            handleLogout();
          }
        }
      } else if (focusSection === 'categories') {
        if (e.key === 'ArrowRight') {
          setFocusedCategoryIndex(prev => (prev + 1) % ADULT_CATEGORIES.length);
        } else if (e.key === 'ArrowLeft') {
          setFocusedCategoryIndex(prev => (prev - 1 + ADULT_CATEGORIES.length) % ADULT_CATEGORIES.length);
        } else if (e.key === 'ArrowDown') {
          setFocusSection('channels');
          setFocusedChannelIndex(0);
        } else if (e.key === 'ArrowUp') {
          setFocusSection('tabs');
          setFocusedTabIndex(1);
        } else if (e.key === 'Enter') {
          const cat = ADULT_CATEGORIES[focusedCategoryIndex];
          setSearchQuery(cat.tag);
          fetchXVideos(cat.tag);
        }
      } else if (focusSection === 'channels') {
        if (visibleItems.length === 0) {
          if (e.key === 'ArrowUp') {
            if (activeTab === 'adult') {
              setFocusSection('categories');
              setFocusedCategoryIndex(0);
            } else {
              setFocusSection('tabs');
              setFocusedTabIndex(0);
            }
          }
          return;
        }

        if (e.key === 'ArrowRight') {
          setFocusedChannelIndex(prev => (prev + 1) % visibleItems.length);
        } else if (e.key === 'ArrowLeft') {
          setFocusedChannelIndex(prev => (prev - 1 + visibleItems.length) % visibleItems.length);
        } else if (e.key === 'ArrowDown') {
          setFocusedChannelIndex(prev => (prev + 4) % visibleItems.length);
        } else if (e.key === 'ArrowUp') {
          if (focusedChannelIndex < 4) {
            if (activeTab === 'adult') {
              setFocusSection('categories');
              setFocusedCategoryIndex(0);
            } else {
              setFocusSection('tabs');
              setFocusedTabIndex(0);
            }
          } else {
            setFocusedChannelIndex(prev => prev - 4);
          }
        } else if (e.key === 'Enter') {
          setActiveChannel(visibleItems[focusedChannelIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, visibleItems, focusSection, focusedTabIndex, focusedCategoryIndex, focusedChannelIndex, activeTab, activeChannel]);

  // Rolar para o elemento focado para manter a visibilidade na TV
  useEffect(() => {
    if (focusSection === 'channels' && focusedChannelIndex >= 0 && cardRefs.current[focusedChannelIndex]) {
      cardRefs.current[focusedChannelIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    } else if (focusSection === 'categories' && focusedCategoryIndex >= 0 && categoryRefs.current[focusedCategoryIndex]) {
      categoryRefs.current[focusedCategoryIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, [focusSection, focusedChannelIndex, focusedCategoryIndex]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'NEWS': return <Radio className="w-5 h-5 text-blue-400" />;
      case 'MOVIES': return <MonitorPlay className="w-5 h-5 text-indigo-400" />;
      case 'ADULT_CONTENT': return <Flame className="w-5 h-5 text-rose-500" />;
      case 'LIVE_CAMS': return <Heart className="w-5 h-5 text-pink-400" />;
      case 'PODCASTS': return <Trophy className="w-5 h-5 text-amber-500" />;
      default: return <Tv className="w-5 h-5 text-stone-400" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'NEWS': return 'Notícias';
      case 'MOVIES': return 'Filmes & Séries FAST';
      case 'ADULT_CONTENT': return 'Canais Adultos';
      case 'LIVE_CAMS': return 'Webcams ao Vivo';
      case 'PODCASTS': return 'Esportes & Variedades';
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
              ref={el => tabRefs.current[0] = el}
              onClick={() => {
                setActiveTab('normal');
                setFocusSection('tabs');
                setFocusedTabIndex(0);
              }}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs transition-all focus:outline-none ${
                activeTab === 'normal'
                  ? 'bg-primary text-white shadow shadow-primary/25'
                  : 'text-stone-400 hover:text-white'
              } ${focusSection === 'tabs' && focusedTabIndex === 0 ? 'tv-active-focus' : ''}`}
            >
              <Tv className="w-4 h-4" />
              <span>Canais & Filmes</span>
            </button>
            <button
              ref={el => tabRefs.current[1] = el}
              onClick={() => {
                setActiveTab('adult');
                setFocusSection('tabs');
                setFocusedTabIndex(1);
              }}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs transition-all focus:outline-none ${
                activeTab === 'adult'
                  ? 'bg-rose-600 text-white shadow shadow-rose-600/25'
                  : 'text-stone-400 hover:text-rose-450'
              } ${focusSection === 'tabs' && focusedTabIndex === 1 ? 'tv-active-focus' : ''}`}
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
            ref={logoutRef}
            onClick={handleLogout}
            className={`flex items-center gap-2 hover:bg-stone-900 text-stone-400 hover:text-white p-2.5 rounded-xl border border-transparent hover:border-stone-850 transition-all focus:outline-none ${
              focusSection === 'tabs' && focusedTabIndex === 2 ? 'tv-active-focus' : ''
            }`}
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

        {/* XVideos Categories for Adult Tab */}
        {!loading && !error && activeTab === 'adult' && (
          <div className="mb-10 w-full flex flex-col gap-4">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-widest text-center">Navegar por Categorias</span>
            <div className="flex flex-wrap gap-2.5 justify-center max-w-4xl mx-auto">
              {ADULT_CATEGORIES.map((pill, idx) => {
                const isSelected = searchQuery === pill.tag;
                const isFocused = focusSection === 'categories' && focusedCategoryIndex === idx;

                return (
                  <button
                    key={pill.label}
                    ref={el => categoryRefs.current[idx] = el}
                    onClick={() => {
                      setSearchQuery(pill.tag);
                      fetchXVideos(pill.tag);
                      setFocusSection('categories');
                      setFocusedCategoryIndex(idx);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/25'
                        : 'bg-stone-900/60 text-stone-400 border-stone-850 hover:text-white hover:border-stone-750'
                    } ${isFocused ? 'tv-active-focus' : ''}`}
                  >
                    {pill.label}
                  </button>
                );
              })}
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
                const isFocused = focusSection === 'channels' && absoluteIndex === focusedChannelIndex;

                return (
                  <div
                    key={channel.id}
                    ref={el => cardRefs.current[absoluteIndex] = el}
                    onClick={() => {
                      setActiveChannel(channel);
                      setFocusSection('channels');
                      setFocusedChannelIndex(absoluteIndex);
                    }}
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
                {searchQuery ? `Vídeos de "${searchQuery}"` : 'Vídeos em Destaque'}
              </h2>
            </div>

            {searchLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-stone-500 text-xs">Carregando catálogo de vídeos...</p>
              </div>
            )}

            {searchError && !searchLoading && (
              <p className="text-red-400 text-sm text-center py-6">{searchError}</p>
            )}

            {!searchLoading && !searchError && dynamicVideos.length === 0 && (
              <p className="text-stone-500 text-sm text-center py-6">Nenhum vídeo encontrado para esta categoria.</p>
            )}

            {!searchLoading && !searchError && dynamicVideos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {dynamicVideos.map(video => {
                  const absoluteIndex = visibleItems.findIndex(c => c.id === video.id);
                  const isFocused = focusSection === 'channels' && absoluteIndex === focusedChannelIndex;

                  return (
                    <div
                      key={video.id}
                      ref={el => cardRefs.current[absoluteIndex] = el}
                      onClick={() => {
                        setActiveChannel(video);
                        setFocusSection('channels');
                        setFocusedChannelIndex(absoluteIndex);
                      }}
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
                          Premium
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

