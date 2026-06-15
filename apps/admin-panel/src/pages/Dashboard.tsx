import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, UserInfo } from '../utils/api.js';
import { 
  LogOut, Users, Activity, Plus, Edit2, Trash2, CheckCircle2, XCircle, 
  Settings, AlertCircle, Save, X, KeyRound, RefreshCw
} from 'lucide-react';

interface Channel {
  id: string;
  title: string;
  category: 'NEWS' | 'MOVIES' | 'ADULT_CONTENT' | 'LIVE_CAMS' | 'PODCASTS';
  sourceType: 'YOUTUBE_LIVE' | 'M3U8_FAST' | 'SCRAPER_XVIDEOS' | 'IFRAME_CAM_AFFILIATE';
  externalId: string;
  thumbnailUrl: string;
  isActive: boolean;
  orderPriority: number;
}

interface ActiveSession {
  id: string;
  deviceType: string;
  lastActivity: string;
  ipAddress: string | null;
  user?: {
    email: string;
    role: string;
  } | null;
  activationCode?: {
    code: string;
    clientName: string;
  } | null;
}

interface UserListItem {
  id: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  subscription?: {
    planType: string;
    expiresAt: string | null;
  } | null;
}

interface ActivationCode {
  id: string;
  code: string;
  clientName: string;
  maxDevices: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    sessions: number;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState<UserInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'catalog' | 'users' | 'codes'>('metrics');
  
  // States de Dados
  const [metrics, setMetrics] = useState<{ totalUsers: number, totalCodes: number, activeSessionsCount: number } | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // States do Form/Modal de Canais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'NEWS' | 'MOVIES' | 'ADULT_CONTENT' | 'LIVE_CAMS' | 'PODCASTS'>('NEWS');
  const [formSourceType, setFormSourceType] = useState<'YOUTUBE_LIVE' | 'M3U8_FAST' | 'SCRAPER_XVIDEOS' | 'IFRAME_CAM_AFFILIATE'>('YOUTUBE_LIVE');
  const [formExternalId, setFormExternalId] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formOrderPriority, setFormOrderPriority] = useState(0);

  // States do Form/Modal de Códigos
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<ActivationCode | null>(null);
  const [codeClientName, setCodeClientName] = useState('');
  const [codeMaxDevices, setCodeMaxDevices] = useState(10);
  const [codeExpiresAt, setCodeExpiresAt] = useState('');
  const [codeCustomCode, setCodeCustomCode] = useState('');

  useEffect(() => {
    const user = apiClient.getUser();
    if (!user || user.role !== 'ADMIN') {
      navigate('/login');
      return;
    }
    setAdminUser(user);
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [metricsData, usersData, channelsData, codesData] = await Promise.all([
        apiClient.request('/admin/metrics'),
        apiClient.request('/admin/users'),
        apiClient.request('/admin/channels'),
        apiClient.request('/admin/codes')
      ]);

      setMetrics({
        totalUsers: metricsData.totalUsers,
        totalCodes: metricsData.totalCodes || 0,
        activeSessionsCount: metricsData.activeSessionsCount
      });
      setSessions(metricsData.activeSessions || []);
      setUsers(usersData || []);
      setChannels(channelsData || []);
      setCodes(codesData || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar APIs do backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiClient.clearAuth();
    navigate('/login');
  };

  // Alternar Status do Usuário
  const toggleUserStatus = async (userId: string, currentStatus: 'ACTIVE' | 'SUSPENDED') => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiClient.request(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      if (newStatus === 'SUSPENDED') {
        setSessions(prev => prev.filter(s => s.user?.email !== users.find(u => u.id === userId)?.email));
      }
    } catch (err: any) {
      alert(`Erro ao alterar status: ${err.message}`);
    }
  };

  // Alternar Status do Canal
  const toggleChannelActive = async (channel: Channel) => {
    const nextActive = !channel.isActive;
    try {
      await apiClient.request(`/admin/channels/${channel.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...channel,
          isActive: nextActive
        })
      });
      setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, isActive: nextActive } : c));
    } catch (err: any) {
      alert(`Erro ao atualizar canal: ${err.message}`);
    }
  };

  // Excluir Canal
  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Deseja realmente remover este canal permanentemente?')) return;
    try {
      await apiClient.request(`/admin/channels/${channelId}`, {
        method: 'DELETE'
      });
      setChannels(prev => prev.filter(c => c.id !== channelId));
    } catch (err: any) {
      alert(`Erro ao deletar canal: ${err.message}`);
    }
  };

  // Abrir Modal de Canais
  const openChannelModal = (channel: Channel | null = null) => {
    if (channel) {
      setEditingChannel(channel);
      setFormTitle(channel.title);
      setFormCategory(channel.category);
      setFormSourceType(channel.sourceType);
      setFormExternalId(channel.externalId);
      setFormThumbnailUrl(channel.thumbnailUrl);
      setFormIsActive(channel.isActive);
      setFormOrderPriority(channel.orderPriority);
    } else {
      setEditingChannel(null);
      setFormTitle('');
      setFormCategory('NEWS');
      setFormSourceType('YOUTUBE_LIVE');
      setFormExternalId('');
      setFormThumbnailUrl('');
      setFormIsActive(true);
      setFormOrderPriority(0);
    }
    setIsModalOpen(true);
  };

  // Salvar Canal
  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formTitle,
      category: formCategory,
      sourceType: formSourceType,
      externalId: formExternalId,
      thumbnailUrl: formThumbnailUrl,
      isActive: formIsActive,
      orderPriority: Number(formOrderPriority)
    };

    try {
      if (editingChannel) {
        const updated = await apiClient.request(`/admin/channels/${editingChannel.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setChannels(prev => prev.map(c => c.id === editingChannel.id ? updated : c));
      } else {
        const created = await apiClient.request('/admin/channels', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setChannels(prev => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Erro ao salvar canal: ${err.message}`);
    }
  };

  // CRUD CÓDIGOS DE ATIVAÇÃO

  const openCodeModal = (codeItem: ActivationCode | null = null) => {
    if (codeItem) {
      setEditingCode(codeItem);
      setCodeClientName(codeItem.clientName);
      setCodeMaxDevices(codeItem.maxDevices);
      setCodeExpiresAt(new Date(codeItem.expiresAt).toISOString().split('T')[0]);
      setCodeCustomCode(codeItem.code);
    } else {
      setEditingCode(null);
      setCodeClientName('');
      setCodeMaxDevices(10);
      // Data padrão de expiração: 30 dias a partir de hoje
      const future = new Date();
      future.setDate(future.getDate() + 30);
      setCodeExpiresAt(future.toISOString().split('T')[0]);
      setCodeCustomCode('');
    }
    setIsCodeModalOpen(true);
  };

  const handleGenerateRandomCode = () => {
    const randomVal = Math.floor(100000 + Math.random() * 900000).toString();
    setCodeCustomCode(randomVal);
  };

  const handleSaveCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      clientName: codeClientName,
      maxDevices: Number(codeMaxDevices),
      expiresAt: new Date(codeExpiresAt).toISOString(),
      code: codeCustomCode || undefined
    };

    try {
      if (editingCode) {
        const updated = await apiClient.request(`/admin/codes/${editingCode.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setCodes(prev => prev.map(c => c.id === editingCode.id ? { ...updated, _count: editingCode._count } : c));
      } else {
        const created = await apiClient.request('/admin/codes', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setCodes(prev => [{ ...created, _count: { sessions: 0 } }, ...prev]);
      }
      setIsCodeModalOpen(false);
      loadData(); // Recarregar contagens
    } catch (err: any) {
      alert(`Erro ao salvar código de ativação: ${err.message}`);
    }
  };

  const toggleCodeActiveStatus = async (codeItem: ActivationCode) => {
    const nextActive = !codeItem.isActive;
    try {
      await apiClient.request(`/admin/codes/${codeItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: nextActive })
      });
      setCodes(prev => prev.map(c => c.id === codeItem.id ? { ...c, isActive: nextActive } : c));
      if (!nextActive) {
        // Remover sessões da lista se o código foi suspenso
        setSessions(prev => prev.filter(s => s.activationCode?.code !== codeItem.code));
      }
    } catch (err: any) {
      alert(`Erro ao alterar status: ${err.message}`);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('Deseja realmente remover este código? Todos os dispositivos ativos dele perderão o acesso.')) return;
    try {
      await apiClient.request(`/admin/codes/${codeId}`, {
        method: 'DELETE'
      });
      setCodes(prev => prev.filter(c => c.id !== codeId));
      loadData();
    } catch (err: any) {
      alert(`Erro ao excluir código: ${err.message}`);
    }
  };

  const handleClearSessions = async (codeItem: ActivationCode) => {
    if (!confirm(`Deseja limpar todos os dispositivos conectados do código ${codeItem.code}?`)) return;
    try {
      await apiClient.request(`/admin/codes/${codeItem.id}/clear`, {
        method: 'POST'
      });
      alert('Todos os dispositivos vinculados foram desconectados.');
      loadData();
    } catch (err: any) {
      alert(`Erro ao limpar dispositivos: ${err.message}`);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'YOUTUBE_LIVE': return <span className="bg-red-900/40 text-red-400 border border-red-800/30 px-2.5 py-1 rounded-lg text-xs font-semibold">YouTube Live</span>;
      case 'M3U8_FAST': return <span className="bg-indigo-900/40 text-indigo-400 border border-indigo-800/30 px-2.5 py-1 rounded-lg text-xs font-semibold">FAST (m3u8)</span>;
      case 'SCRAPER_XVIDEOS': return <span className="bg-amber-900/40 text-amber-400 border border-amber-800/30 px-2.5 py-1 rounded-lg text-xs font-semibold">Scraper XVideos</span>;
      case 'IFRAME_CAM_AFFILIATE': return <span className="bg-pink-900/40 text-pink-400 border border-pink-800/30 px-2.5 py-1 rounded-lg text-xs font-semibold">Iframe Cams</span>;
      default: return <span className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded text-xs">{type}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-155 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-card border-b border-stone-850 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Painel Administrativo <span className="text-xs bg-stone-850 text-stone-400 px-2 py-1 rounded border border-stone-800">B2C</span>
            </h1>
            <p className="text-xs text-stone-450 mt-0.5">Gestão geral de métricas, grade e códigos do sistema</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right text-xs">
            <span className="text-stone-500 font-semibold uppercase">Logado como</span>
            <span className="text-stone-300 font-medium">{adminUser?.email}</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 hover:bg-stone-850 text-stone-450 hover:text-white p-2.5 rounded-xl border border-stone-800 transition-all focus:outline-none"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-semibold">Desconectar</span>
          </button>
        </div>
      </header>

      {/* Tabs Layout */}
      <div className="border-b border-stone-850 bg-stone-950 px-6">
        <nav className="flex gap-6 max-w-7xl mx-auto">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`py-4 text-sm font-semibold border-b-2 transition-all focus:outline-none ${
              activeTab === 'metrics' ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-250'
            }`}
          >
            Métricas & Sessões
          </button>
          <button
            onClick={() => setActiveTab('codes')}
            className={`py-4 text-sm font-semibold border-b-2 transition-all focus:outline-none ${
              activeTab === 'codes' ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-250'
            }`}
          >
            Códigos de Ativação
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-4 text-sm font-semibold border-b-2 transition-all focus:outline-none ${
              activeTab === 'catalog' ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-250'
            }`}
          >
            Gerenciamento do Catálogo
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 text-sm font-semibold border-b-2 transition-all focus:outline-none ${
              activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-250'
            }`}
          >
            Administradores
          </button>
        </nav>
      </div>

      {/* Main Panel Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-stone-450 text-sm">Consultando banco de dados...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl flex items-center gap-3 text-red-200 mb-6">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* VIEW 1: METRICS */}
            {activeTab === 'metrics' && (
              <div className="space-y-8">
                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-card border border-stone-850 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                      <h3 className="text-stone-400 font-semibold text-xs uppercase tracking-wider mb-1">Códigos de Ativação</h3>
                      <p className="text-4xl font-extrabold text-white">{metrics?.totalCodes}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <KeyRound className="w-6 h-6 text-primary" />
                    </div>
                  </div>

                  <div className="bg-card border border-stone-850 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                      <h3 className="text-stone-400 font-semibold text-xs uppercase tracking-wider mb-1">Sessões Ativas (Online)</h3>
                      <p className="text-4xl font-extrabold text-white">{metrics?.activeSessionsCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-card border border-stone-850 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                      <h3 className="text-stone-400 font-semibold text-xs uppercase tracking-wider mb-1">Contas Admins</h3>
                      <p className="text-4xl font-extrabold text-white">{metrics?.totalUsers}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-indigo-400" />
                    </div>
                  </div>
                </div>

                {/* Active Sessions Grid */}
                <div className="bg-card border border-stone-850 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-stone-850 flex items-center justify-between bg-stone-900/30">
                    <h3 className="font-bold text-white text-base">Quem está assistindo agora</h3>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="p-8 text-center text-stone-500">
                      Nenhuma sessão ativa encontrada no momento.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-stone-950 text-stone-400 font-semibold border-b border-stone-850">
                          <tr>
                            <th className="px-6 py-3.5">Identificador / Cliente</th>
                            <th className="px-6 py-3.5">Dispositivo</th>
                            <th className="px-6 py-3.5">Endereço IP</th>
                            <th className="px-6 py-3.5">Última Atividade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-850">
                          {sessions.map(sess => (
                            <tr key={sess.id} className="hover:bg-stone-900/20 text-stone-300">
                              <td className="px-6 py-4 font-medium text-white">
                                {sess.user ? (
                                  <span className="text-indigo-400">[Admin] {sess.user?.email}</span>
                                ) : (
                                  <span>[Código: {sess.activationCode?.code}] {sess.activationCode?.clientName}</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className="bg-stone-850 border border-stone-800 text-stone-300 text-xs px-2.5 py-1 rounded-lg">
                                  {sess.deviceType}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-stone-400">{sess.ipAddress || 'Não fornecido'}</td>
                              <td className="px-6 py-4">{new Date(sess.lastActivity).toLocaleTimeString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: ACTIVATION CODES */}
            {activeTab === 'codes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-wide">Códigos de Ativação</h2>
                    <p className="text-xs text-stone-450 mt-0.5">Gerencie os acessos temporários ou mensais dos clientes e seus limites de dispositivos</p>
                  </div>
                  <button
                    onClick={() => openCodeModal(null)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all focus:outline-none"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Código</span>
                  </button>
                </div>

                <div className="bg-card border border-stone-850 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-stone-950 text-stone-400 font-semibold border-b border-stone-850">
                        <tr>
                          <th className="px-6 py-3.5">Código</th>
                          <th className="px-6 py-3.5">Cliente</th>
                          <th className="px-6 py-3.5">Dispositivos Ativos</th>
                          <th className="px-6 py-3.5">Vencimento</th>
                          <th className="px-6 py-3.5">Status</th>
                          <th className="px-6 py-3.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-850">
                        {codes.map(c => {
                          const isExpired = new Date(c.expiresAt) < new Date();
                          return (
                            <tr key={c.id} className="hover:bg-stone-900/20 text-stone-300">
                              <td className="px-6 py-4 font-mono text-lg font-bold text-primary">{c.code}</td>
                              <td className="px-6 py-4 font-medium text-white">{c.clientName}</td>
                              <td className="px-6 py-4">
                                <span className="bg-stone-850 px-2 py-1 border border-stone-800 rounded-lg text-xs font-semibold">
                                  {c._count.sessions} / {c.maxDevices}
                                </span>
                              </td>
                              <td className={`px-6 py-4 ${isExpired ? 'text-red-400 font-semibold' : 'text-stone-400'}`}>
                                {new Date(c.expiresAt).toLocaleDateString()} {isExpired && '(Expirado)'}
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => toggleCodeActiveStatus(c)}
                                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    c.isActive && !isExpired ? 'bg-green-950/30 text-green-400' : 'bg-red-950/30 text-red-400'
                                  }`}
                                >
                                  {c.isActive && !isExpired ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                  {c.isActive && !isExpired ? 'Ativo' : 'Inativo'}
                                </button>
                              </td>
                              <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleClearSessions(c)}
                                  title="Desconectar todos os dispositivos"
                                  className="text-stone-400 hover:text-yellow-400 p-2 rounded-lg border border-transparent hover:border-stone-800 transition-all focus:outline-none"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openCodeModal(c)}
                                  className="text-stone-400 hover:text-white p-2 rounded-lg border border-transparent hover:border-stone-800 transition-all focus:outline-none"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCode(c.id)}
                                  className="text-stone-400 hover:text-red-500 p-2 rounded-lg border border-transparent hover:border-stone-800 transition-all focus:outline-none"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: USERS */}
            {activeTab === 'users' && (
              <div className="bg-card border border-stone-850 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-850 flex justify-between bg-stone-900/30">
                  <h3 className="font-bold text-white text-base">Administradores do Sistema</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-stone-950 text-stone-400 font-semibold border-b border-stone-850">
                      <tr>
                        <th className="px-6 py-3.5">Usuário</th>
                        <th className="px-6 py-3.5">Função</th>
                        <th className="px-6 py-3.5">Data de Criação</th>
                        <th className="px-6 py-3.5">Status da Conta</th>
                        <th className="px-6 py-3.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-850">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-stone-900/20 text-stone-300">
                          <td className="px-6 py-4 flex flex-col">
                            <span className="font-medium text-white">{u.email}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-stone-850 border border-stone-800 text-stone-300 text-xs px-2.5 py-1 rounded-lg">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-stone-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              u.status === 'ACTIVE' ? 'bg-green-950/30 text-green-400' : 'bg-red-950/30 text-red-400'
                            }`}>
                              {u.status === 'ACTIVE' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {u.status === 'ACTIVE' ? 'Ativa' : 'Suspensa'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {u.role !== 'ADMIN' && (
                              <button
                                onClick={() => toggleUserStatus(u.id, u.status)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                                  u.status === 'ACTIVE' 
                                    ? 'bg-red-950/20 hover:bg-red-900/20 text-red-400 border-red-900/50' 
                                    : 'bg-green-950/20 hover:bg-green-900/20 text-green-400 border-green-900/50'
                                }`}
                              >
                                {u.status === 'ACTIVE' ? 'Suspender Conta' : 'Ativar Conta'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 4: CATALOG CRUD */}
            {activeTab === 'catalog' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-wide">Catálogo de Grade de Vídeo</h2>
                    <p className="text-xs text-stone-450 mt-0.5">Adicione ou ative/desative feeds de vídeo e robôs de scraping</p>
                  </div>
                  <button
                    onClick={() => openChannelModal(null)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all focus:outline-none"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar Canal</span>
                  </button>
                </div>

                <div className="bg-card border border-stone-850 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-stone-950 text-stone-400 font-semibold border-b border-stone-850">
                        <tr>
                          <th className="px-6 py-3.5">Canal</th>
                          <th className="px-6 py-3.5">Categoria</th>
                          <th className="px-6 py-3.5">Origem da Mídia</th>
                          <th className="px-6 py-3.5">Ordenação</th>
                          <th className="px-6 py-3.5">Status</th>
                          <th className="px-6 py-3.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-850">
                        {channels.map(channel => (
                          <tr key={channel.id} className="hover:bg-stone-900/20 text-stone-300">
                            <td className="px-6 py-4 flex items-center gap-3">
                              <img
                                src={channel.thumbnailUrl}
                                alt={channel.title}
                                className="w-12 h-8 object-cover rounded-lg border border-stone-800"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400';
                                }}
                              />
                              <span className="font-medium text-white">{channel.title}</span>
                            </td>
                            <td className="px-6 py-4 font-semibold text-stone-400">{channel.category}</td>
                            <td className="px-6 py-4">{getSourceIcon(channel.sourceType)}</td>
                            <td className="px-6 py-4 text-stone-450 font-mono">{channel.orderPriority}</td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => toggleChannelActive(channel)}
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  channel.isActive ? 'bg-green-950/30 text-green-400' : 'bg-red-950/30 text-red-400'
                                }`}
                              >
                                {channel.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                {channel.isActive ? 'Ativo' : 'Inativo'}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                              <button
                                onClick={() => openChannelModal(channel)}
                                className="text-stone-400 hover:text-white p-2 rounded-lg border border-transparent hover:border-stone-800 transition-all focus:outline-none"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteChannel(channel.id)}
                                className="text-stone-400 hover:text-red-500 p-2 rounded-lg border border-transparent hover:border-stone-800 transition-all focus:outline-none"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL CANAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-stone-850 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-850 flex items-center justify-between bg-stone-900/30">
              <h3 className="font-bold text-white text-base">
                {editingChannel ? 'Editar Canal do Catálogo' : 'Adicionar Novo Canal'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-500 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChannel} className="p-6 space-y-4">
              <div>
                <label className="block text-stone-300 text-xs font-semibold uppercase mb-1.5">Título do Canal / Vídeo</label>
                <input
                  type="text"
                  required
                  className="w-full bg-stone-950 border border-stone-850 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-stone-200 placeholder-stone-600 focus:outline-none"
                  placeholder="Ex: CNN Brasil Ao Vivo, Vídeo Amador, etc."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-300 text-xs font-semibold uppercase mb-1.5">Categoria</label>
                  <select
                    className="w-full bg-stone-950 border border-stone-850 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-stone-200 focus:outline-none"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                  >
                    <option value="NEWS">Notícias</option>
                    <option value="MOVIES">Filmes & Canais FAST</option>
                    <option value="ADULT_CONTENT">Conteúdo Adulto</option>
                    <option value="LIVE_CAMS">Câmeras Ao Vivo</option>
                    <option value="PODCASTS">Podcasts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 text-xs font-semibold uppercase mb-1.5">Tipo de Fonte de Mídia</label>
                  <select
                    className="w-full bg-stone-950 border border-stone-850 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-stone-200 focus:outline-none"
                    value={formSourceType}
                    onChange={(e) => setFormSourceType(e.target.value as any)}
                  >
                    <option value="YOUTUBE_LIVE">YouTube Live (Embed)</option>
                    <option value="M3U8_FAST">Link Direto (FAST HLS .m3u8)</option>
                    <option value="SCRAPER_XVIDEOS">Scraper XVideos (Em tempo real)</option>
                    <option value="IFRAME_CAM_AFFILIATE">Iframe Afiliado de Cams</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-300 text-xs font-semibold uppercase mb-1.5">
                  ID Externo ou URL de Transmissão
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-stone-950 border border-stone-850 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-stone-250 placeholder-stone-600 focus:outline-none font-mono"
                  placeholder={
                    formSourceType === 'YOUTUBE_LIVE' ? 'ID do Vídeo (ex: uf8n4zM8Rpw)' :
                    formSourceType === 'SCRAPER_XVIDEOS' ? 'Slug do Vídeo (ex: video.ubd/mulher_gostosa)' :
                    'URL completa (.mp4, .m3u8 ou Iframe)'
                  }
                  value={formExternalId}
                  onChange={(e) => setFormExternalId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-stone-300 text-xs font-semibold uppercase mb-1.5">URL da Thumbnail (Miniatura)</label>
                <input
                  type="text"
                  required
                  className="w-full bg-stone-950 border border-stone-850 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-stone-200 placeholder-stone-600 focus:outline-none"
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={formThumbnailUrl}
                  onChange={(e) => setFormThumbnailUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-300 text-xs font-semibold uppercase mb-1.5">Prioridade de Ordenação</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-stone-950 border border-stone-850 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-stone-200 focus:outline-none"
                    value={formOrderPriority}
                    onChange={(e) => setFormOrderPriority(Number(e.target.value))}
                  />
                </div>

                <div className="flex items-center gap-3 pl-2 h-full pt-6">
                  <input
                    type="checkbox"
                    id="formIsActive"
                    className="w-5 h-5 rounded accent-primary bg-stone-950 border border-stone-800"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <label htmlFor="formIsActive" className="text-stone-300 text-sm font-semibold uppercase select-none cursor-pointer">
                    Canal Ativo
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-stone-850">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-stone-850 hover:bg-stone-800 text-stone-300 font-bold py-3.5 rounded-xl border border-stone-800 transition-all text-center focus:outline-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 focus:outline-none"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Canal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CÓDIGO DE ATIVAÇÃO */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-stone-850 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-850 flex items-center justify-between bg-stone-900/30">
              <h3 className="font-bold text-white text-base">
                {editingCode ? 'Editar Código de Ativação' : 'Criar Código de Ativação'}
              </h3>
              <button onClick={() => setIsCodeModalOpen(false)} className="text-stone-500 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCode} className="p-6 space-y-4">
              <div>
                <label className="block text-stone-300 text-xs font-semibold uppercase mb-1.5">Código (6 Números)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    className="flex-1 bg-stone-950 border border-stone-850 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-stone-200 placeholder-stone-600 focus:outline-none font-mono"
                    placeholder="Ex: 794613"
                    value={codeCustomCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCodeCustomCode(val);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateRandomCode}
                    className="bg-stone-850 hover:bg-stone-850 border border-stone-800 text-stone-300 font-bold px-4 rounded-xl transition-all focus:outline-none text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Gerar</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-stone-300 text-xs font-semibold uppercase mb-1.5">Nome do Cliente</label>
                <input
                  type="text"
                  required
                  className="w-full bg-stone-950 border border-stone-850 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-stone-200 placeholder-stone-600 focus:outline-none"
                  placeholder="Ex: Carlos (Dono do Motel Soft)"
                  value={codeClientName}
                  onChange={(e) => setCodeClientName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-stone-300 text-xs font-semibold uppercase mb-1.5">Limite de Dispositivos</label>
                <select
                  className="w-full bg-stone-950 border border-stone-850 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-stone-200 focus:outline-none"
                  value={codeMaxDevices}
                  onChange={(e) => setCodeMaxDevices(Number(e.target.value))}
                >
                  <option value={1}>1 Dispositivo (Teste)</option>
                  <option value={10}>10 Dispositivos</option>
                  <option value={20}>20 Dispositivos</option>
                  <option value={50}>50 Dispositivos</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-300 text-xs font-semibold uppercase mb-1.5">Data de Vencimento</label>
                <input
                  type="date"
                  required
                  className="w-full bg-stone-950 border border-stone-850 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-stone-200 focus:outline-none"
                  value={codeExpiresAt}
                  onChange={(e) => setCodeExpiresAt(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-stone-850">
                <button
                  type="button"
                  onClick={() => setIsCodeModalOpen(false)}
                  className="flex-1 bg-stone-850 hover:bg-stone-800 text-stone-300 font-bold py-3.5 rounded-xl border border-stone-800 transition-all text-center focus:outline-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={codeCustomCode.length < 6}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 focus:outline-none disabled:opacity-40"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Código</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
