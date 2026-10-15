'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState('Verificando credenciales de acceso...');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // 1. Revisar si hay un código en el query param (PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error_description') || urlParams.get('error');

        if (error) {
          router.replace(`/auth/login?error=${encodeURIComponent(error)}`);
          return;
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            router.replace(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`);
            return;
          }
        }

        // 2. Verificar la sesión del usuario obtenida
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setStatus('Acceso autorizado. Redirigiendo al portal clínico...');
          
          // Consultar estado de onboarding en patients
          const { data: patient } = await supabase
            .from('patients')
            .select('onboarding_completed')
            .eq('id', session.user.id)
            .maybeSingle();

          if (patient?.onboarding_completed) {
            router.replace('/dashboard');
          } else {
            router.replace('/onboarding');
          }
        } else {
          // Si por alguna razón no hay sesión aún, esperar el evento onAuthStateChange
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (newSession?.user) {
              subscription.unsubscribe();
              router.replace('/onboarding');
            }
          });
        }
      } catch (err: any) {
        console.error('Error en callback:', err);
        router.replace(`/auth/login?error=${encodeURIComponent(err?.message || 'Error inesperado')}`);
      }
    };

    handleAuth();
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-[#0E131F] flex items-center justify-center p-4 text-white">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-4">
        <div className="w-12 h-12 border-3 border-[#E3A033] border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-lg font-bold text-slate-100">Audenti — DentalCloud Pro</h2>
        <p className="text-xs text-slate-400">{status}</p>
      </div>
    </div>
  );
}
