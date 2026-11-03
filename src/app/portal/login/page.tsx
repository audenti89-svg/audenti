'use client';

import { createClient } from '@/utils/supabase/client';
import { safeUpsertPatient } from '@/lib/patients/safeUpsertPatient';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserCheck,
  ShieldCheck,
  Mail,
  KeyRound,
  AlertCircle,
  Sparkles,
  Building2,
  ArrowRight,
  UserPlus,
  CheckCircle2,
  User,
  Phone,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { AudentiLogo } from '@/components/ui/AudentiLogo';
import { isSystemAdminEmail, isInternalUser } from '@/lib/auth/admin-emails';

// Sucursales activas autorizadas en Audenti 2027
const BRANCH_OPTIONS = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Sucursal Balbuena (Matriz)' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Sucursal Chalma de Guadalupe' }
];

const INTERNAL_ROLES = ['owner', 'admin', 'director', 'doctor', 'socio', 'trabajador', 'pasante', 'estudiante', 'superadmin'];

// Determina automáticamente el destino post-login según el rol
async function determineTargetRoute(supabaseClient: any, authUser: any): Promise<string> {
  const userEmail = (authUser.email || '').toLowerCase().trim();
  if (isSystemAdminEmail(userEmail)) {
    return '/dashboard';
  }

  const metaRole = (authUser.user_metadata?.role || authUser.app_metadata?.role || '').toLowerCase().trim();
  if (isInternalUser(userEmail, metaRole)) {
    return '/dashboard';
  }

  try {
    const { data: profile } = await supabaseClient
      .from('users')
      .select('role, doctor_type')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profile) {
      const dbRole = (profile.role || profile.doctor_type || '').toLowerCase().trim();
      if (isInternalUser(userEmail, dbRole)) {
        return '/dashboard';
      }
    }
  } catch (err) {
    console.warn('Nota determinación de rol en portal login:', err);
  }

  return '/portal';
}

function PatientLoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Modo: 'login' (Iniciar Sesión) | 'activate' (Registrarme / Activar Cuenta)
  const [mode, setMode] = useState<'login' | 'activate'>('login');

  // Estados comunes
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados de Iniciar Sesión
  const [loginEmailOrPhone, setLoginEmailOrPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  // Estados de Registro / Activación (Primer acceso)
  const [actEmail, setActEmail] = useState('');
  const [actFullName, setActFullName] = useState('');
  const [actPhone, setActPhone] = useState('');
  const [actBranchId, setActBranchId] = useState(BRANCH_OPTIONS[0].id);
  const [actPassword, setActPassword] = useState('');
  const [actConfirmPassword, setActConfirmPassword] = useState('');
  const [loadingActivate, setLoadingActivate] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Estado de detección previa de paciente en clínica
  const [checkingRecord, setCheckingRecord] = useState(false);
  const [existingMatch, setExistingMatch] = useState<{
    id: string;
    full_name?: string;
    branch_name?: string;
    phone?: string;
  } | null>(null);

  // 0. AUTO-REDIRECCIÓN: Si el usuario ya cuenta con sesión activa en Supabase,
  // validar inmediatamente y redirigir sin mostrar bucles de login o activación.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user && mounted) {
        const target = await determineTargetRoute(supabase, user);
        window.location.replace(target);
      }
    });
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Sincronizar parámetro URL (?mode=activate o ?mode=register)
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'activate' || modeParam === 'register') {
      setMode('activate');
    }

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

  // Validar si el correo ya existe en clínica al desenfocar el campo (Upsert feedback)
  const handleCheckEmailInClinic = async (emailToCheck: string) => {
    const clean = emailToCheck.trim().toLowerCase();
    if (!clean || !clean.includes('@') || clean.length < 5) return;

    setCheckingRecord(true);
    try {
      const resp = await fetch(`/api/auth/sync-profile?email=${encodeURIComponent(clean)}`);
      if (resp.ok) {
        const res = await resp.json();
        if (res.patient) {
          setExistingMatch(res.patient);
          if (res.patient.full_name && !actFullName) {
            setActFullName(res.patient.full_name);
          }
          if (res.patient.phone && !actPhone) {
            setActPhone(res.patient.phone);
          }
          if (res.patient.tenant_id) {
            setActBranchId(res.patient.tenant_id);
          }
        } else {
          setExistingMatch(null);
        }

        if (res.hasAuthUser) {
          setSuccessMsg('¡Cuenta localizada en el sistema! Configura tu contraseña abajo para acceder inmediatamente.');
        }
      }
    } catch (err) {
      console.warn('Nota comprobación previa de paciente:', err);
    } finally {
      setCheckingRecord(false);
    }
  };

  // 1. INICIAR SESIÓN CON GOOGLE (OAuth)
  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setErrorMsg('');
    setSuccessMsg('');
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

  // 2. INICIAR SESIÓN CON CREDENCIALES (VINCULACIÓN EXACTA Y REDIRECCIÓN SIN BUCLES)
  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmailOrPhone.trim() || !loginPassword.trim()) {
      setErrorMsg('Por favor ingresa tu correo registrado y contraseña.');
      return;
    }

    setLoadingLogin(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const input = loginEmailOrPhone.trim();
      let loginEmail = input;

      // Soporte si el usuario ingresó un teléfono en lugar de correo
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

      let { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword.trim(),
      });

      // Si Supabase devuelve "Email not confirmed", auto-confirmar y reintentar de inmediato
      if (error && error.message?.toLowerCase().includes('email not confirmed')) {
        try {
          const autoConfRes = await fetch('/api/auth/sync-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: loginEmail, autoConfirm: true })
          });
          if (autoConfRes.ok) {
            const retry = await supabase.auth.signInWithPassword({
              email: loginEmail,
              password: loginPassword.trim()
            });
            if (!retry.error && retry.data?.user) {
              data = retry.data;
              error = null;
            }
          }
        } catch (confErr) {
          console.warn('Nota resolución de email no confirmado:', confErr);
        }
      }

      if (error) throw error;

      if (data?.user) {
        setSuccessMsg('¡Inicio de sesión exitoso! Ingresando a la plataforma...');

        // Sincronizar y vincular administrativamente el UUID exacto de auth.users con patients y users
        try {
          await fetch('/api/auth/sync-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email,
              fullName: data.user.user_metadata?.full_name || 'Paciente Audenti',
            })
          });
        } catch (syncErr) {
          console.warn('Nota sync-profile en login:', syncErr);
        }

        // Determinar destino según rol
        const targetRoute = await determineTargetRoute(supabase, data.user);
        setTimeout(() => {
          window.location.href = targetRoute;
        }, 300);
      }
    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      const isBadCreds = err?.message === 'Invalid login credentials';
      if (isBadCreds) {
        setErrorMsg('Contraseña incorrecta. Si es tu primera vez en la plataforma o deseas configurar/restablecer tu contraseña, haz clic en "Activar Cuenta" arriba.');
        if (loginEmailOrPhone.includes('@')) {
          setActEmail(loginEmailOrPhone.trim().toLowerCase());
        }
      } else {
        setErrorMsg(err?.message || 'Error al iniciar sesión en tu portal.');
      }
      setLoadingLogin(false);
    }
  };

  // 3. REGISTRARME / ACTIVAR CUENTA (CONFIGURACIÓN 100% FUNCIONAL Y DIRECTA)
  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = actEmail.trim().toLowerCase();
    const cleanPhone = actPhone.replace(/\D/g, '').slice(-10);

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (actPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (actPassword !== actConfirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setLoadingActivate(true);

    try {
      const selectedBranchObj = BRANCH_OPTIONS.find(b => b.id === actBranchId) || BRANCH_OPTIONS[0];

      // A) Configurar administrativamente la cuenta y contraseña en Supabase Auth y vincular expediente
      const syncRes = await fetch('/api/auth/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: actPassword.trim(),
          fullName: actFullName.trim() || existingMatch?.full_name || 'Paciente Audenti',
          phone: cleanPhone || existingMatch?.phone || null,
          branchId: selectedBranchObj.id,
          branchName: selectedBranchObj.name,
          autoConfirm: true
        })
      });

      const syncResult = await syncRes.json();
      if (!syncRes.ok || syncResult.error) {
        throw new Error(syncResult.error || 'No se pudo configurar la cuenta en el servidor.');
      }

      setSuccessMsg('¡Contraseña configurada con éxito! Ingresando a tu expediente...');

      // B) Iniciar sesión de forma inmediata con la contraseña recién establecida
      const { data: directLogin, error: directLoginErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: actPassword.trim(),
      });

      if (directLoginErr) {
        console.warn('Nota login inmediato post-sync:', directLoginErr.message);
      }

      if (directLogin?.user) {
        const target = await determineTargetRoute(supabase, directLogin.user);
        setTimeout(() => {
          window.location.href = target;
        }, 300);
      } else {
        const fallbackTarget = syncResult.targetRoute || (isSystemAdminEmail(cleanEmail) ? '/dashboard' : '/portal');
        setTimeout(() => {
          window.location.href = fallbackTarget;
        }, 500);
      }
    } catch (err: any) {
      console.error('Error al activar cuenta de paciente:', err);
      setErrorMsg(err?.message || 'Error al activar tu cuenta. Intenta nuevamente.');
    } finally {
      setLoadingActivate(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-950/95 border-2 border-amber-500/40 p-6 sm:p-8 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.15)] text-center text-white backdrop-blur-2xl">
      {/* LOGO INSTITUCIONAL */}
      <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/50 mx-auto flex items-center justify-center text-amber-300 mb-3.5 shadow-sm overflow-hidden">
        <AudentiLogo size={32} className="w-8 h-8 text-amber-400" />
      </div>

      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/30 mb-2">
        <UserCheck className="w-3.5 h-3.5" />
        Portal del Paciente • Audenti 2027
      </span>

      <h1 className="text-2xl font-black text-white tracking-tight mt-1 mb-1">
        {mode === 'login' ? 'Acceso a tu Expediente' : 'Activar Cuenta de Paciente'}
      </h1>
      <p className="text-xs text-slate-400 mb-5 font-medium">
        Dra. Aura Estudillo • Sucursal Balbuena &amp; Sucursal Chalma de Guadalupe
      </p>

      {/* SELECTOR SEGMENTADO (TABS 100% VISIBLES: INICIAR SESIÓN / ACTIVAR CUENTA) */}
      <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl mb-5">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mode === 'login'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Iniciar Sesión</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('activate');
            setErrorMsg('');
            setSuccessMsg('');
            if (loginEmailOrPhone.includes('@') && !actEmail) {
              setActEmail(loginEmailOrPhone.trim().toLowerCase());
              handleCheckEmailInClinic(loginEmailOrPhone.trim().toLowerCase());
            }
          }}
          className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mode === 'activate'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Activar Cuenta</span>
        </button>
      </div>

      {/* MENSAJES DE ESTADO (ERROR / ÉXITO) */}
      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold text-left flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="leading-snug">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-left flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
          <div className="leading-snug">{successMsg}</div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VISTA 1: FORMULARIO DE INICIAR SESIÓN                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {mode === 'login' && (
        <>
          <form onSubmit={handlePatientLogin} className="space-y-3.5 text-left mb-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Correo Registrado o Teléfono
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="tu@correo.com o celular a 10 dígitos"
                  value={loginEmailOrPhone}
                  onChange={(e) => setLoginEmailOrPhone(e.target.value)}
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingLogin || loadingGoogle}
              className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-60 mt-2"
            >
              {loadingLogin ? 'Accediendo a tu expediente...' : 'Ingresar a mi Expediente Dental'}
            </button>
          </form>

          {/* TARJETA DESTACADA PARA ACTIVACIÓN / PRIMER ACCESO */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-left space-y-1.5 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-1.5 tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                ¿Te atendiste en clínica y es tu primer acceso?
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Si la Dra. Aura abrió tu expediente en Balbuena o Chalma, activa tu cuenta para configurar tu contraseña sin duplicar tus datos.
            </p>
            <button
              type="button"
              onClick={() => {
                setMode('activate');
                if (loginEmailOrPhone.includes('@')) {
                  const clean = loginEmailOrPhone.trim().toLowerCase();
                  setActEmail(clean);
                  handleCheckEmailInClinic(clean);
                }
              }}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40 text-xs font-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrarme / Activar Mi Cuenta →</span>
            </button>
          </div>

          <div className="relative flex py-1.5 items-center">
            <div className="grow border-t border-slate-800"></div>
            <span className="shrink mx-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">o ingresar con</span>
            <div className="grow border-t border-slate-800"></div>
          </div>

          {/* INICIO CON GOOGLE PARA PACIENTES */}
          <button
            onClick={handleGoogleLogin}
            disabled={loadingGoogle || loadingLogin}
            className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl font-bold text-xs text-white transition-colors flex items-center justify-center gap-3 shadow-sm active:scale-95 cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.22 24 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.18C.43 8.12 0 9.82 0 12s.43 3.88 1.18 5.4l4.09-3.16z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.68 1.18 6.6l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
            </svg>
            {loadingGoogle ? 'Conectando...' : 'Acceso Rápido con Google'}
          </button>
        </>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VISTA 2: FORMULARIO DE REGISTRO / ACTIVACIÓN (UPSERT SEGURO) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {mode === 'activate' && (
        <form onSubmit={handleActivateAccount} className="space-y-3.5 text-left mb-4">
          {/* BANNER INFORMATIVO UPSERT */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-slate-300 leading-snug">
            <span className="text-amber-300 font-bold block mb-0.5">
              Activación Inmediata Sin Duplicados:
            </span>
            Ingresa tu correo registrado en clínica para asignar tu contraseña de acceso seguro. Si eres un paciente nuevo, tu cuenta se creará y vinculará al instante.
          </div>

          {/* CORREO ELECTRÓNICO */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                Correo Registrado en Clínica *
              </label>
              {checkingRecord && (
                <span className="text-[10px] text-amber-400 font-bold animate-pulse">
                  Buscando expediente...
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={actEmail}
                onChange={(e) => setActEmail(e.target.value)}
                onBlur={(e) => handleCheckEmailInClinic(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
              />
            </div>

            {/* FEEDBACK DE VALIDACIÓN CONTRA SUPABASE */}
            {existingMatch && (
              <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-[11px] text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>
                  ¡Expediente encontrado!: <strong>{existingMatch.full_name || 'Paciente Audenti'}</strong> ({existingMatch.branch_name || 'Balbuena'})
                </span>
              </div>
            )}
          </div>

          {/* NOMBRE COMPLETO */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Nombre Completo *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Tu nombre y apellidos"
                value={actFullName}
                onChange={(e) => setActFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
              />
            </div>
          </div>

          {/* TELÉFONO DE CONTACTO */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Teléfono Celular (10 dígitos)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                maxLength={10}
                placeholder="55 1234 5678"
                value={actPhone}
                onChange={(e) => setActPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
              />
            </div>
          </div>

          {/* SUCURSAL ASIGNADA */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Sucursal de Atención Habitual *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={actBranchId}
                onChange={(e) => setActBranchId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all cursor-pointer"
              >
                {BRANCH_OPTIONS.map((branch) => (
                  <option key={branch.id} value={branch.id} className="bg-slate-950 text-white">
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CONTRASEÑA NUEVA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Nueva Contraseña *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Mín. 6 caracteres"
                  value={actPassword}
                  onChange={(e) => setActPassword(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Confirmar Contraseña *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repite contraseña"
                  value={actConfirmPassword}
                  onChange={(e) => setActConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* BOTÓN ACTIVAR CUENTA */}
          <button
            type="submit"
            disabled={loadingActivate || loadingGoogle}
            className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-60 mt-3"
          >
            {loadingActivate ? 'Configurando y Entrando...' : 'Activar Cuenta y Abrir Mi Expediente'}
          </button>

          {/* VOLVER A INICIAR SESIÓN */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
            >
              ¿Ya configuraste tu contraseña? Iniciar sesión aquí →
            </button>
          </div>
        </form>
      )}

      {/* INFORMACIÓN DE PRIVACIDAD MÉDICA */}
      <div className="mt-5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
        <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
          Privacidad de Datos Clínicos (NOM-004-SSA3):
        </span>
        <p className="leading-relaxed">
          Tus registros de odontograma, citas en Balbuena o Chalma de Guadalupe y recetas médicas se encuentran encriptados y protegidos bajo la norma oficial de expediente clínico.
        </p>
      </div>

      {/* PIE DE PÁGINA LIMPIO (EXCLUSIVO PACIENTES) */}
      <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <Link href="/" className="hover:text-amber-400 transition-colors font-medium">
          ← Volver al Inicio
        </Link>
        <span className="font-semibold text-slate-500">Audenti 2027 • Balbuena &amp; Chalma</span>
      </div>
    </div>
  );
}

export default function PatientLoginPage() {
  return (
    <div className="min-h-screen bg-[#040711] flex items-center justify-center p-4 selection:bg-amber-400 selection:text-slate-950">
      <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Cargando portal del paciente...</div>}>
        <PatientLoginForm />
      </Suspense>
    </div>
  );
}
