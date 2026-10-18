'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { AudentiLogo } from '@/components/ui/AudentiLogo';
import {
  User,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  HeartPulse,
  Clock,
  MapPin,
  Building2,
  FileText,
  AlertCircle,
  LogOut,
  Stethoscope,
  Smile,
  CheckCircle2,
  Lock
} from 'lucide-react';
import Link from 'next/link';

export default function MiExpedientePortalPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    async function loadPortalData() {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/auth/login');
          return;
        }

        setUser(authUser);

        // Consulta filtrada estrictamente al ID o email del usuario en sesión
        let { data: myProfile, error: profileError } = await supabase
          .from('patients')
          .select('*')
          .or(`user_id.eq.${authUser.id},email.eq.${authUser.email}`)
          .maybeSingle();

        // Fallback por ID directo si es UUID idéntico
        if (!myProfile && authUser.id) {
          const { data: fallbackProfile } = await supabase
            .from('patients')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();
          myProfile = fallbackProfile;
        }

        setPatient(myProfile);

        if (myProfile?.id) {
          const { data: appts } = await supabase
            .from('appointments')
            .select('*')
            .eq('patient_id', myProfile.id)
            .order('start_time', { ascending: false });
          setAppointments(appts || []);
        }
      } catch (err) {
        console.error('Error cargando portal del paciente:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPortalData();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d19] flex items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Cargando tu expediente clínico seguro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d19] text-slate-100 pb-16">
      {/* Header Institucional del Portal */}
      <header className="border-b border-slate-800/80 bg-[#0c1322]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AudentiLogo className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              AUDENTI <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30">Portal del Paciente</span>
            </h1>
            <p className="text-[11px] text-slate-400">Dra. Aura Estudillo • Céd. Prof. 8492019</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Banner de Bienvenida del Paciente */}
        <div className="bg-gradient-to-r from-[#121c33] via-[#0f172a] to-[#1e1b4b] rounded-2xl p-6 border border-slate-800/90 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Expediente Clínico Protegido (NOM-004-SSA3)
            </span>
            <h2 className="text-2xl font-black text-white">
              Bienvenido(a), {patient?.full_name || user?.user_metadata?.full_name || 'Paciente'}
            </h2>
            <p className="text-xs text-slate-300 max-w-xl mt-1">
              Aquí puedes consultar tu historial odontológico, citas agendadas, indicaciones médicas y datos bioseguros de emergencia.
            </p>
          </div>
        </div>

        {/* Ficha de Información del Paciente */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Datos Personales y Clínicos */}
            <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Datos de Identificación y Contacto
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Nombre Completo</p>
                  <p className="font-semibold text-slate-100 mt-0.5">{patient?.full_name || user?.user_metadata?.full_name || 'No registrado'}</p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Teléfono Registrado</p>
                  <p className="font-semibold text-slate-100 mt-0.5">{patient?.phone || 'Sin número'}</p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Correo Electrónico</p>
                  <p className="font-semibold text-slate-100 mt-0.5">{patient?.email || user?.email}</p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Edad</p>
                  <p className="font-semibold text-slate-100 mt-0.5">{patient?.age ? `${patient.age} años` : 'No especificada'}</p>
                </div>
              </div>
            </div>

            {/* Citas Odontológicas */}
            <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Mis Citas y Consultas
              </h3>

              {appointments.length === 0 ? (
                <div className="text-center py-8 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                  <Smile className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-semibold text-slate-300">No tienes citas activas programadas.</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Comunícate con recepción o escribe en el asistente virtual de la Dra. Aura para solicitar tu valoración odontológica.
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all"
                  >
                    Agendar Cita en Línea
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appt) => (
                    <div key={appt.id} className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">{appt.treatment_type || 'Consulta Odontológica'}</p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {new Date(appt.start_time).toLocaleDateString('es-MX', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {appt.status || 'Confirmada'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Columna Lateral: Bioseguridad y Sedes */}
          <div className="space-y-6">
            {/* Alerta Médica y Bioseguridad */}
            <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-2">
                <HeartPulse className="w-4 h-4" /> Bioseguridad Médica
              </h3>

              <div className="space-y-3 text-xs">
                <div className="bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl">
                  <p className="text-rose-400 font-bold text-[10px] uppercase">Alergias o Contraindicaciones</p>
                  <p className="text-slate-200 mt-1 font-semibold">
                    {Array.isArray(patient?.allergies_medication) && patient.allergies_medication.length > 0
                      ? patient.allergies_medication.join(', ')
                      : (Array.isArray(patient?.allergies) && patient.allergies.length > 0
                          ? patient.allergies.join(', ')
                          : 'Ninguna reportada')}
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                  <p className="text-amber-400 font-bold text-[10px] uppercase">Contacto de Urgencia</p>
                  <p className="text-slate-200 mt-1 font-semibold">
                    {patient?.emergency_contact_name || 'No registrado'}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    {patient?.emergency_phone || patient?.emergency_contact_phone || 'Sin teléfono'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sede Asignada */}
            <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-5 shadow-lg text-xs space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Sede de Atención
              </h3>
              <p className="text-slate-300 font-semibold">
                {patient?.tenant_id === '00000000-0000-0000-0000-000000000002'
                  ? 'Sucursal Chalma de Guadalupe'
                  : 'Sucursal Valbuena (Matriz)'}
              </p>
              <p className="text-[11px] text-slate-500">
                Atención bajo protocolo clínico estricto y seguimiento digitalizado.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
