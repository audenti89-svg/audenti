'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { AudentiLogo } from '@/components/ui/AudentiLogo';
import { safeUpsertPatient } from '@/lib/patients/safeUpsertPatient';
import {
  X,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  User,
  CheckCircle2,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export function AuthModal({
  isOpen,
  onClose,
  defaultMode = 'login',
}: AuthModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  // 1. Iniciar sesión con Google OAuth
  const handleGoogleAuth = async () => {
    setLoadingGoogle(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Error Google OAuth:', err);
      setErrorMessage(err?.message || 'Error al conectar con Google OAuth.');
      setLoadingGoogle(false);
    }
  };

  // 2. Autenticación con Correo Electrónico y Contraseña (Dual: Iniciar Sesión / Registrarse)
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingEmail(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        // Cerrar modal y redirigir (el middleware evaluará si tiene onboarding pendiente)
        onClose();
        router.push('/dashboard');
        router.refresh();
      } else {
        // Registro: Al registrar al paciente, asignar el rol correspondiente
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              role: 'patient', // Rol de paciente
              full_name: fullName.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          try {
            await safeUpsertPatient(supabase, {
              auth_user_id: data.user.id,
              user_id: data.user.id,
              email: email.trim(),
              full_name: fullName.trim(),
              onboarding_completed: false
            });
          } catch (upsertErr) {
            console.warn('Upsert inicial en registro:', upsertErr);
          }
        }

        if (data.session) {
          // Sesión inmediata sin confirmación de email requerida
          onClose();
          router.push('/onboarding');
          router.refresh();
        } else {
          setSuccessMessage(
            '¡Cuenta creada con éxito! Hemos enviado un enlace de confirmación a tu correo.'
          );
        }
      }
    } catch (err: any) {
      console.error('Error Email Auth:', err);
      setErrorMessage(
        err?.message === 'Invalid login credentials'
          ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
          : err?.message || 'Ocurrió un error en la autenticación.'
      );
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* 1. Backdrop Esmerilado (Glassmorphism de Alto Contraste) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      />

      {/* 2. Tarjeta Flotante con Acabado Cristal Oscuro y Bordes Ámbar */}
      <div className="relative w-full max-w-md bg-slate-950/95 backdrop-blur-2xl rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.15)] border-2 border-amber-500/40 p-6 sm:p-8 text-white z-10 transition-all duration-300 animate-in zoom-in-95 fade-in slide-in-from-bottom-4">
        {/* Botón de Cierre */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabecera con Branding Institucional */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <AudentiLogo size={48} variant="icon" />
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h2 className="text-xl font-black text-white tracking-tight">
              Audenti — DentalCloud Pro
            </h2>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xs font-semibold text-amber-300">
            Dra. Aura Estudillo • Céd. Prof. 8492019
          </p>
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Acceso Médico Clínico Protegido
          </div>
        </div>

        {/* Accesos Rápidos a Portales Oficiales */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push('/auth/login');
            }}
            className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-[11px] font-bold border border-slate-700 hover:border-amber-400/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Doctores / Staff</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              router.push('/portal/login');
            }}
            className="py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Portal Paciente</span>
          </button>
        </div>

        {/* Selector Dual Minimalista: Iniciar Sesión / Crear Cuenta */}
        <div className="flex p-1 bg-slate-900 rounded-2xl mb-5 text-xs font-bold border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Notificaciones de Error o Éxito */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-xs font-medium text-rose-300 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-xs font-medium text-emerald-300 flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Botón Oficial Google OAuth de Alta Gama */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loadingGoogle || loadingEmail}
          className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700 hover:border-slate-600 shadow-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.22 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.18C.43 8.12 0 9.82 0 12s.43 3.88 1.18 5.4l4.09-3.16z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.68 1.18 6.6l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
          {loadingGoogle
            ? 'Conectando con Google...'
            : mode === 'login'
            ? 'Continuar con Google'
            : 'Registrarse con Google'}
        </button>

        {/* Separador */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500">
            <span className="bg-slate-950 px-3">o con correo electrónico</span>
          </div>
        </div>

        {/* Formulario Alternativo de Correo Electrónico y Contraseña */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                Nombre Completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Ej. Roberto Gómez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingEmail || loadingGoogle}
            className="w-full mt-2 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {loadingEmail ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'login' ? 'Entrar al Portal Clínico' : 'Registrar Cuenta'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer legal */}
        <div className="mt-5 pt-3.5 border-t border-slate-800 text-center text-[10px] text-slate-400">
          Protección de datos conforme a NOM-004-SSA3-2012 del Expediente Clínico.
        </div>
      </div>
    </div>
  );
}
