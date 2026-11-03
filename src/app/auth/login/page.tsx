'use client';

import { createClient } from '@/utils/supabase/client';
import { safeUpsertPatient } from '@/lib/patients/safeUpsertPatient';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, ShieldCheck, Mail, KeyRound, AlertCircle, Sparkles, Building2, UserCheck, UserPlus } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loginMode, setLoginMode] = useState<'both'>('both');

  useEffect(() => {
    // Captura de atribución si viniera en URL
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref', 'canal', 'qr'];
    const attribution: Record<string, string> = {};
    utmKeys.forEach(key => {
      const val = searchParams.get(key);
      if (val) {
        sessionStorage.setItem(`audenti_${key}`, val);
        attribution[key] = val;
      }
    });
    if (Object.keys(attribution).length > 0) {
      try {
        document.cookie = `audenti_attr=${encodeURIComponent(JSON.stringify(attribution))}; path=/; max-age=2592000; SameSite=Lax`;
      } catch {}
    }

    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'acceso_denegado_personal_interno') {
        setErrorMsg('Acceso restringido: Esta plataforma es de uso exclusivo para personal interno autorizado de Audenti (Doctores, Socios, Pasantes y Administradores). Las cuentas deben ser creadas previamente por la Dirección Médica (Dra. Aura Estudillo).');
      } else if (errorParam === 'auth_failed') {
        setErrorMsg('No se pudo completar la sesión con Google. Intenta nuevamente.');
      } else if (errorParam === 'no_code_provided') {
        setErrorMsg('No se recibió código de autorización del proveedor.');
      } else {
        setErrorMsg(decodeURIComponent(errorParam));
      }
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setErrorMsg('');
    try {
      let state: string | undefined = undefined;
      try {
        const storedAttr: Record<string, string> = {};
        const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref', 'canal', 'qr'];
        keys.forEach(k => {
          const v = sessionStorage.getItem(`audenti_${k}`);
          if (v) storedAttr[k] = v;
        });
        if (Object.keys(storedAttr).length > 0) {
          state = btoa(JSON.stringify(storedAttr));
        }
      } catch {}

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: state ? { state } : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Error en autenticación con Google:', err);
      setErrorMsg(err?.message || 'Error al conectar con Google OAuth');
      setLoadingGoogle(false);
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor ingresa tu correo institucional y contraseña.');
      return;
    }

    setLoadingEmail(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        // Verificar que el usuario tenga rol interno
        const userEmail = data.user.email || '';
        const userMetaRole = (data.user.user_metadata?.role || data.user.app_metadata?.role || '').toLowerCase();
        const INTERNAL_ROLES = ['owner', 'admin', 'director', 'doctor', 'socio', 'trabajador', 'pasante', 'estudiante'];

        let isInternal = userEmail === 'audenti89@gmail.com' || INTERNAL_ROLES.includes(userMetaRole);

        if (!isInternal) {
          const { data: profile } = await supabase
            .from('users')
            .select('role, doctor_type')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profile) {
            const dbRole = (profile.role || profile.doctor_type || '').toLowerCase();
            if (INTERNAL_ROLES.includes(dbRole)) {
              isInternal = true;
            }
          }
        }

        if (isInternal) {
          router.push('/dashboard');
        } else {
          // Si el usuario autenticado es un paciente, redirigir automáticamente a su portal
          try {
            await safeUpsertPatient(supabase, {
              user_id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || 'Paciente Audenti',
              onboarding_completed: true
            });
          } catch (linkErr) {
            console.warn('Nota safeUpsertPatient en auth login:', linkErr);
          }
          router.push('/portal');
        }
      }
    } catch (err: any) {
      console.error('Error al iniciar sesión con correo:', err);
      setErrorMsg(err?.message === 'Invalid login credentials' 
        ? 'Credenciales incorrectas. Verifica tu correo y contraseña.' 
        : err?.message || 'Error al autenticar credenciales.');
      setLoadingEmail(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-950/95 border-2 border-amber-500/40 p-8 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.15)] text-center text-white backdrop-blur-2xl">
      <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/50 mx-auto flex items-center justify-center text-amber-300 mb-4 shadow-sm">
        <Lock className="w-6 h-6" />
      </div>

      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/10 text-amber-400 border border-amber-400/30 mb-2">
        <ShieldCheck className="w-3.5 h-3.5" />
        Acceso Exclusivo • Personal Interno
      </span>

      <h1 className="text-2xl font-black text-white tracking-tight mt-1 mb-1">Audenti DentalCloud Pro</h1>
      <p className="text-xs text-slate-400 mb-6 font-medium">
        Dra. Aura Estudillo • Sucursal Balbuena &amp; Sucursal Chalma de Guadalupe
      </p>

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold text-left flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="leading-snug">{errorMsg}</div>
        </div>
      )}

      {/* FORMULARIO CORREO Y CONTRASEÑA (PERSONAL INTERNO) */}
      <form onSubmit={handleEmailPasswordLogin} className="space-y-3.5 text-left mb-5">
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
            Correo Institucional / Médico
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              placeholder="doctor@audenti.mx o cuenta asignada"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
            Contraseña Asignada
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
          {loadingEmail ? 'Verificando Credenciales...' : 'Ingresar con Correo / Contraseña'}
        </button>
      </form>

      <div className="relative flex py-2 items-center">
        <div className="grow border-t border-slate-800"></div>
        <span className="shrink mx-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">o autenticar con</span>
        <div className="grow border-t border-slate-800"></div>
      </div>

      {/* BOTÓN GOOGLE OAUTH PARA CUENTAS DE DOCTORES / ADMINISTRADORES */}
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
        {loadingGoogle ? 'Conectando...' : 'Iniciar Sesión Médica con Google'}
      </button>

      {/* AVISO DE ACCESO Y ACTIVACIÓN PARA PACIENTES */}
      <div className="mt-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            ¿Eres Paciente de Audenti?
          </span>
          <span className="text-[10px] font-semibold text-slate-400">Balbuena &amp; Chalma</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-snug">
          Consulta tu odontograma, citas y recetas, o activa tu cuenta si ya te diste de alta en recepción.
        </p>
        <div className="pt-1 flex items-center gap-2">
          <Link
            href="/portal/login"
            className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors text-center shadow-sm flex items-center justify-center gap-1"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </Link>
          <Link
            href="/portal/login?mode=activate"
            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 font-bold text-xs transition-colors text-center shadow-sm flex items-center justify-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Activar Cuenta →</span>
          </Link>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <Link href="/" className="hover:text-amber-400 transition-colors font-medium">
          ← Volver al portal
        </Link>
        <span className="font-semibold text-slate-500">Sesión 12h • Céd. Prof. 8492019</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
