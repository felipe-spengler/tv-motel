import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../utils/api.js';
import { Tv, ShieldAlert } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [deviceType, setDeviceType] = useState<'WEB_MOBILE' | 'WEB_DESKTOP' | 'ANDROID_TV' | 'FIRE_STICK'>('WEB_DESKTOP');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Autodetectar tipo de dispositivo
    const ua = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    const isFireStick = /AFTB|AFTN|AFTM|AFTS/i.test(ua);
    const isTV = /SmartTV|GoogleTV|AppleTV|HbbTV|Xiaomi|AndroidTV|WebOS|Tizen|NetCast|Opera TV/i.test(ua);

    if (isFireStick) {
      setDeviceType('FIRE_STICK');
    } else if (isTV) {
      setDeviceType('ANDROID_TV');
    } else if (isMobile) {
      setDeviceType('WEB_MOBILE');
    } else {
      setDeviceType('WEB_DESKTOP');
    }
    
    // Se o dispositivo já estiver ativado, manda para o dashboard
    if (apiClient.getToken()) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar formato (apenas 6 números)
    if (!/^\d{6}$/.test(code)) {
      setError('O código de ativação deve conter exatamente 6 números.');
      return;
    }

    setLoading(true);

    try {
      const data = await apiClient.request('/auth/activate', {
        method: 'POST',
        body: JSON.stringify({ code, deviceType }),
      });

      // Salvar autenticação (no token decodificado do JWT vêm os mesmos dados)
      apiClient.setAuth(data.token, data.refreshToken, {
        id: data.token, // Falso ID
        code: code,
        clientName: data.clientName,
        maxDevices: 10, // Default temporário
        plan: 'FREE', // Default temporário
      });

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha ao validar o código de ativação');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceLabel = () => {
    switch (deviceType) {
      case 'WEB_MOBILE': return 'Celular';
      case 'ANDROID_TV': return 'Smart TV';
      case 'FIRE_STICK': return 'Fire Stick TV';
      default: return 'Computador';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-stone-900 via-background to-black p-4 relative overflow-hidden">
      
      {/* Efeitos de luz ao fundo */}
      <div className="absolute top-[-10%] right-[-10%] w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-stone-900/60 backdrop-blur-xl border border-stone-800 p-8 rounded-2xl shadow-2xl relative text-center">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-primary to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4 animate-pulse">
            <Tv className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-stone-200 to-rose-400">
            Ativar Dispositivo
          </h1>
          <p className="text-stone-400 text-sm mt-2">
            Insira o código de 6 números para acessar o sistema no seu <span className="text-primary font-semibold">{getDeviceLabel()}</span>.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-950/40 border border-red-900/50 p-4 rounded-xl text-red-200 text-sm text-left">
            <ShieldAlert className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              className="w-full bg-stone-950 border border-stone-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-4 text-center text-4xl font-mono tracking-[0.75em] pl-[0.75em] text-stone-100 placeholder-stone-800 focus:outline-none transition-all"
              placeholder="000000"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setCode(val);
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full bg-primary hover:bg-primary-hover active:scale-98 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Ativando...' : 'Ativar Agora'}
          </button>
        </form>

        <div className="mt-8 text-xs text-stone-500">
          Dispositivo detectado como: <span className="text-stone-400 font-semibold">{deviceType}</span>
        </div>
      </div>
    </div>
  );
}
