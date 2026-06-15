import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../utils/api.js';
import { ShieldAlert, KeyRound, Mail, AlertTriangle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (apiClient.getToken()) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginData = await apiClient.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, deviceType: 'WEB_DESKTOP' }),
      });

      if (loginData.user.role !== 'ADMIN') {
        throw new Error('Acesso negado. Apenas administradores podem entrar neste painel.');
      }

      apiClient.setAuth(loginData.token, loginData.refreshToken, loginData.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-stone-900 via-background to-black p-4 relative overflow-hidden text-gray-100">
      
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-stone-900/60 backdrop-blur-xl border border-stone-850 p-8 rounded-2xl shadow-2xl relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-primary to-indigo-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-3">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-stone-200 to-indigo-300">
            Painel Admin
          </h1>
          <p className="text-stone-400 text-sm mt-1 text-center font-medium">
            Gerenciamento do Catálogo e Sessões TV Motel
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
            <label className="block text-stone-300 text-xs font-semibold mb-2 uppercase tracking-wider">E-mail Administrativo</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-stone-550" />
              <input
                type="email"
                required
                className="w-full bg-stone-950 border border-stone-850 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-12 pr-4 text-stone-100 placeholder-stone-600 focus:outline-none transition-all"
                placeholder="admin@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-300 text-xs font-semibold mb-2 uppercase tracking-wider">Senha</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-stone-555" />
              <input
                type="password"
                required
                className="w-full bg-stone-950 border border-stone-850 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-12 pr-4 text-stone-100 placeholder-stone-600 focus:outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all focus:outline-none disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Acessar Painel de Controle'}
          </button>
        </form>
      </div>
    </div>
  );
}
