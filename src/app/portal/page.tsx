'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { AudentiLogo } from '@/components/ui/AudentiLogo';
import {
  Calendar,
  Clock,
  ShieldCheck,
  HeartPulse,
  Building2,
  FileText,
  CreditCard,
  Download,
  AlertTriangle,
  LogOut,
  MapPin,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  PlusCircle,
  FileCheck2,
  Phone
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import PatientOdontogram from '@/components/PatientOdontogram';
import { UnifiedCommunicationWidget } from '@/components/chat/UnifiedCommunicationWidget';

// Constantes oficiales de Sedes y Sedes Clínicas Audenti
const BRANCH_DETAILS: Record<string, { name: string; address: string; mapUrl: string; hours: string; phone: string }> = {
  '00000000-0000-0000-0000-000000000001': {
    name: 'Sucursal Valbuena (Matriz)',
    address: 'Calle Cecilio Robelo 475, Aeronáutica Militar, Venustiano Carranza, CDMX',
    mapUrl: 'https://maps.google.com/?q=Aeronautica+Militar+Venustiano+Carranza+CDMX',
    hours: 'Lunes a Viernes: 09:00 - 20:00 | Sábado: 09:00 - 15:00',
    phone: '55 2242 7769'
  },
  '00000000-0000-0000-0000-000000000002': {
    name: 'Sucursal Chalma de Guadalupe',
    address: 'Av. Chalma de Guadalupe, Gustavo A. Madero, CDMX',
    mapUrl: 'https://maps.google.com/?q=Chalma+de+Guadalupe+Gustavo+A+Madero+CDMX',
    hours: 'Lunes a Viernes: 10:00 - 19:00 | Sábado: 09:00 - 14:00',
    phone: '55 2242 7769'
  }
};

// FDI Notation: Adult teeth
const ADULT_TEETH = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
};

type ToothDiagnosis = {
  condition: 'healthy' | 'filled' | 'crown' | 'root_canal' | 'missing' | 'cleaning_recommended';
  label: string;
  badgeColor: string;
  fillColor: string;
  treatmentName: string;
  appliedDate?: string;
  notes: string;
};

const DEFAULT_DIAGNOSIS_MAP: Record<number, ToothDiagnosis> = {
  16: { condition: 'filled', label: 'Resina Estética', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40', fillColor: '#3b82f6', treatmentName: 'Obturación con Resina Fotocurable', appliedDate: '15/Sep/2026', notes: 'Obturación oclusal intacta en buen estado.' },
  26: { condition: 'crown', label: 'Corona Zirconia', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40', fillColor: '#f59e0b', treatmentName: 'Corona Cerámica Monolítica', appliedDate: '20/Jul/2026', notes: 'Ajuste marginal verificado sin microfiltración.' },
  36: { condition: 'filled', label: 'Resina Oclusal', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40', fillColor: '#3b82f6', treatmentName: 'Resina Nanohíbrida 3M', appliedDate: '12/Oct/2026', notes: 'Restauración estética post-desinfección profiláctica.' },
  46: { condition: 'root_canal', label: 'Endodoncia', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40', fillColor: '#f97316', treatmentName: 'Tratamiento de Conductos Rotatorio', appliedDate: '02/Ago/2026', notes: 'Obturación tridimensional biocerámica sin sintomatología.' },
  18: { condition: 'missing', label: 'Ausente (Tercer Molar)', badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40', fillColor: '#475569', treatmentName: 'Extracción Quirúrgica Previa', appliedDate: '10/Mar/2026', notes: 'Cicatrización ósea y gingival completa.' }
};

export default function PatientPortalPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<number>(36);

  useEffect(() => {
    async function loadPortal() {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/auth/login');
          return;
        }

        setUser(authUser);

        // Consulta filtrada estrictamente al user_id del usuario autenticado
        let { data: myProfile, error: profileError } = await supabase
          .from('patients')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();

        // Enlace de contingencia por email únicamente si el correo está verificado por el proveedor de autenticación
        const isEmailVerified = !!authUser.email_confirmed_at || !!authUser.confirmed_at;
        if (!myProfile && authUser.email && isEmailVerified) {
          const { data: emailProfile } = await supabase
            .from('patients')
            .select('*')
            .eq('email', authUser.email)
            .maybeSingle();
          
          if (emailProfile) {
            myProfile = emailProfile;
            // Auto-enlazar user_id para futuras consultas directas
            await supabase
              .from('patients')
              .update({ user_id: authUser.id })
              .eq('id', emailProfile.id);
          }
        }

        setPatient(myProfile);

        if (myProfile?.id) {
          const { data: appts } = await supabase
            .from('appointments')
            .select('*')
            .eq('patient_id', myProfile.id)
            .order('start_time', { ascending: true });
          setAppointments(appts || []);
        }
      } catch (err) {
        console.error('Error cargando portal del paciente:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPortal();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  // Asegúrate de que el componente lea la sucursal asignada en la base de datos del paciente:
  const branchDisplay = patient?.branch_name || patient?.tenant_id || "Sucursal Chalma de Guadalupe";

  // Resolver sede de atención directamente por branch_name o tenant_id
  const branchInfo = useMemo(() => {
    const rawBranchName = (branchDisplay || '').toLowerCase();
    const tid = patient?.tenant_id || '';

    // Si tiene asignada Balbuena
    if (
      rawBranchName.includes('valbuena') ||
      rawBranchName.includes('balbuena') ||
      tid === '00000000-0000-0000-0000-000000000001'
    ) {
      return BRANCH_DETAILS['00000000-0000-0000-0000-000000000001'];
    }

    // Por defecto y si es Chalma de Guadalupe (o paciente recién registrado)
    return BRANCH_DETAILS['00000000-0000-0000-0000-000000000002'];
  }, [patient, branchDisplay]);

  // Próxima Cita Activa
  const upcomingAppointment = useMemo(() => {
    if (!appointments || appointments.length === 0) return null;
    const now = new Date();
    const future = appointments.filter(a => new Date(a.start_time) >= now && a.status !== 'cancelled');
    return future.length > 0 ? future[0] : appointments[0];
  }, [appointments]);

  // Diagnóstico del diente seleccionado
  const activeToothDiagnosis = useMemo(() => {
    return DEFAULT_DIAGNOSIS_MAP[selectedTooth] || {
      condition: 'healthy',
      label: 'Pieza Sana',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      fillColor: '#10b981',
      treatmentName: 'Esmalte y Dentina en Estado Óptimo',
      appliedDate: 'Revisión Reciente',
      notes: 'Sin presencia de caries activas ni requerimiento operatorio.'
    };
  }, [selectedTooth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1D] flex items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Cargando tu expediente clínico seguro...</p>
        </div>
      </div>
    );
  }

  const patientName = patient?.full_name || user?.user_metadata?.full_name || 'Paciente';

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-white selection:bg-amber-400 selection:text-slate-950 pb-20">
      {/* 1. Header Institucional del Portal - PatientHeader Oficial Limpio y Separado */}
      <header className="w-full bg-[#0d1322] border-b border-gray-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40">
        {/* Identidad de la Clínica */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0 overflow-hidden">
            <AudentiLogo size={28} className="w-7 h-7 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white">AUDENTI CLINICAL</h1>
            <p className="text-xs text-yellow-400 font-medium">Dra. Aura Estudillo • Cédula Profesional 8492019</p>
          </div>
        </div>

        {/* Insignia de Rol y Estado de Sesión */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
            PORTAL DEL PACIENTE
          </span>
          <span className="text-xs text-gray-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sesión activa: <strong className="text-white font-bold">{patient?.full_name || patientName}</strong></span>
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-bold border border-gray-700 transition-all cursor-pointer shadow-xs ml-2"
          >
            <LogOut className="w-3.5 h-3.5 text-amber-400" />
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* 2. Banner Superior de Bioseguridad Clínica */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        {Array.isArray(patient?.allergies_medication) && patient.allergies_medication.length > 0 ? (
          <div className="bg-rose-950/60 border border-rose-500/50 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-rose-300">
                  Alerta Médica de Alergias Reportadas
                </p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {patient.allergies_medication.join(', ')}
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-300 bg-rose-900/30 px-3 py-1.5 rounded-xl border border-rose-500/30 self-stretch sm:self-auto text-center sm:text-right">
              <span className="text-gray-400 text-[10px] block font-bold uppercase">Contacto de Emergencia</span>
              <strong className="text-white">{patient.emergency_contact_name || 'Familiar'}</strong> • {patient.emergency_phone || patient.emergency_contact_phone || 'Sin número'}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Bioseguridad Validada
                </span>
                <p className="text-xs font-bold text-emerald-200">
                  Sin alergias reportadas en cuestionario inicial (Sujeto a verificación clínica presencial)
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-300 flex items-center gap-2">
              <span className="text-gray-400 text-[11px]">Contacto de Emergencia:</span>
              <span className="text-white font-semibold">{patient?.emergency_contact_name || 'Registrado'}</span>
              <span className="text-gray-400">({patient?.emergency_phone || patient?.emergency_contact_phone || patient?.phone || 'Sin teléfono'})</span>
            </div>
          </div>
        )}
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Banner de Bienvenida y Sincronización de Sede */}
        <div className="bg-[#121824] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> Expediente Clínico Protegido (NOM-004-SSA3)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Bienvenido(a), {patientName}
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Tu expediente clínico y seguimiento de diagnóstico se encuentra sincronizado con:{' '}
              <span className="text-amber-400 font-bold">{branchInfo.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={branchInfo.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-xs text-gray-200 border border-gray-700 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Cómo llegar
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </a>
          </div>
        </div>

        {/* 2. Banner de Próxima Cita con Acciones Directas */}
        <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-500/30 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-blue-400 font-black">
              <Calendar className="w-4 h-4 text-blue-400" /> Próxima Cita Médica Programada
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              {upcomingAppointment ? (
                new Date(upcomingAppointment.start_time).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              ) : (
                'Sin citas próximas registradas'
              )}
            </h2>
            <p className="text-xs text-gray-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              Sede: <strong className="text-white">{branchInfo.name}</strong> • {branchInfo.phone}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('audenti_open_communication_widget', {
                  detail: { tab: 'voice' }
                }))
              }}
              className="inline-flex items-center gap-2 bg-[#F59E0B] hover:bg-amber-300 text-slate-950 font-black px-5 py-3 rounded-xl text-sm shadow-lg transition-all active:scale-95 cursor-pointer border border-amber-300"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              Agendar / Reprogramar Cita
            </button>
          </div>
        </div>

        {/* 3. Grid de Salud y Estado Financiero */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tarjeta: Mi Expediente y Bioseguridad */}
          <div className="bg-[#121824] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Mi Expediente &amp; Bioseguridad
              </h3>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Vigente
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-gray-800">
                <p className="text-gray-400 text-[10px] uppercase font-bold">Alergias a Medicamentos / Anestesia</p>
                <p className="text-white font-semibold mt-0.5">
                  {Array.isArray(patient?.allergies_medication) && patient.allergies_medication.length > 0
                    ? patient.allergies_medication.join(', ')
                    : (Array.isArray(patient?.allergies) && patient.allergies.length > 0
                        ? patient.allergies.join(', ')
                        : 'Ninguna reportada')}
                </p>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-gray-800">
                <p className="text-gray-400 text-[10px] uppercase font-bold">Contacto de Emergencia</p>
                <p className="text-white font-semibold mt-0.5">
                  {patient?.emergency_contact_name || 'No especificado'}{' '}
                  <span className="text-gray-400 font-normal">
                    ({patient?.emergency_phone || patient?.emergency_contact_phone || 'Sin teléfono'})
                  </span>
                </p>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-gray-800">
                <p className="text-gray-400 text-[10px] uppercase font-bold">Teléfono Personal Registrado</p>
                <p className="text-white font-semibold mt-0.5">{patient?.phone || 'Sin número registrado'}</p>
              </div>
            </div>
          </div>

          {/* Tarjeta: Estado Financiero y Pagos */}
          <div className="bg-[#121824] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Estado Financiero y Pagos
              </h3>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Al Corriente
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-gradient-to-r from-emerald-950/30 to-slate-900 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Saldo Actual Pendiente</p>
                  <p className="text-2xl font-black text-emerald-400 mt-0.5">$0.00 MXN</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-300 font-bold bg-slate-800 px-2.5 py-1 rounded-lg">
                    Sin adeudos
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-gray-800 space-y-1">
                <p className="text-gray-400 text-[10px] uppercase font-bold">Último Plan de Tratamiento</p>
                <p className="text-white font-semibold">Valoración Integral &amp; Profilaxis Ultrasónica</p>
                <p className="text-[11px] text-gray-400">Liquidado en su totalidad mediante pago digital seguro.</p>
              </div>

              <p className="text-[11px] text-gray-500">
                Aceptamos pagos con tarjeta de débito/crédito, transferencias SPEI y meses sin intereses en tratamientos mayores.
              </p>
            </div>
          </div>
        </div>

        {/* 4. ODONTOGRAMA PERSONAL INTERACTIVO 3D (Modo Consulta / Explicativo) */}
        <PatientOdontogram
          patientData={{
            branch_name: branchInfo.name,
            ...patient
          }}
          selectedTooth={selectedTooth}
          setSelectedTooth={setSelectedTooth}
          diagnosisMap={DEFAULT_DIAGNOSIS_MAP}
        />

        {/* Tarjeta de Detalle de la Pieza Seleccionada */}
        <div className="p-5 bg-[#121824] border border-gray-800 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white">Pieza #{selectedTooth}</span>
              <span className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full border', activeToothDiagnosis.badgeColor)}>
                {activeToothDiagnosis.label}
              </span>
              {activeToothDiagnosis.appliedDate && (
                <span className="text-[11px] text-gray-400 font-medium">({activeToothDiagnosis.appliedDate})</span>
              )}
            </div>
            <p className="text-sm text-amber-300 font-bold">{activeToothDiagnosis.treatmentName}</p>
            <p className="text-xs text-gray-300">{activeToothDiagnosis.notes}</p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-gray-800/60 px-3.5 py-2 rounded-xl border border-gray-700/80 self-stretch sm:self-auto justify-center">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Diagnóstico avalado por la Dra. Aura Estudillo (Solo Lectura)</span>
          </div>
        </div>

        {/* 5. RECETAS MÉDICAS Y RECETARIO DIGITAL (PDFs) */}
        <div className="bg-[#121824] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
            <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4" /> Recetas Médicas &amp; Recetario Digital
            </h3>
            <span className="text-[10px] text-gray-400">Formatos Descargables</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-4 bg-slate-900/60 rounded-xl border border-gray-800 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-bold text-white">Receta_Extraccion_Profilaxis.pdf</p>
                <p className="text-[10px] text-gray-400">Emitida: 17 de Octubre, 2026 • Dra. Aura Estudillo</p>
              </div>
              <a
                href="/dashboard/patients/AUD-4422/print"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </a>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-xl border border-gray-800 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-bold text-white">Constancia_Asistencia_Laboral.pdf</p>
                <p className="text-[10px] text-gray-400">Emitida: 15 de Septiembre, 2026 • Céd. 8492019</p>
              </div>
              <a
                href="/dashboard/patients/AUD-4422/print"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition-all shrink-0 border border-gray-700"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </a>
            </div>
          </div>
        </div>

        {/* 6. ECOSISTEMA UNIFICADO DE COMUNICACIÓN (VOZ AURA IA + CHAT DIRECTO DRA. AURA) */}
        <UnifiedCommunicationWidget
          patient={{
            id: patient?.id,
            full_name: patientName,
            phone: patient?.phone,
            branch_name: branchInfo.name,
            tenant_id: patient?.tenant_id
          }}
        />
      </main>
    </div>
  );
}
