'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCheck, ShieldCheck, Mail, KeyRound, AlertCircle, Sparkles, Building2, Stethoscope, ArrowRight } from 'lucide-react';
import { AudentiLogo } from '@/components/ui/AudentiLogo';

function PatientLoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'auth_failed') {
        setErrorMsg('No se pudo verificar la sesión. Intenta nuevamente.');
      } else if (errorParam === 'no_code_provided') {
        setErrorMsg('No se recibió código de autorización.');
      } else {
        setErrorMsg(decodeURIComponent(errorParam));
      }
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/portal&portal=true`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Error en autenticación de paciente con Google:', err);
      setErrorMsg(err?.message || 'Error al conectar con Google OAuth');
      setLoadingGoogle(false);
    }
  };

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim() || !password.trim()) {
      setErrorMsg('Por favor ingresa tu correo electrónico registrado y contraseña.');
      return;
    }

    setLoadingEmail(true);
    setErrorMsg('');

    try {
      const input = emailOrPhone.trim();
      let loginEmail = input;

      // Si el usuario ingresó un número de teléfono en lugar de correo
      if (!input.includes('@')) {
        const cleanPhone = input.replace(/\D/g, '').slice(-10);
        const { data: pRecord } = await supabase
          .from('patients')
          .select('email')
          .ilike('phone', `%${cleanPhone}%`)
          .maybeSingle();

        if (pRecord?.email) {
          loginEmail = pRecord.email;
        } else {
          throw new Error('No encontramos un paciente registrado con ese número de teléfono.');
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password.trim(),
      });

      if (error) throw error;

      if (data?.user) {
        // Enlazar paciente en caso de ser necesario
        const { data: p } = await supabase
          .from('patients')
          .select('id')
          .or(`auth_user_id.eq.${data.user.id},user_id.eq.${data.user.id},email.eq.${data.user.email}`)
          .maybeSingle();

        if (p) {
          await supabase.from('patients').update({
            auth_user_id: data.user.id,
            user_id: data.user.id
          }).eq('id', p.id);
        }

        router.push('/portal');
      }
    } catch (err: any) {
      console.error('Error al iniciar sesión de paciente:', err);
      setErrorMsg(err?.message === 'Invalid login credentials'
        ? 'Credenciales no coincidentes. Verifica tu correo registrado y contraseña.'
        : err?.message || 'Error al iniciar sesión en tu portal.');
      setLoadingEmail(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-950/95 border-2 border-amber-500/40 p-8 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.15)] text-center text-white backdrop-blur-2xl">
      <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/50 mx-auto flex items-center justify-center text-amber-300 mb-4 shadow-sm overflow-hidden">
        <AudentiLogo size={32} className="w-8 h-8 text-amber-400" />
      </div>

      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/30 mb-2">
        <UserCheck className="w-3.5 h-3.5" />
        Portal del Paciente • Acceso Seguro
      </span>

      <h1 className="text-2xl font-black text-white tracking-tight mt-1 mb-1">Audenti Pacientes</h1>
      <p className="text-xs text-slate-400 mb-6 font-medium">
        Dra. Aura Estudillo • Consulta tu Historial Clínico, Citas y Recetas Digitales
      </p>

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold text-left flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="leading-snug">{errorMsg}</div>
        </div>
      )}

      {/* FORMULARIO DE ACCESO PACIENTE */}
      <form onSubmit={handlePatientLogin} className="space-y-3.5 text-left mb-5">
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
            Correo Registrado o Teléfono
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="tu@correo.com o teléfono a 10 dígitos"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
            Contraseña
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loadingEmail || loadingGoogle}
          className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-60 mt-2"
        >
          {loadingEmail ? 'Accediendo a tu expediente...' : 'Ingresar a mi Expediente Dental'}
        </button>
      </form>

      <div className="relative flex py-2 items-center">
        <div className="grow border-t border-slate-800"></div>
        <span className="shrink mx-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">o ingresar con</span>
        <div className="grow border-t border-slate-800"></div>
      </div>

      {/* INICIO CON GOOGLE PARA PACIENTES */}
      <button
        onClick={handleGoogleLogin}
        disabled={loadingGoogle || loadingEmail}
        className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl font-bold text-xs text-white transition-colors flex items-center justify-center gap-3 shadow-sm active:scale-95 cursor-pointer disabled:opacity-60"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.22 24 12 24z"/>
          <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.18C.43 8.12 0 9.82 0 12s.43 3.88 1.18 5.4l4.09-3.16z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.68 1.18 6.6l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
        </svg>
        {loadingGoogle ? 'Conectando...' : 'Acceso con Google'}
      </button>

      {/* INFORMACIÓN DE PRIVACIDAD MÉDICA */}
      <div className="mt-6 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
        <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
          Privacidad de Datos Clínicos:
        </span>
        <p className="leading-relaxed">
          Tus registros de odontograma, citas en Balbuena o Chalma de Guadalupe y recetas médicas se encuentran encriptados y protegidos bajo la norma oficial NOM-004-SSA3.
        </p>
      </div>

      {/* SWITCH AL PORTAL MÉDICO PARA COLABORADORES */}
      <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-amber-400 transition-colors font-medium">
          ← Inicio
        </Link>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold transition-colors"
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Acceso para Doctores / Personal</span>
        </Link>
      </div>
    </div>
  );
}

export default function PatientLoginPage() {
  return (
    <div className="min-h-screen bg-[#040711] flex items-center justify-center p-4 selection:bg-amber-400 selection:text-slate-950">
      <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Cargando acceso al portal...</div>}>
        <PatientLoginForm />
      </Suspense>
    </div>
  );
}
