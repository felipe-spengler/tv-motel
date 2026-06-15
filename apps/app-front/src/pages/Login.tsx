import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../utils/api.js';
import { Tv, KeyRound, Mail, AlertTriangle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceType, setDeviceType] = useState<'WEB_MOBILE' | 'WEB_DESKTOP' | 'ANDROID_TV'>('WEB_DESKTOP');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Tentar detectar se o dispositivo é mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      setDeviceType('WEB_MOBILE');
    }
    
    // Se o usuário já tiver logado, manda pro dashboard
    if (apiClient.getToken()) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await apiClient.request('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        // Fazer login automático depois de registrar
        const loginData = await apiClient.request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password, deviceType }),
        });
        apiClient.setAuth(loginData.token, loginData.refreshToken, loginData.user);
      } else {
        const loginData = await apiClient.request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password, deviceType }),
        });
        apiClient.setAuth(loginData.token, loginData.refreshToken, loginData.user);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-stone-900 via-background to-black p-4 relative overflow-hidden">
      
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-stone-900/60 backdrop-blur-xl border border-stone-800 p-8 rounded-2xl shadow-2xl relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-primary to-rose-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-3 animate-pulse">
            <Tv className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-stone-200 to-rose-400">
            TV Motel
          </h1>
          <p className="text-stone-400 text-sm mt-1 text-center">
            Seu hub agregador de entretenimento inteligente
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-950/40 border border-red-900/50 p-4 rounded-xl text-red-200 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-stone-300 text-xs font-semibold mb-2 uppercase tracking-wider">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-stone-500" />
              <input
                type="email"
                required
                className="w-full bg-stone-950 border border-stone-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-12 pr-4 text-stone-100 placeholder-stone-600 focus:outline-none transition-all"
                placeholder="nome@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-300 text-xs font-semibold mb-2 uppercase tracking-wider">Senha</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-stone-500" />
              <input
                type="password"
                required
                className="w-full bg-stone-950 border border-stone-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-12 pr-4 text-stone-100 placeholder-stone-600 focus:outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-stone-950 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => setDeviceType('WEB_DESKTOP')}
              className={`flex-1 text-center py-2 text-xs rounded-lg font-medium transition-all ${
                deviceType === 'WEB_DESKTOP' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setDeviceType('WEB_MOBILE')}
              className={`flex-1 text-center py-2 text-xs rounded-lg font-medium transition-all ${
                deviceType === 'WEB_MOBILE' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Celular
            </button>
            <button
              type="button"
              onClick={() => setDeviceType('ANDROID_TV')}
              className={`flex-1 text-center py-2 text-xs rounded-lg font-medium transition-all ${
                deviceType === 'ANDROID_TV' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Smart TV
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all focus:outline-none disabled:opacity-50"
          >
            {loading ? 'Processando...' : isRegister ? 'Cadastrar' : 'Entrar na Plataforma'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-stone-400 hover:text-white text-sm transition-all focus:outline-none"
          >
            {isRegister ? 'Já possui conta? Faça Login' : 'Ainda não tem conta? Crie uma grátis'}
          </button>
        </div>
      </div>
    </div>
  );
}
