'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PatientRegisterRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/portal/login?mode=activate');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#040711] flex items-center justify-center p-4 text-slate-400 text-xs">
      <Suspense fallback={<div>Cargando activación de cuenta de paciente...</div>}>
        <div className="animate-pulse text-amber-400 font-bold">
          Redirigiendo a Activación de Cuenta de Paciente...
        </div>
      </Suspense>
    </div>
  );
}
