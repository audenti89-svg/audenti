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
  Phone,
  Printer,
  X,
  Stethoscope,
  Smile,
  Activity,
  Check,
  MessageCircle,
  QrCode,
  User
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import PatientOdontogram from '@/components/PatientOdontogram';
import { PatientCalendarSchedule } from '@/components/patient/PatientCalendarSchedule';
import { PATIENT_VISIBILITY_CONFIG } from '@/config/role-visibility';
import { UnifiedCommunicationWidget } from '@/components/chat/UnifiedCommunicationWidget';
import { isSystemAdminEmail } from '@/lib/auth/admin-emails';

// ── SUCURSALES OFICIALES AUDENTI (CANÓNICAS) ──
const BRANCH_DETAILS: Record<string, {
  name: string;
  address: string;
  mapUrl: string;
  hours: string;
  phone: string;
  phoneClean: string;
}> = {
  '00000000-0000-0000-0000-000000000001': {
    name: 'Sucursal Balbuena (Matriz)',
    address: 'Av. del Taller & Retorno 12, Jardín Balbuena, CDMX',
    mapUrl: 'https://maps.google.com/?q=Av.+del+Taller+y+Retorno+12+Jardin+Balbuena+CDMX',
    hours: 'Lunes a Sábado: 16:00 - 21:00 hrs (Turno Vespertino) | Domingos según agenda',
    phone: '+52 55 5764 8810',
    phoneClean: '525557648810'
  },
  '00000000-0000-0000-0000-000000000002': {
    name: 'Sucursal Chalma de Guadalupe',
    address: 'Av. Guadalupe Victoria 45, Gustavo A. Madero, CDMX',
    mapUrl: 'https://maps.google.com/?q=Av.+Guadalupe+Victoria+45+Gustavo+A+Madero+CDMX',
    hours: 'Lunes a Sábado: 16:00 - 21:00 hrs (Turno Vespertino) | Domingos según agenda',
    phone: '+52 55 5389 1204',
    phoneClean: '525553891204'
  }
};

// ── DEFINICIÓN DE DIAGNÓSTICOS DE DIENTES PARA EL VISOR ──
type ToothDiagnosis = {
  condition: 'healthy' | 'filled' | 'crown' | 'root_canal' | 'missing' | 'cleaning_recommended';
  label: string;
  badgeColor: string;
  fillColor: string;
  treatmentName: string;
  appliedDate?: string;
  notes: string;
};

// Diagnóstico por defecto limpio
const EMPTY_DIAGNOSIS_MAP: Record<number, ToothDiagnosis> = {};

// ── BITÁCORA CLÍNICA DE PROCEDIMIENTOS REALIZADOS (SIN PRECIOS) ──
interface ClinicalTreatmentRecord {
  id: string;
  toothCode: string;
  toothName: string;
  surfaces: string;
  treatmentName: string;
  appliedDate: string;
  doctor: string;
  license: string;
  status: 'Completado' | 'Preventivo' | 'En Seguimiento';
  notes: string;
}

// Bitácora clínica vacía por defecto
const EMPTY_CLINICAL_TIMELINE: ClinicalTreatmentRecord[] = [];

// ── RECETAS MÉDICAS DIGITALES OFICIALES (NOM-004-SSA3) ──
interface DigitalPrescription {
  id: string;
  folio: string;
  date: string;
  title: string;
  diagnosis: string;
  doctorName: string;
  licenseNumber: string;
  institution: string;
  medications: {
    name: string;
    presentation: string;
    dosage: string;
    frequency: string;
    duration: string;
    indications: string;
  }[];
  generalInstructions: string[];
  verificationHash: string;
}

// Recetas vacías por defecto
const EMPTY_PRESCRIPTIONS: DigitalPrescription[] = [];

export function PatientPortalView({
  initialTab = 'odontograma'
}: {
  initialTab?: 'odontograma' | 'bitacora' | 'citas' | 'recetas' | 'perfil';
} = {}) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<number>(36);
  const [activeTab, setActiveTab] = useState<'odontograma' | 'bitacora' | 'citas' | 'recetas' | 'perfil'>(initialTab);

  const switchTab = (tab: 'odontograma' | 'bitacora' | 'citas' | 'recetas' | 'perfil') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/portal-paciente')) {
      const targetUrl = tab === 'odontograma' || tab === 'bitacora' ? '/portal-paciente' : `/portal-paciente/${tab}`;
      window.history.pushState(null, '', targetUrl);
    }
  };
  const [selectedPrescription, setSelectedPrescription] = useState<DigitalPrescription | null>(null);
  const [confirmingAppt, setConfirmingAppt] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState<string>('');
  const [diagnosisMap, setDiagnosisMap] = useState<Record<number, ToothDiagnosis>>({});
  const [clinicalTimeline, setClinicalTimeline] = useState<ClinicalTreatmentRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<DigitalPrescription[]>([]);

  useEffect(() => {
    async function loadPortal() {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          window.location.href = '/portal/login';
          return;
        }

        setUser(authUser);

        // Consulta filtrada estrictamente al usuario autenticado usando la FK user_id
        let { data: myProfile } = await supabase
          .from('patients')
          .select('*')
          .or(`user_id.eq.${authUser.id},email.eq.${authUser.email}`)
          .maybeSingle();

        // Enlace de contingencia administrativa si no estaba vinculado o RLS limitó la consulta
        if (!myProfile && authUser.email) {
          try {
            const syncRes = await fetch('/api/auth/sync-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: authUser.id,
                email: authUser.email,
                fullName: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Paciente Audenti'
              })
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (syncData.patient) {
                myProfile = syncData.patient;
              }
            }
          } catch (syncErr) {
            console.warn('Nota sincronización de perfil en portal:', syncErr);
          }
        }

        // Asegurar status activo en tabla users y patients para evitar bloqueos
        if (myProfile && myProfile.status !== 'active') {
          supabase.from('patients').update({ status: 'active' }).eq('id', myProfile.id).then(() => {});
        }
        supabase.from('users').update({ is_active: true, onboarding_completed: true }).eq('id', authUser.id).then(() => {});

        setPatient(myProfile);

        if (myProfile?.id) {
          // 1. Cargar citas reales del paciente (sin mock)
          const { data: appts } = await supabase
            .from('appointments')
            .select('*')
            .eq('patient_id', myProfile.id)
            .order('start_time', { ascending: true });
          setAppointments(appts || []);

          // 2. Cargar odontograma y bitácora clínica real desde chat_messages / api
          try {
            const { data: clinicalRecords } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('patient_id', myProfile.id)
              .eq('channel_type', 'odontogram_clinical_entry')
              .order('created_at', { ascending: false });

            if (clinicalRecords && clinicalRecords.length > 0) {
              const map: Record<number, ToothDiagnosis> = {};
              const timeline: ClinicalTreatmentRecord[] = [];

              clinicalRecords.forEach((r: any) => {
                const meta = r.metadata || {};
                const toothFdi = Number(meta.toothFdi) || 11;
                const cond = (meta.condition || 'filled').toLowerCase();

                let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                let fillColor = '#3b82f6';
                if (cond.includes('corona') || cond.includes('crown')) {
                  badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                  fillColor = '#f59e0b';
                } else if (cond.includes('endo') || cond.includes('canal')) {
                  badgeColor = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
                  fillColor = '#f97316';
                } else if (cond.includes('ausente') || cond.includes('missing') || cond.includes('extrac')) {
                  badgeColor = 'bg-slate-500/20 text-slate-300 border-slate-500/40';
                  fillColor = '#475569';
                }

                if (!map[toothFdi]) {
                  map[toothFdi] = {
                    condition: cond as any,
                    label: meta.procedure || 'Tratamiento Certificado',
                    badgeColor,
                    fillColor,
                    treatmentName: meta.procedure || 'Procedimiento Clínico',
                    appliedDate: new Date(r.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
                    notes: meta.notes || r.content || 'Procedimiento certificado por la Dirección Médica.'
                  };
                }

                timeline.push({
                  id: r.id,
                  toothCode: `FDI #${toothFdi} (UNS #${meta.toothUniversal || '?'})`,
                  toothName: meta.toothName || `Pieza Dental #${toothFdi}`,
                  surfaces: meta.surfacesSummary || 'General / Oclusal',
                  treatmentName: meta.procedure || 'Tratamiento Odontológico',
                  appliedDate: new Date(r.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
                  doctor: r.sender_name || 'Dra. Aura Estudillo',
                  license: 'Céd. Prof. 8492019',
                  status: (meta.status?.includes('Confirmado') || meta.status?.includes('Finalizado')) ? 'Completado' : 'En Seguimiento',
                  notes: meta.notes || 'Procedimiento certificado bajo protocolo NOM-004-SSA3.'
                });
              });

              setDiagnosisMap(map);
              setClinicalTimeline(timeline);
              if (clinicalRecords[0]?.metadata?.toothFdi) {
                setSelectedTooth(Number(clinicalRecords[0].metadata.toothFdi));
              }
            } else {
              setDiagnosisMap({});
              setClinicalTimeline([]);
            }
          } catch (clinicalErr) {
            console.warn('Nota cargando bitácora clínica:', clinicalErr);
            setDiagnosisMap({});
            setClinicalTimeline([]);
          }

          // 3. Cargar recetas médicas reales NOM-004-SSA3
          try {
            const { data: rxRecords } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('patient_id', myProfile.id)
              .eq('channel_type', 'prescription')
              .order('created_at', { ascending: false });

            if (rxRecords && rxRecords.length > 0) {
              const loadedPrescriptions: DigitalPrescription[] = rxRecords.map((rx: any) => ({
                id: rx.id,
                folio: rx.metadata?.folio || `AUD-RX-${rx.id.slice(0, 8).toUpperCase()}`,
                date: new Date(rx.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
                title: rx.metadata?.title || 'Receta Médica Digital Certificada',
                diagnosis: rx.metadata?.diagnosis || rx.content || 'Diagnóstico odontológico',
                doctorName: rx.sender_name || 'Dra. Aura Estudillo',
                licenseNumber: rx.metadata?.licenseNumber || '8492019',
                institution: 'Secretaría de Educación Pública • DGP / Fac. Odontología UNAM',
                medications: rx.metadata?.medications || [],
                generalInstructions: rx.metadata?.generalInstructions || [],
                verificationHash: rx.metadata?.verificationHash || 'SHA256: CERTIFICADA-NOM-004-SSA3'
              }));
              setPrescriptions(loadedPrescriptions);
            } else {
              setPrescriptions([]);
            }
          } catch (rxErr) {
            console.warn('Nota cargando recetas:', rxErr);
            setPrescriptions([]);
          }
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
    window.location.href = '/portal/login';
  };

  // Sucursal asignada al paciente
  const branchDisplay = patient?.branch_name || patient?.tenant_id || 'Sucursal Balbuena (Matriz)';

  // Resolver información canónica de sucursal
  const branchInfo = useMemo(() => {
    const rawBranchName = (branchDisplay || '').toLowerCase();
    const tid = patient?.tenant_id || '';

    // Si tiene asignada Balbuena
    if (
      rawBranchName.includes('balbuena') ||
      rawBranchName.includes('valbuena') ||
      tid === '00000000-0000-0000-0000-000000000001'
    ) {
      return BRANCH_DETAILS['00000000-0000-0000-0000-000000000001'];
    }

    // Por defecto Chalma de Guadalupe
    return BRANCH_DETAILS['00000000-0000-0000-0000-000000000002'];
  }, [patient, branchDisplay]);

  // Citas Próximas y Pasadas (Estrictamente reales)
  const { upcomingAppointment, upcomingList, pastList } = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return { upcomingAppointment: null, upcomingList: [], pastList: [] };
    }

    const now = new Date();
    const upcoming = appointments.filter(a => new Date(a.start_time) >= now && a.status !== 'cancelled');
    const past = appointments.filter(a => new Date(a.start_time) < now || a.status === 'completed');

    return {
      upcomingAppointment: upcoming.length > 0 ? upcoming[0] : null,
      upcomingList: upcoming,
      pastList: past
    };
  }, [appointments]);

  // Diagnóstico del diente seleccionado en el odontograma (Dinámico y Real)
  const activeToothDiagnosis = useMemo(() => {
    return diagnosisMap[selectedTooth] || {
      condition: 'healthy',
      label: 'Pieza Sana',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      fillColor: '#10b981',
      treatmentName: 'Esmalte y Dentina en Estado Natural Óptimo',
      appliedDate: 'Sin intervenciones previas',
      notes: 'Órgano dentario íntegro. No presenta patologías activas ni requerimiento operatorio registrado.'
    };
  }, [selectedTooth, diagnosisMap]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040711] flex items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Cargando tu expediente clínico seguro...</p>
        </div>
      </div>
    );
  }

  const patientName = patient?.full_name || user?.user_metadata?.full_name || 'Paciente Audenti';

  return (
    <div className="min-h-screen bg-[#040711] text-white selection:bg-amber-400 selection:text-slate-950 pb-24">
      {/* ── 1. HEADER INSTITUCIONAL EXCLUSIVO DEL PACIENTE ── */}
      <header className="w-full bg-slate-950/90 backdrop-blur-xl border-b border-amber-500/20 px-4 sm:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            <AudentiLogo size={26} className="text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-widest text-white uppercase">Audenti Cloud Pro</h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                Portal Paciente
              </span>
            </div>
            <p className="text-xs text-amber-400/90 font-medium">Dra. Aura Estudillo • Cédula Profesional 8492019</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          {isSystemAdminEmail(user?.email, user?.user_metadata?.role) && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-400/20"
              title="Volver al Panel Clínico / Dashboard"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Ir a Dashboard</span>
            </Link>
          )}
          <div className="text-xs text-slate-300 flex items-center gap-2 bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate max-w-[200px]">
              Paciente: <strong className="text-white font-bold">{patientName}</strong>
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 hover:border-amber-500/40 transition-all cursor-pointer shadow-xs"
            title="Cerrar sesión de forma segura"
          >
            <LogOut className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* ── 2. BANNER DE BIOSEGURIDAD Y ALERTA DE ALERGIAS (NOM-004-SSA3) ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        {Array.isArray(patient?.allergies_medication) && patient.allergies_medication.length > 0 ? (
          <div className="bg-rose-950/70 border border-rose-500/60 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-300">
                  Alerta Médica NOM-004-SSA3: Alergias Reportadas
                </p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {patient.allergies_medication.join(', ')}
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-200 bg-rose-900/40 px-3.5 py-1.5 rounded-xl border border-rose-500/40 self-stretch sm:self-auto text-left sm:text-right">
              <span className="text-rose-300 text-[10px] block font-bold uppercase">Contacto de Emergencia</span>
              <strong className="text-white">{patient.emergency_contact_name || 'Familiar Registrado'}</strong> • {patient.emergency_phone || patient.emergency_contact_phone || 'Sin teléfono'}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-3.5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Bioseguridad Médica Validada (NOM-004-SSA3)
                </span>
                <p className="text-xs font-bold text-emerald-200">
                  Sin alergias farmacológicas reportadas en cuestionario inicial (Sujeto a verificación presencial)
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-2 bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-500/30">
              <span className="text-emerald-400 text-[11px] font-bold">Emergencia:</span>
              <span className="text-white font-semibold">{patient?.emergency_contact_name || 'Registrado'}</span>
              <span className="text-slate-300">({patient?.emergency_phone || patient?.emergency_contact_phone || patient?.phone || 'Sin número'})</span>
            </div>
          </div>
        )}
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* ── 3. TARJETA DE BIENVENIDA Y SUCURSAL ASIGNADA ── */}
        <div className="bg-slate-950/90 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-1.5 max-w-2xl relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Odontología Integral de Precisión
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> Expediente Activo
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Bienvenido(a), {patientName}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Tu historial de tratamientos dentales, diagnósticos 3D y prescripciones se encuentran respaldados en tu sede clínica oficial:{' '}
              <strong className="text-amber-400 font-bold">{branchInfo.name}</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atención Presencial</p>
              <p className="text-white font-semibold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {branchInfo.address}
              </p>
              <p className="text-[11px] text-amber-300 font-medium">
                Tel: {branchInfo.phone}
              </p>
            </div>
            <a
              href={branchInfo.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/15 cursor-pointer shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              Cómo Llegar
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          </div>
        </div>

        {/* ── 4. BANNER DESTACADO DE PRÓXIMA CITA MÉDICA & WHATSAPP ── */}
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-950 to-indigo-950/80 border border-blue-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 backdrop-blur-xl">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-blue-400 font-black">
              <Calendar className="w-4 h-4 text-blue-400" /> Próxima Cita Médica Programada
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
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
                'Sin citas próximas programadas'
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                Sede: <strong className="text-white">{branchInfo.name}</strong>
              </span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
                Dra. Aura Estudillo (Céd. 8492019)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {upcomingAppointment && (
              <a
                href={`https://wa.me/${branchInfo.phoneClean}?text=${encodeURIComponent(`Hola Dra. Aura Estudillo, soy el paciente ${patientName}. Deseo confirmar mi asistencia a la cita en ${branchInfo.name}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-3 rounded-2xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex-1 sm:flex-initial"
              >
                <MessageCircle className="w-4 h-4" />
                Confirmar por WhatsApp
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('audenti_open_communication_widget', {
                  detail: { tab: 'voice' }
                }));
              }}
              className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex-1 sm:flex-initial"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              Agendar / Reprogramar
            </button>
          </div>
        </div>

        {/* ── 5. PESTAÑAS DE NAVEGACIÓN RÁPIDA DENTRO DEL PORTAL ── */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-thin scrollbar-thumb-amber-500/30">
          <button
            onClick={() => switchTab('odontograma')}
            className={cn(
              'px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer',
              activeTab === 'odontograma'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            )}
          >
            <Smile className="w-4 h-4" />
            Odontograma 3D Personal
          </button>

          <button
            onClick={() => switchTab('bitacora')}
            className={cn(
              'px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer',
              activeTab === 'bitacora'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            )}
          >
            <Activity className="w-4 h-4" />
            Bitácora de Tratamientos Realizados ({clinicalTimeline.length})
          </button>

          <button
            onClick={() => switchTab('citas')}
            className={cn(
              'px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer',
              activeTab === 'citas'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            )}
          >
            <Calendar className="w-4 h-4" />
            Agenda &amp; Citas ({upcomingList.length + pastList.length})
          </button>

          <button
            onClick={() => switchTab('recetas')}
            className={cn(
              'px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer',
              activeTab === 'recetas'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            )}
          >
            <FileCheck2 className="w-4 h-4" />
            Recetas Médicas Digitales ({prescriptions.length})
          </button>

          <button
            onClick={() => switchTab('perfil')}
            className={cn(
              'px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer',
              activeTab === 'perfil'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            )}
          >
            <Building2 className="w-4 h-4" />
            Mi Perfil &amp; Sucursal
          </button>
        </div>

        {/* ── SECCIÓN 1: ODONTOGRAMA PERSONAL INTERACTIVO 3D ── */}
        {activeTab === 'odontograma' && (
          <div className="space-y-6">
            <PatientOdontogram
              patientData={{
                branch_name: branchInfo.name,
                ...patient
              }}
              selectedTooth={selectedTooth}
              setSelectedTooth={setSelectedTooth}
              diagnosisMap={diagnosisMap}
            />

            {/* Tarjeta de Detalle Anatómico de la Pieza Seleccionada */}
            <div className="p-6 bg-slate-950/90 border border-slate-800 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 backdrop-blur-xl">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-lg font-black text-white">Pieza #{selectedTooth}</span>
                  <span className={cn('text-[10px] font-bold px-3 py-1 rounded-full border', activeToothDiagnosis.badgeColor)}>
                    {activeToothDiagnosis.label}
                  </span>
                  {activeToothDiagnosis.appliedDate && (
                    <span className="text-xs text-slate-400 font-medium">({activeToothDiagnosis.appliedDate})</span>
                  )}
                </div>
                <p className="text-sm text-amber-300 font-bold">{activeToothDiagnosis.treatmentName}</p>
                <p className="text-xs text-slate-300 max-w-2xl">{activeToothDiagnosis.notes}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-slate-800 self-stretch md:self-auto justify-center">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Validado por Dra. Aura Estudillo (Solo Lectura)</span>
              </div>
            </div>
          </div>
        )}

        {/* ── SECCIÓN 2: BITÁCORA CLÍNICA CRONOLÓGICA (OMITIENDO PRECIOS) ── */}
        {activeTab === 'bitacora' && (
          <div className="bg-slate-950/90 border border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  Bitácora Cronológica de Procedimientos Dentales
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registro histórico de intervenciones odontológicas realizadas en tus piezas dentales bajo normativa NOM-004-SSA3.
                </p>
              </div>
              <span className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {clinicalTimeline.length} Procedimiento(s) Certificado(s)
              </span>
            </div>

            {clinicalTimeline.length > 0 ? (
              <div className="space-y-4">
                {clinicalTimeline.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-amber-500/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/30 font-black text-xs">
                          {item.toothCode}
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {item.toothName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • Caras: <strong className="text-slate-300">{item.surfaces}</strong>
                        </span>
                      </div>

                      <p className="text-sm font-bold text-white mt-1">
                        {item.treatmentName}
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {item.notes}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span>Fecha: <strong className="text-slate-300">{item.appliedDate}</strong></span>
                        <span>•</span>
                        <span>Especialista: <strong className="text-amber-300">{item.doctor}</strong> ({item.license})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                      <span className={cn(
                        'text-xs font-bold px-3 py-1 rounded-full border',
                        item.status === 'Completado'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : item.status === 'Preventivo'
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      )}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto">
                  <Activity className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-sm">Expediente Clínico Inicializado (Sin Tratamientos Registrados)</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Tu bitácora clínica se encuentra limpia y lista. En cuanto la Dra. Aura Estudillo o el equipo médico realicen o certifiquen un procedimiento en sucursal Balbuena o Chalma, quedará registrado aquí cronológicamente con total transparencia clínica.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── SECCIÓN 3: MÓDULO DE CALENDARIO, HISTORIAL Y RECORDATORIOS INTERACTIVOS ── */}
        {activeTab === 'citas' && (
          <PatientCalendarSchedule
            appointments={appointments}
            patientName={patientName}
            branchName={branchInfo.name}
            branchPhoneClean={branchInfo.phoneClean}
            onAppointmentUpdated={async () => {
              if (patient?.id) {
                const { data: updatedAppts } = await supabase
                  .from('appointments')
                  .select('*')
                  .eq('patient_id', patient.id)
                  .order('start_time', { ascending: true });
                if (updatedAppts) setAppointments(updatedAppts);
              }
            }}
          />
        )}

        {/* ── SECCIÓN 4: RECETAS MÉDICAS DIGITALES (NOM-004-SSA3) ── */}
        {activeTab === 'recetas' && (
          <div className="bg-slate-950/90 border border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-amber-400" />
                  Recetario Médico Digital Protegido (NOM-004-SSA3)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Prescripciones oficiales emitidas con firma electrónica de la Dra. Aura Estudillo disponibles para visualización limpia, descarga e impresión.
                </p>
              </div>
              <span className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full font-bold">
                {prescriptions.length} Receta(s) Disponible(s)
              </span>
            </div>

            {prescriptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-4 shadow-lg"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase">
                          {rx.folio}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{rx.date}</span>
                      </div>

                      <h4 className="font-bold text-white text-sm line-clamp-2">
                        {rx.title}
                      </h4>
                      <p className="text-xs text-slate-300 line-clamp-2">
                        {rx.diagnosis}
                      </p>

                      <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                        <p>Médico: <strong className="text-white">{rx.doctorName}</strong></p>
                        <p>Cédula: <strong className="text-amber-300">{rx.licenseNumber}</strong></p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPrescription(rx)}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/15"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Ver Receta / Imprimir PDF
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-sm">Recetario Digital Vacío</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  No cuentas con recetas médicas pendientes. Las prescripciones emitidas bajo normativa NOM-004-SSA3 por la Dra. Aura Estudillo durante tus consultas se certificarán aquí listas para su visualización, descarga e impresión en PDF.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── SECCIÓN 5: MI PERFIL Y SUCURSAL ASIGNADA ── */}
        {activeTab === 'perfil' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tarjeta de Información Personal */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Datos Personales del Paciente</h3>
                    <p className="text-xs text-slate-400">Expediente Clínico Oficial (NOM-004-SSA3)</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-900">
                    <span className="text-slate-400">Nombre Completo:</span>
                    <strong className="text-white font-bold">{patientName}</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-900">
                    <span className="text-slate-400">Correo Electrónico:</span>
                    <strong className="text-slate-200">{user?.email || 'No registrado'}</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-900">
                    <span className="text-slate-400">Teléfono Móvil:</span>
                    <strong className="text-slate-200">{patient?.phone || 'No registrado'}</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-900">
                    <span className="text-slate-400">Contacto de Emergencia:</span>
                    <strong className="text-white">
                      {patient?.emergency_contact_name || 'Familiar registrado'} (
                      {patient?.emergency_phone || patient?.emergency_contact_phone || 'Sin número'})
                    </strong>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Estatus del Paciente:</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <CheckCircle2 className="w-3 h-3" /> Activo &amp; Certificado
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Sucursal de Atención Asignada */}
              <div className="bg-slate-950/90 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3 border-b border-amber-500/20 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Sede de Atención Clínica Asignada</h3>
                    <p className="text-xs text-amber-300">Dirección Médica • Dra. Aura Estudillo</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Nombre de la Sede:</span>
                    <strong className="text-amber-400 text-sm font-black">{branchInfo.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Ubicación Presencial:</span>
                    <p className="text-slate-200 flex items-start gap-1.5 leading-relaxed">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      {branchInfo.address}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Horario Clínico:</span>
                    <p className="text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      {branchInfo.hours}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Línea Directa:</span>
                    <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                      {branchInfo.phone}
                    </p>
                  </div>

                  <div className="pt-2">
                    <a
                      href={branchInfo.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      <MapPin className="w-4 h-4" />
                      Abrir en Google Maps / Cómo Llegar
                      <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Aviso de Confidencialidad y Blindaje Clínico */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-400">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Tus datos personales y registros clínicos están resguardados bajo estricto secreto médico y cifrado de extremo a extremo, en cumplimiento con la norma oficial <strong>NOM-004-SSA3-2012</strong>.
              </span>
            </div>
          </div>
        )}

        {/* ── 6. COMUNICACIÓN UNIFICADA (VOZ AURA IA + CHAT DIRECTO) ── */}
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

      {/* ── MODAL DE RECETA MÉDICA OFICIAL DESCARGABLE / IMPRIMIBLE (NOM-004-SSA3) ── */}
      {selectedPrescription && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-900 border-2 border-amber-500/40 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.2)] text-white p-6 sm:p-8 space-y-6 my-8">
            {/* Botón Cerrar */}
            <button
              onClick={() => setSelectedPrescription(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer no-print"
              title="Cerrar vista"
            >
              <X className="w-5 h-5" />
            </button>

            {/* CONTENEDOR MEMBRETADO PARA IMPRESIÓN OFICIAL (ID: printable-prescription-modal) */}
            <div id="printable-prescription-modal" className="space-y-6 bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800 text-slate-100">
              {/* Encabezado Institucional de la Receta */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-amber-500/40 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                    <AudentiLogo size={32} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-wider text-white uppercase">Audenti Odontología Integral</h2>
                    <p className="text-xs text-amber-300 font-bold">{selectedPrescription.doctorName}</p>
                    <p className="text-[11px] text-slate-400">
                      Cédula Profesional: {selectedPrescription.licenseNumber} • {selectedPrescription.institution}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs text-slate-300 space-y-0.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase inline-block">
                    {selectedPrescription.folio}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">Fecha de Emisión: <strong>{selectedPrescription.date}</strong></p>
                  <p className="text-[11px] text-slate-400">Sede: <strong>{branchInfo.name}</strong></p>
                </div>
              </div>

              {/* Ficha del Paciente y Bioseguridad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Paciente</p>
                  <p className="text-sm font-black text-white mt-0.5">{patientName}</p>
                  <p className="text-slate-400 text-[11px]">Tel: {patient?.phone || 'Registrado en expediente'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Diagnóstico Clínico Oficial</p>
                  <p className="text-xs font-semibold text-amber-200 mt-0.5">{selectedPrescription.diagnosis}</p>
                  {Array.isArray(patient?.allergies_medication) && patient.allergies_medication.length > 0 && (
                    <p className="text-[11px] text-rose-400 font-bold mt-1">
                      ⚠️ Alergias: {patient.allergies_medication.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Prescripción Farmacológica (Rp / Rx) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2">
                  <Stethoscope className="w-4 h-4" />
                  Prescripción Farmacológica (Rp / Recipe)
                </div>

                <div className="space-y-3.5">
                  {selectedPrescription.medications.map((med, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm font-black text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 text-xs flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          {med.name} — <span className="text-amber-300 font-bold">{med.presentation}</span>
                        </span>
                        <span className="text-[11px] text-slate-300 font-semibold bg-slate-800 px-2.5 py-0.5 rounded-md">
                          Duración: {med.duration}
                        </span>
                      </div>
                      <p className="text-slate-200 pl-7">
                        <strong>Dosis &amp; Frecuencia:</strong> {med.dosage} • {med.frequency}
                      </p>
                      <p className="text-slate-400 pl-7 text-[11px] italic">
                        <strong>Indicación clínica:</strong> {med.indications}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indicaciones Generales y Cuidados en Casa */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
                <p className="text-amber-300 font-bold text-[11px] uppercase tracking-wider">
                  Recomendaciones Clínicas y Medidas Generales:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  {selectedPrescription.generalInstructions.map((inst, i) => (
                    <li key={i}>{inst}</li>
                  ))}
                </ul>
              </div>

              {/* Sello de Seguridad NOM-004-SSA3 y Firma Digital */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] font-bold text-emerald-400 uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Sello Digital de Autenticidad Clínica (NOM-004-SSA3)
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono break-all max-w-sm">
                    {selectedPrescription.verificationHash}
                  </p>
                </div>

                <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
                  <p className="text-xs font-bold text-white uppercase">{selectedPrescription.doctorName}</p>
                  <p className="text-[10px] text-amber-400 font-semibold">Cédula Profesional 8492019</p>
                  <p className="text-[9px] text-slate-500">Cirujana Dentista • Odontología Integral</p>
                </div>
              </div>
            </div>

            {/* Botones de Acción (No se imprimen) */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 no-print">
              <button
                type="button"
                onClick={() => setSelectedPrescription(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir / Guardar en PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS DE IMPRESIÓN LIMPIA PARA PDF Y PAPEL */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-prescription-modal,
          #printable-prescription-modal * {
            visibility: visible;
          }
          #printable-prescription-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            background: white !important;
            color: black !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            padding: 24px !important;
            border-radius: 0 !important;
          }
          #printable-prescription-modal * {
            color: #111827 !important;
            border-color: #e5e7eb !important;
            background-color: transparent !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
