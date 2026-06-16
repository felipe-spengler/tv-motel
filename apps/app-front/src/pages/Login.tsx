import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../utils/api.js';
import { Tv, ShieldAlert, Check, MessageSquare } from 'lucide-react';

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

      apiClient.setAuth(data.token, data.refreshToken, {
        id: data.token,
        code: code,
        clientName: data.clientName,
        maxDevices: 10,
        plan: 'FREE',
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

  const plans = [
    {
      name: 'Bronze (5 Telas)',
      devices: 5,
      price: 120,
      pricePerDevice: 24.0,
      popular: false,
      features: [
        '5 dispositivos simultâneos',
        'Canais FAST e Notícias',
        'Grade Adulta e Scrapers',
        'Suporte Smart TV / Celular'
      ]
    },
    {
      name: 'Prata (10 Telas)',
      devices: 10,
      price: 150,
      pricePerDevice: 15.0,
      popular: true, // Recomendado / Melhor custo-benefício inicial
      features: [
        '10 dispositivos simultâneos',
        'Economia de 37% por tela',
        'Painel de controle de conexões',
        'Canais FAST, Notícias e Adultos'
      ]
    },
    {
      name: 'Ouro (20 Telas)',
      devices: 20,
      price: 250,
      pricePerDevice: 12.5,
      popular: false,
      features: [
        '20 dispositivos simultâneos',
        'Economia de 47% por tela',
        'Painel de controle de conexões',
        'Suporte Técnico Prioritário',
        'Liberação imediata de acessos'
      ]
    },
    {
      name: 'Diamond (35 Telas)',
      devices: 35,
      price: 350,
      pricePerDevice: 10.0,
      popular: false,
      features: [
        '35 dispositivos simultâneos',
        'Apenas R$ 10 por dispositivo!',
        'Painel de controle de conexões',
        'Suporte Técnico Prioritário',
        'Servidor VIP (Máxima performance)'
      ]
    }
  ];

  const handleContract = (plan: typeof plans[0]) => {
    const message = encodeURIComponent(`Olá! Desejo contratar o plano de ${plan.devices} dispositivos por R$ ${plan.price},00/mês.`);
    window.open(`https://api.whatsapp.com/send?phone=5549999459490&text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-stone-900 via-background to-black text-gray-100 flex flex-col p-4 md:p-8 relative overflow-hidden">
      
      {/* Luzes de Fundo */}
      <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[45rem] h-[45rem] rounded-full bg-rose-500/5 blur-[130px] pointer-events-none" />

      {/* Header Landing */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between mb-10 md:mb-16 z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-primary to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
            <Tv className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-white">PornoTv</span>
            <p className="text-stone-500 text-xs font-semibold">ENTRETENIMENTO INTELIGENTE</p>
          </div>
        </div>
      </header>

      {/* Grid Duas Colunas */}
      <main className="flex-1 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start z-10 pb-12">
        
        {/* Coluna Esquerda: Formulário de Ativação (4 colunas) */}
        <section className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md bg-stone-900/60 backdrop-blur-xl border border-stone-850 p-8 rounded-3xl shadow-2xl relative">
            <div className="flex flex-col items-center mb-8 text-center">
              <h2 className="text-2xl font-black text-white tracking-wide">Ativar Dispositivo</h2>
              <p className="text-stone-400 text-sm mt-2">
                Insira o código numérico de 6 dígitos enviado pelo administrador para liberar este <span className="text-primary font-semibold">{getDeviceLabel()}</span>.
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
                  className="w-full bg-stone-950 border border-stone-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-4 text-center text-4xl font-mono tracking-[0.75em] pl-[0.75em] text-stone-100 placeholder-stone-800 focus:outline-none transition-all shadow-inner"
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
                {loading ? 'Validando Dispositivo...' : 'Ativar Agora'}
              </button>
            </form>

            <div className="mt-8 text-center text-xs text-stone-500">
              Dispositivo: <span className="text-stone-400 font-semibold">{deviceType}</span>
            </div>
          </div>
        </section>

        {/* Coluna Direita: Landing Page / Tabela de Planos (7 colunas) */}
        <section className="lg:col-span-7 space-y-6">
          <div className="text-left">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Nossos Planos de Acesso
            </h2>
            <p className="text-stone-400 text-base mt-2 max-w-xl">
              Escolha a quantidade ideal de telas para o seu motel. Ative TVs, celulares e computadores instantaneamente usando um único código numérico.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <div 
                key={plan.name}
                className={`bg-stone-900/40 border rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between hover:scale-102 ${
                  plan.popular 
                    ? 'border-primary shadow-lg shadow-primary/10 relative' 
                    : 'border-stone-850 hover:border-stone-800'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 right-6 bg-primary text-white text-xxs font-extrabold uppercase px-3 py-1 rounded-full tracking-wider shadow">
                    Melhor Custo-Benefício
                  </span>
                )}

                <div>
                  <h3 className="text-lg font-bold text-stone-100">{plan.name}</h3>
                  
                  {/* Preço */}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">R$ {plan.price}</span>
                    <span className="text-stone-500 text-sm font-semibold">/ mês</span>
                  </div>

                  <p className="text-xs text-primary font-bold mt-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md inline-block">
                    Apenas R$ {plan.pricePerDevice.toFixed(2).replace('.', ',')} por tela!
                  </p>

                  {/* Features */}
                  <ul className="mt-6 space-y-2.5 text-xs text-stone-400">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleContract(plan)}
                  className={`mt-8 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all focus:outline-none ${
                    plan.popular
                      ? 'bg-primary hover:bg-primary-hover text-white shadow shadow-primary/20'
                      : 'bg-stone-850 hover:bg-stone-800 text-stone-300 border border-stone-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Contratar Plano</span>
                </button>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
