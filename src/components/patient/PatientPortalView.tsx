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
  Activity,
  Check,
  MessageCircle,
  QrCode,
  User,
  Users,
  Bell,
  CalendarCheck,
  AlertCircle,
  UserCheck,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { isSystemAdminEmail, isInternalUser } from '@/lib/auth/admin-emails';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PatientCalendarSchedule } from '@/components/patient/PatientCalendarSchedule';
import { PatientAppointmentNotifications } from '@/components/patient/PatientAppointmentNotifications';
import { AudentiVoiceAssistantCard } from '@/components/ai/AudentiVoiceAssistantCard';
import { PatientSpeechContext } from '@/lib/assistantSpeech';
import { PATIENT_VISIBILITY_CONFIG } from '@/config/role-visibility';
import { UnifiedCommunicationWidget } from '@/components/chat/UnifiedCommunicationWidget';
import { InformedConsentSignModal } from '@/components/clinical/InformedConsentSignModal';
import { evalAllergyStatus } from '@/components/clinical/ClinicalRiskSemaphore';

// ── SUCURSALES OFICIALES AUDENTI (CANÓNICAS) ──
const BRANCH_DETAILS: Record<string, {
  name: string;
  phoneClean: string;
}> = {
  '00000000-0000-0000-0000-000000000001': {
    name: 'Sede Matriz — Jardín Balbuena',
    phoneClean: '525522427769'
  },
  '00000000-0000-0000-0000-000000000002': {
    name: 'Sede Norte — Chalma de Guadalupe',
    phoneClean: '525566068975'
  }
};

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
  initialTab = 'citas'
}: {
  initialTab?: 'citas' | 'perfil' | 'recetas' | 'bitacora' | 'odontograma';
} = {}) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'citas' | 'perfil' | 'recetas' | 'bitacora'>(
    initialTab === 'odontograma' ? 'citas' : (initialTab as any)
  );

  const switchTab = (tab: 'citas' | 'perfil' | 'recetas' | 'bitacora') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/portal-paciente')) {
      const targetUrl = tab === 'citas' ? '/portal-paciente' : `/portal-paciente/${tab}`;
      window.history.pushState(null, '', targetUrl);
    }
  };
  const [selectedPrescription, setSelectedPrescription] = useState<DigitalPrescription | null>(null);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [confirmingAppt, setConfirmingAppt] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState<string>('');
  const [clinicalTimeline, setClinicalTimeline] = useState<ClinicalTreatmentRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<DigitalPrescription[]>([]);

  // Estados para confirmación directa de cita (WhatsApp sin login obligatorio)
  const [guestAppointment, setGuestAppointment] = useState<any | null>(null);
  const [guestConfirmSuccess, setGuestConfirmSuccess] = useState(false);
  const [guestConfirming, setGuestConfirming] = useState(false);
  const [guestPhoneInput, setGuestPhoneInput] = useState('');
  const [guestLoginLoading, setGuestLoginLoading] = useState(false);
  const [guestLoginError, setGuestLoginError] = useState('');

  // Estados de Registro Completo & Asignación de Sucursal
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    birthDate: '',
    branchName: 'Sucursal Balbuena',
    branchId: '00000000-0000-0000-0000-000000000001',
    acquisitionChannel: 'referral' as 'referral' | 'qr',
    referrerName: ''
  });

  // Reloj en vivo para reevaluar la caducidad exacta de 65 minutos (1h 5m) cada 15 segundos
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Función atómica y segura para cargar datos del paciente
  const fetchPatientData = async (authUser: any) => {
    try {
      const userEmail = (authUser.email || '').trim().toLowerCase();
      let { data: myProfile } = await supabase
        .from('patients')
        .select('*')
        .or(`user_id.eq.${authUser.id}${userEmail ? `,email.eq.${userEmail}` : ''}`)
        .maybeSingle();

      const isDocOrAdmin = 
        userEmail === 'audenti89@gmail.com' || 
        isSystemAdminEmail(userEmail) ||
        isInternalUser(userEmail, authUser.user_metadata?.role || '');

      if (!myProfile && isDocOrAdmin) {
        myProfile = {
          id: '00000000-0000-0000-0000-000000000001',
          user_id: authUser.id,
          full_name: authUser.user_metadata?.full_name || 'Dra. Aura Estudillo (Vista Médica)',
          phone: '5522427769',
          email: userEmail,
          branch_name: 'Sucursal Balbuena (Matriz)',
          tenant_id: '00000000-0000-0000-0000-000000000001',
          status: 'active'
        };
      }

      if (!myProfile && userEmail) {
        try {
          const syncRes = await fetch('/api/auth/sync-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: authUser.id,
              email: userEmail,
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

      setPatient(myProfile);

      // Inicializar formulario de perfil completo, sucursal y canal de adquisición
      const rawBranch = myProfile?.branch || myProfile?.branch_name || '';
      const isChalmaBranch = rawBranch.toLowerCase().includes('chalma') || (myProfile?.tenant_id === '00000000-0000-0000-0000-000000000002');
      const rawChannel = (myProfile?.acquisition_channel || '').toLowerCase();
      const initChannel: 'referral' | 'qr' = rawChannel.includes('qr') ? 'qr' : 'referral';

      setProfileForm({
        fullName: myProfile?.full_name || authUser?.user_metadata?.full_name || '',
        phone: myProfile?.phone || '',
        birthDate: myProfile?.birth_date ? myProfile.birth_date.split('T')[0] : '',
        branchName: isChalmaBranch ? 'Sucursal Chalma de Guadalupe' : 'Sucursal Balbuena',
        branchId: isChalmaBranch ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001',
        acquisitionChannel: initChannel,
        referrerName: myProfile?.referrer_name || ''
      });

      if (myProfile?.id) {
        // 1. Cargar citas reales del paciente
        let realAppts: any[] = [];
        try {
          const res = await fetch('/api/appointments');
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.appointments)) {
              realAppts = json.appointments;
            }
          }
        } catch {}

        if (realAppts.length === 0) {
          try {
            const { data: appts } = await supabase
              .from('appointments')
              .select('*')
              .or(`patient_id.eq.${myProfile.id},phone.ilike.%${(myProfile.phone || '').replace(/\D/g, '').slice(-10)}%`)
              .order('starts_at', { ascending: true });
            if (appts && appts.length > 0) {
              realAppts = appts;
            }
          } catch {}
        }
        setAppointments(realAppts);

        // 2. Cargar odontograma y bitácora clínica real desde chat_messages
        try {
          const { data: clinicalRecords } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('patient_id', myProfile.id)
            .eq('channel_type', 'odontogram_clinical_entry')
            .order('created_at', { ascending: false });

          if (clinicalRecords && clinicalRecords.length > 0) {
            const timeline: ClinicalTreatmentRecord[] = [];
            clinicalRecords.forEach((r: any) => {
              const meta = r.metadata || {};
              const toothFdi = Number(meta.toothFdi) || 11;

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
            setClinicalTimeline(timeline);
          } else {
            setClinicalTimeline([]);
          }
        } catch (clinicalErr) {
          console.warn('Nota cargando bitácora clínica:', clinicalErr);
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
      console.error('Error cargando datos del paciente:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        setLoading(true);

        // 1. Obtener usuario de la sesión actual
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          if (!isMounted) return;
          setUser(authUser);
          await fetchPatientData(authUser);

          // Limpiar hash de access_token de forma segura de la barra de direcciones
          if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
            const cleanUrl = window.location.pathname + window.location.search;
            window.history.replaceState(null, '', cleanUrl);
          }
          return;
        }

        // 2. Si no hay usuario pero el hash tiene access_token, permitir que Supabase lo capture o establecerlo explícitamente
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          try {
            const hashRaw = window.location.hash.replace(/^#/, '');
            const hashParams = new URLSearchParams(hashRaw);
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken) {
              const { data: setSessionData, error: setSessionErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              });

              if (!setSessionErr && setSessionData?.session?.user) {
                if (!isMounted) return;
                setUser(setSessionData.session.user);
                await fetchPatientData(setSessionData.session.user);
                const cleanUrl = window.location.pathname + window.location.search;
                window.history.replaceState(null, '', cleanUrl);
                return;
              }
            }
          } catch (tokenParseErr) {
            console.warn('Nota al procesar token del hash:', tokenParseErr);
          }

          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session?.user) {
            if (!isMounted) return;
            setUser(sessionData.session.user);
            await fetchPatientData(sessionData.session.user);
            const cleanUrl = window.location.pathname + window.location.search;
            window.history.replaceState(null, '', cleanUrl);
            return;
          }

          // Si el token era inválido o caducó, limpiar el hash residual para evitar bucles
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, '', cleanUrl);
        }

        // 3. Parámetros especiales de acceso (confirmAppt o phone)
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const confirmParam = params.get('confirmAppt');
          const phoneParam = params.get('phone');

          if (confirmParam) {
            try {
              const apptResp = await fetch(`/api/appointments?id=${encodeURIComponent(confirmParam)}`);
              if (apptResp.ok) {
                const apptJson = await apptResp.json();
                if (apptJson.success && apptJson.appointment) {
                  if (isMounted) {
                    setGuestAppointment(apptJson.appointment);
                    if (apptJson.appointment.attendance_confirmed) {
                      setGuestConfirmSuccess(true);
                    }
                    if (apptJson.appointment.patient_phone) {
                      setGuestPhoneInput(apptJson.appointment.patient_phone.replace(/\D/g, '').slice(-10));
                    }
                    setLoading(false);
                  }
                  return;
                }
              }
            } catch (apptErr) {
              console.warn('Nota cargando cita por folio:', apptErr);
            }
          }

          if (phoneParam) {
            try {
              const autoResp = await fetch('/api/auth/patient-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phoneOrEmail: phoneParam,
                  redirectUrl: window.location.href
                })
              });
              const autoJson = await autoResp.json();
              if (autoJson.ok && autoJson.hashedToken) {
                const { error: otpErr } = await supabase.auth.verifyOtp({
                  token_hash: autoJson.hashedToken,
                  type: 'magiclink'
                });
                if (!otpErr) {
                  const { data: { user: verifiedUser } } = await supabase.auth.getUser();
                  if (verifiedUser && isMounted) {
                    setUser(verifiedUser);
                    await fetchPatientData(verifiedUser);
                    return;
                  }
                }
              }
              if (autoJson.ok && autoJson.actionLink) {
                window.location.href = autoJson.actionLink;
                return;
              }
            } catch (autoErr) {
              console.warn('Nota auto-acceso por celular:', autoErr);
            }
          }
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error inicializando autenticación:', err);
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // 4. Suscripción a cambios de sesión (ej. cuando se procesa el magic link hash)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          setUser(session.user);
          await fetchPatientData(session.user);
          if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
            const cleanUrl = window.location.pathname + window.location.search;
            window.history.replaceState(null, '', cleanUrl);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setPatient(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('audenti_patient_cache');
    } catch {}
    await supabase.auth.signOut();
    window.location.href = '/portal/login';
  };

  // Sucursal asignada al paciente
  const branchDisplay = patient?.branch || patient?.branch_name || patient?.tenant_id || 'Sucursal Balbuena';

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

  // ── EVALUACIÓN DE REGISTRO COMPLETO (RECORDATORIO NOM-004-SSA3) ──
  const registrationEvaluation = useMemo(() => {
    const hasName = Boolean(patient?.full_name && patient?.full_name.trim() !== 'Paciente Audenti' && patient?.full_name.trim().length >= 3);
    const hasPhone = Boolean(patient?.phone && patient?.phone.replace(/\D/g, '').length >= 10);
    const hasBirthDate = Boolean(patient?.birth_date);
    const hasExplicitBranch = Boolean(patient?.branch_name);
    const hasReferral = Boolean(
      (patient?.acquisition_channel === 'qr') ||
      (patient?.acquisition_channel === 'referral' && patient?.referrer_name) ||
      patient?.referrer_name
    );

    const checks = [
      { key: 'name', label: 'Nombre Completo', done: hasName, missingHint: 'Nombre completo oficial' },
      { key: 'phone', label: 'Teléfono Celular', done: hasPhone, missingHint: 'Celular a 10 dígitos (recordatorios 24h & 1h)' },
      { key: 'branch', label: 'Sucursal Asignada', done: hasExplicitBranch, missingHint: 'Sucursal de atención (Balbuena o Chalma)' },
      { key: 'birthDate', label: 'Fecha de Nacimiento', done: hasBirthDate, missingHint: 'Fecha de nacimiento (edad clínica)' },
      { key: 'referral', label: '¿Quién te recomendó?', done: hasReferral, missingHint: '¿Quién te recomendó o si vienes por Código QR?' }
    ];

    const completedCount = checks.filter(c => c.done).length;
    const percentage = Math.round((completedCount / checks.length) * 100);
    const isComplete = percentage === 100;
    const missingItems = checks.filter(c => !c.done);

    return {
      percentage,
      isComplete,
      missingItems,
      checks
    };
  }, [patient]);

  // Edad calculada en vivo para el modal
  const calculatedAge = useMemo(() => {
    if (!profileForm.birthDate) return null;
    const bDate = new Date(profileForm.birthDate);
    if (isNaN(bDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - bDate.getFullYear();
    const m = today.getMonth() - bDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [profileForm.birthDate]);

  // Guardar datos de perfil, sucursal y recomendación
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (profileForm.acquisitionChannel === 'referral' && !profileForm.referrerName.trim()) {
      alert('Por favor indica quién te recomendó (nombre del familiar, amigo o doctor).');
      return;
    }
    setSavingProfile(true);
    setEditSuccessMsg('');
    try {
      const resp = await fetch('/api/auth/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          fullName: profileForm.fullName.trim(),
          phone: profileForm.phone.replace(/\D/g, '').slice(-10),
          birthDate: profileForm.birthDate || null,
          branchName: profileForm.branchName,
          branchId: profileForm.branchId,
          acquisitionChannel: profileForm.acquisitionChannel,
          referrerName: profileForm.acquisitionChannel === 'referral' ? profileForm.referrerName.trim() : 'Código QR en Clínica',
          qrCodeSource: profileForm.acquisitionChannel === 'qr' ? 'folleto_clinica' : null
        })
      });

      const resData = await resp.json();
      if (!resp.ok) {
        throw new Error(resData?.error || 'No se pudo guardar la información en el servidor.');
      }

      if (resData.patient) {
        setPatient(resData.patient);
      } else {
        setPatient((prev: any) => ({
          ...prev,
          full_name: profileForm.fullName.trim(),
          phone: profileForm.phone.replace(/\D/g, '').slice(-10),
          birth_date: profileForm.birthDate,
          branch_name: profileForm.branchName,
          tenant_id: profileForm.branchId,
          branch_id: profileForm.branchId,
          acquisition_channel: profileForm.acquisitionChannel,
          referrer_name: profileForm.acquisitionChannel === 'referral' ? profileForm.referrerName.trim() : 'Código QR en Clínica'
        }));
      }

      setEditSuccessMsg('¡Expediente actualizado y guardado con éxito!');
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setEditSuccessMsg('');
      }, 1200);
    } catch (err: any) {
      alert(err?.message || 'Error guardando datos');
    } finally {
      setSavingProfile(false);
    }
  };

  // Utilidad para extraer timestamp de la cita de forma confiable
  const parseApptTime = (a: any): number => {
    if (!a) return 0;
    if (a.start_time) {
      const t = new Date(a.start_time).getTime();
      if (!isNaN(t)) return t;
    }
    if (a.appointment_date) {
      const timeStr = a.appointment_time || '16:00';
      const [h, m] = timeStr.split(':').map((n: string) => parseInt(n, 10) || 0);
      const t = new Date(`${a.appointment_date}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  // Caducidad de cita: exactamente 65 minutos (1 hora y 5 minutos) posteriores a la hora programada
  const APPOINTMENT_EXPIRATION_MS = 65 * 60 * 1000;

  // Citas Próximas y Pasadas (Estrictamente reales con caducidad automática a 1h 5m)
  const { upcomingAppointment, upcomingList, pastList } = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return { upcomingAppointment: null, upcomingList: [], pastList: [] };
    }

    // Considerar próximas aquellas que no han concluido y no superan 65 minutos desde su inicio
    const upcoming = appointments
      .filter(a => {
        const t = parseApptTime(a);
        if (!t) return false;
        const isNotExpired = (currentTime - t) <= APPOINTMENT_EXPIRATION_MS;
        return isNotExpired && a.status !== 'cancelled' && a.status !== 'completed';
      })
      .sort((a, b) => parseApptTime(a) - parseApptTime(b));

    const past = appointments
      .filter(a => {
        const t = parseApptTime(a);
        if (!t) return true;
        const isExpired = (currentTime - t) > APPOINTMENT_EXPIRATION_MS;
        return isExpired || a.status === 'completed';
      })
      .sort((a, b) => parseApptTime(b) - parseApptTime(a));

    return {
      upcomingAppointment: upcoming.length > 0 ? upcoming[0] : null,
      upcomingList: upcoming,
      pastList: past
    };
  }, [appointments, currentTime]);

  // Cálculo dinámico de tiempos, cuenta regresiva y estado de recordatorios (24h y 1h)
  const appointmentCountdown = useMemo(() => {
    if (!upcomingAppointment) return null;
    const time = parseApptTime(upcomingAppointment);
    if (!time) return null;

    const diffMs = time - currentTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = Math.floor(diffHours % 24);
    const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let countdownText = '';
    if (diffMs < 0) {
      const elapsedMins = Math.floor(Math.abs(diffMs) / (1000 * 60));
      countdownText = `En consultorio (inició hace ${elapsedMins} min)`;
    } else if (diffHours < 1) {
      countdownText = `¡En ${Math.max(1, remainingMinutes)} minutos!`;
    } else if (diffDays === 0) {
      countdownText = `Hoy en ${remainingHours}h y ${remainingMinutes}m`;
    } else {
      countdownText = `En ${diffDays} día(s) y ${remainingHours}h`;
    }

    const is1hAlert = diffHours > 0 && diffHours <= 1.5;
    const is24hAlert = diffHours > 1.5 && diffHours <= 26;
    const isConfirmed = upcomingAppointment.status === 'confirmed' || upcomingAppointment.status === 'Confirmada';

    const reminder24hStatus = upcomingAppointment.reminder_1_day_sent || diffHours <= 24
      ? 'Enviado / Activo'
      : 'Programado para 24h antes';

    const reminder1hStatus = upcomingAppointment.reminder_1_hour_sent || diffHours <= 1.5
      ? 'Enviado / Activo'
      : 'Programado para 1h antes';

    const formattedDate = new Date(time).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedTime = new Date(time).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      time,
      diffHours,
      diffDays,
      remainingHours,
      remainingMinutes,
      countdownText,
      is1hAlert,
      is24hAlert,
      isConfirmed,
      reminder24hStatus,
      reminder1hStatus,
      formattedDate,
      formattedTime
    };
  }, [upcomingAppointment, currentTime]);

  // Semáforo exacto de alergias del paciente (NOM-004-SSA3): Verde, Amarillo o Rojo
  const allergyEval = useMemo(() => {
    return evalAllergyStatus(
      patient?.allergies_medication || patient?.allergies,
      patient?.has_no_allergies,
      patient?.allergy_notes
    );
  }, [patient]);

  // Confirmar asistencia directamente desde el portal
  const handleConfirmAttendance = async (apptId: string) => {
    try {
      setConfirmingAppt(true);
      await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', apptId);

      setAppointments(prev =>
        prev.map(a => (String(a.id || a.folio) === String(apptId) ? { ...a, status: 'confirmed' } : a))
      );
      setConfirmationNotice('✅ ¡Tu asistencia ha sido confirmada con éxito! La Dra. Aura Estudillo te espera con tu sillón clínico preparado.');
      setTimeout(() => setConfirmationNotice(''), 7000);
    } catch (err) {
      console.warn('Error confirmando asistencia:', err);
    } finally {
      setConfirmingAppt(false);
    }
  };

  // Enlace directo a Google Calendar con recordatorio 24h y 1h
  const googleCalendarUrl = useMemo(() => {
    if (!upcomingAppointment || !appointmentCountdown?.time) return '';
    const startIso = new Date(appointmentCountdown.time).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endIso = new Date(appointmentCountdown.time + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent('Cita Dental • Dra. Aura Estudillo (Audenti Cloud Pro)');
    const details = encodeURIComponent(`Cita con la Dra. Aura Estudillo en ${branchInfo.name}. Por favor acude 10 minutos antes.`);
    const location = encodeURIComponent(branchInfo.name);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  }, [upcomingAppointment, appointmentCountdown, branchInfo]);

  const patientName = patient?.full_name || user?.user_metadata?.full_name || 'Paciente Audenti';

  // Contexto para la Asistente de Voz Audenti 24/7 (personalizada según edad y citas)
  // DEBE DECLARARSE AQUÍ ANTES DE CUALQUIER RETURN CONDICIONAL PARA CUMPLIR LAS REGLAS DE HOOKS DE REACT
  const assistantVoiceContext: PatientSpeechContext = useMemo(() => {
    const upcoming = appointments.find(a => a.status !== 'cancelled' && a.status !== 'completed');
    return {
      fullName: patientName,
      birthDate: patient?.birth_date || profileForm.birthDate || null,
      age: calculatedAge,
      nextAppointment: upcoming ? {
        date: upcoming.appointment_date,
        time: upcoming.appointment_time,
        treatment: upcoming.reason || upcoming.treatment_name || 'Consulta Dental Integral',
        doctor: upcoming.doctor_name || 'la Dra. Aura Estudillo',
        branch: branchInfo.name
      } : null,
      allergies: allergyEval.status === 'rojo' ? allergyEval.realAllergies : []
    };
  }, [patientName, patient, profileForm.birthDate, calculatedAge, appointments, branchInfo.name, allergyEval]);

  const handleConfirmGuestAppointment = async () => {
    if (!guestAppointment?.id && !guestAppointment?.folio) return;
    setGuestConfirming(true);
    try {
      const resp = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: guestAppointment.id || guestAppointment.folio,
          attendance_confirmed: true
        })
      });
      const data = await resp.json();
      if (data.success) {
        setGuestConfirmSuccess(true);
        setGuestAppointment((prev: any) => ({ ...prev, attendance_confirmed: true }));
      }
    } catch (err) {
      console.error('Error confirmando cita:', err);
    } finally {
      setGuestConfirming(false);
    }
  };

  const handleGuestPhoneLoginSubmit = async (e?: React.FormEvent, customPhone?: string) => {
    if (e) e.preventDefault();
    const phone = (customPhone || guestPhoneInput).trim();
    if (!phone) return;
    setGuestLoginLoading(true);
    setGuestLoginError('');
    try {
      const resp = await fetch('/api/auth/patient-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneOrEmail: phone,
          redirectUrl: window.location.origin + '/portal-paciente'
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || 'No encontramos un expediente con ese celular.');
      }

      // 1. Verificación instantánea silenciosa por Token Hash sin salir de la página
      if (data.hashedToken) {
        try {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: data.hashedToken,
            type: 'magiclink'
          });
          if (!otpError) {
            window.location.reload();
            return;
          }
        } catch (otpErr) {
          console.warn('Fallback a actionLink:', otpErr);
        }
      }

      // 2. Si no fue posible verificación local silenciosa, redirigir al actionLink
      if (data.actionLink) {
        window.location.href = data.actionLink;
      }
    } catch (err: any) {
      setGuestLoginError(err.message || 'Error al acceder a tu expediente.');
      setGuestLoginLoading(false);
    }
  };

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

  // ── VISTA DE ACCESO SEGURO AL EXPEDIENTE DENTAL (CUANDO NO HAY SESIÓN INICIADA) ──
  if (!user && !guestAppointment) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-between py-8 px-4 sm:px-6">
        <header className="max-w-md mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
          <AudentiLogo size={28} doctorName="Dra. Aura Estudillo" />
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-400 text-slate-950">
            Portal Pacientes
          </span>
        </header>

        <main className="max-w-md mx-auto w-full py-6 space-y-6">
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-left space-y-5">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Acceso Clínico Seguro 24/7
              </span>
              <h1 className="text-2xl font-black text-white">
                Tu Expediente Dental
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Consulta tus citas programadas, recetas oficiales NOM-004 y tu odontograma interactivo sin complicaciones.
              </p>
            </div>

            {/* Formulario de Acceso por Celular */}
            <form onSubmit={(e) => handleGuestPhoneLoginSubmit(e)} className="space-y-3 pt-2">
              <label className="text-[11px] font-bold text-slate-300 block">
                Ingresa tu celular a 10 dígitos registrado:
              </label>
              {guestLoginError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{guestLoginError}</span>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="55 2242 7769"
                  value={guestPhoneInput}
                  onChange={(e) => setGuestPhoneInput(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={guestLoginLoading}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-400/20 shrink-0 cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {guestLoginLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Entrar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                🔒 Acceso rápido y confidencial bajo la NOM-004-SSA3-2012.
              </p>
            </form>

            {/* Accesos Rápidos para Pacientes Activos / Pruebas de la Clínica */}
            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Pacientes con expediente activo en la clínica:
              </span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGuestPhoneInput('5522427769');
                    handleGuestPhoneLoginSubmit(undefined, '5522427769');
                  }}
                  className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 flex items-center justify-between text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-black text-xs">
                      RU
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                        Ricardo Ulises Rayón Sánchez
                      </p>
                      <p className="text-[10px] text-slate-400">Balbuena • Cel. 55 2242 7769</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGuestPhoneInput('5512345678');
                    handleGuestPhoneLoginSubmit(undefined, '5512345678');
                  }}
                  className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 flex items-center justify-between text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center font-black text-xs">
                      MA
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                        Sra. María de los Ángeles Sánchez
                      </p>
                      <p className="text-[10px] text-slate-400">Balbuena • Cel. 55 1234 5678</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGuestPhoneInput('5598765432');
                    handleGuestPhoneLoginSubmit(undefined, '5598765432');
                  }}
                  className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 flex items-center justify-between text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center font-black text-xs">
                      CA
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                        Carlos Alberto Rayón
                      </p>
                      <p className="text-[10px] text-slate-400">Balbuena • Cel. 55 9876 5432</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </button>
              </div>
            </div>

            {/* Alternativas de Acceso */}
            <div className="pt-3 border-t border-slate-800 text-center">
              <Link
                href="/portal/login"
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 transition-colors"
              >
                ¿Prefieres ingresar con contraseña o registrarte por primera vez?
              </Link>
            </div>
          </div>
        </main>

        <footer className="text-center text-[10px] text-slate-500 py-3">
          Audenti Clinical Pro 2027 • Dra. Aura Estudillo • Céd. Prof. 8492019 • Sucursales Balbuena &amp; Chalma
        </footer>
      </div>
    );
  }

  // ── VISTA DE CONFIRMACIÓN DIRECTA DE CITA (WHATSAPP SIN LOGIN OBLIGATORIO) ──
  if (guestAppointment) {
    const isChalma = (guestAppointment.branch || '').toLowerCase().includes('chalma');
    const branchName = isChalma ? 'Sede Norte — Chalma de Guadalupe' : 'Sede Matriz — Jardín Balbuena';
    const branchAddress = isChalma
      ? 'Chalma de Guadalupe'
      : 'Jardín Balbuena';
    const mapUrl = isChalma
      ? 'https://maps.google.com/?q=Guadalupe+Chalma+Gustavo+A+Madero'
      : 'https://maps.google.com/?q=Jardin+Balbuena+CDMX';
    const waClinicPhone = isChalma ? '525566068975' : '525522427769';

    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-between py-6 px-4 sm:px-6">
        <header className="max-w-md mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
          <AudentiLogo size={28} doctorName="Dra. Aura Estudillo" />
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-400 text-slate-950">
            Confirmación Oficial
          </span>
        </header>

        <main className="max-w-md mx-auto w-full py-6 space-y-5">
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl text-left space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Cita Odontológica Programada
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  {guestAppointment.patient_name}
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                {guestAppointment.folio || guestAppointment.id}
              </span>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-3 text-slate-200">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Fecha:</strong> {guestAppointment.appointment_date}
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-200">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Horario:</strong> {guestAppointment.appointment_time} hrs
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-200">
                <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Atención Médica:</strong> Dra. Aura Estudillo (Céd. Prof. 8492019)
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-200">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Tratamiento:</strong> {guestAppointment.treatment}
                </span>
              </div>

              <div className="flex items-start gap-3 text-slate-200">
                <Building2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">{branchName}</p>
                  <p className="text-[11px] text-slate-400">{branchAddress}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              {guestConfirmSuccess ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>¡Asistencia Confirmada! Te esperamos con gusto en la clínica.</span>
                </div>
              ) : (
                <button
                  onClick={handleConfirmGuestAppointment}
                  disabled={guestConfirming}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-98 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{guestConfirming ? 'Confirmando...' : 'Confirmar Mi Asistencia Ahora'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Cómo Llegar</span>
              </a>

              <a
                href={`https://wa.me/${waClinicPhone}?text=${encodeURIComponent(`Hola Dra. Aura Estudillo, confirmo mi cita ${guestAppointment.folio || ''} a nombre de ${guestAppointment.patient_name}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 text-left space-y-3">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>¿Deseas consultar tu Odontograma 3D y Recetas?</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Accede a tu expediente completo ingresando tu celular registrado:
              </p>
            </div>

            <form onSubmit={handleGuestPhoneLoginSubmit} className="space-y-2">
              {guestLoginError && (
                <p className="text-[11px] text-rose-400 font-semibold">{guestLoginError}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="55 1234 5678"
                  value={guestPhoneInput}
                  onChange={(e) => setGuestPhoneInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={guestLoginLoading}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors shrink-0 cursor-pointer disabled:opacity-60"
                >
                  {guestLoginLoading ? '...' : 'Entrar →'}
                </button>
              </div>
            </form>
          </div>
        </main>

        <footer className="text-center text-[10px] text-slate-500 py-3">
          Audenti Clinical • Dra. Aura Estudillo • Céd. Prof. 8492019 • Balbuena &amp; Chalma
        </footer>
      </div>
    );
  }

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
        {allergyEval.status === 'rojo' ? (
          <div className="bg-rose-950/70 border border-rose-500/60 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-300">
                  Alerta Médica NOM-004-SSA3: Alergia Confirmada
                </p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {allergyEval.label}
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-200 bg-rose-900/40 px-3.5 py-1.5 rounded-xl border border-rose-500/40 self-stretch sm:self-auto text-left sm:text-right">
              <span className="text-rose-300 text-[10px] block font-bold uppercase">Contacto de Emergencia</span>
              <strong className="text-white">{patient?.emergency_contact_name || 'Familiar Registrado'}</strong> • {patient?.emergency_phone || patient?.emergency_contact_phone || 'Sin teléfono'}
            </div>
          </div>
        ) : allergyEval.status === 'verde' ? (
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
                  Sin alergias confirmadas reportadas en el expediente clínico
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-2 bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-500/30">
              <span className="text-emerald-400 text-[11px] font-bold">Emergencia:</span>
              <span className="text-white font-semibold">{patient?.emergency_contact_name || 'Registrado'}</span>
              <span className="text-slate-300">({patient?.emergency_phone || patient?.emergency_contact_phone || patient?.phone || 'Sin número'})</span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Expediente Clínico en Proceso (NOM-004-SSA3)
                </span>
                <p className="text-xs font-bold text-amber-200">
                  No se tiene registro de alergias • Pendiente de capturar en cuestionario presencial
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-2 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-500/30">
              <span className="text-amber-400 text-[11px] font-bold">Sede:</span>
              <span className="text-white font-semibold">{branchInfo.name}</span>
            </div>
          </div>
        )}
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* ── ASISTENTE CONVERSACIONAL AUDENTI 24/7 CON VOZ INTELIGENTE POR EDAD ── */}
        <AudentiVoiceAssistantCard context={assistantVoiceContext} />

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

          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-slate-900/90 px-5 py-3.5 rounded-2xl border border-amber-400/30 text-xs space-y-1 shadow-lg">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sede Clínica Asignada</p>
              <p className="text-amber-400 font-black text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
                {branchInfo.name}
              </p>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="text-[11px] text-amber-300 hover:text-amber-200 underline font-bold flex items-center gap-1 cursor-pointer pt-0.5"
              >
                Cambiar / Confirmar sucursal →
              </button>
            </div>
          </div>
        </div>

        {/* ── RECORDATORIO DE REGISTRO COMPLETO (NOM-004-SSA3) ── */}
        {!registrationEvaluation.isComplete ? (
          <div className="bg-gradient-to-r from-amber-950/70 via-slate-950 to-amber-950/40 border-2 border-amber-400/60 rounded-3xl p-6 sm:p-7 shadow-[0_0_40px_rgba(245,158,11,0.2)] space-y-4 backdrop-blur-xl relative overflow-hidden animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
                  <AlertCircle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 tracking-wider">
                      Recordatorio: Expediente Incompleto
                    </span>
                    <span className="text-xs text-amber-300 font-bold">
                      Registro al {registrationEvaluation.percentage}%
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                    Completa tu Expediente Dental y Confirma tu Sucursal
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Para que la Dra. Aura Estudillo certifique tus recetas oficiales bajo la norma NOM-004-SSA3, asigne tu expediente a tu sede más cercana y active tus recordatorios automáticos de cita (24h y 1h), completa los datos pendientes:
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="w-full md:w-auto px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Completar Registro Ahora ({registrationEvaluation.percentage}%)</span>
              </button>
            </div>

            {/* Barra de Progreso Visual */}
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-300 h-2.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${registrationEvaluation.percentage}%` }}
              />
            </div>

            {/* Chips con datos faltantes */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Falta completar:</span>
              {registrationEvaluation.missingItems.map(item => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {item.missingHint}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Expediente Clínico 100% Completo y Certificado (NOM-004-SSA3)
                </span>
                <p className="text-xs text-slate-300">
                  Sucursal asignada: <strong className="text-white">{branchInfo.name}</strong> • Edad clínica y recordatorios activos.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(true)}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-bold transition-colors cursor-pointer shrink-0"
            >
              Actualizar datos / Cambiar sucursal
            </button>
          </div>
        )}

        {/* ── 4. TARJETA 'PRÓXIMA CITA' SOLO CON CITAS FUTURAS REALES (O ESTADO AMABLE) ── */}
        {upcomingAppointment && appointmentCountdown ? (
          <div className="bg-gradient-to-r from-blue-950/80 via-slate-950 to-indigo-950/80 border border-blue-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 backdrop-blur-xl">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-blue-400 font-black">
                  <Calendar className="w-4 h-4 text-blue-400" /> Próxima Cita Médica
                </span>
                {appointmentCountdown.is1hAlert && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-400" /> ¡En menos de 1 hora!
                  </span>
                )}
                {appointmentCountdown.is24hAlert && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase flex items-center gap-1">
                    <Bell className="w-3 h-3 text-amber-400" /> Recordatorio 24h activo
                  </span>
                )}
                {appointmentCountdown.countdownText && (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                    ⏱️ {appointmentCountdown.countdownText}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white">
                {appointmentCountdown.formattedDate} • {appointmentCountdown.formattedTime} hrs
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
                <span className="text-slate-500">•</span>
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  Avisos: 24h y 1h sincronizados
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleConfirmAttendance(upcomingAppointment.id || upcomingAppointment.folio)}
                disabled={confirmingAppt || appointmentCountdown.isConfirmed}
                className={`inline-flex items-center justify-center gap-2 font-black px-4 py-3 rounded-2xl text-xs shadow-lg transition-all cursor-pointer flex-1 sm:flex-initial ${
                  appointmentCountdown.isConfirmed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {appointmentCountdown.isConfirmed ? 'Asistencia Confirmada' : (confirmingAppt ? 'Confirmando...' : 'Confirmar Asistencia')}
              </button>

              <a
                href={`https://wa.me/${branchInfo.phoneClean}?text=${encodeURIComponent(`Hola Dra. Aura Estudillo, soy el paciente ${patientName}. Deseo confirmar los detalles de mi cita en ${branchInfo.name}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-3.5 py-3 rounded-2xl text-xs border border-slate-700 transition-all cursor-pointer"
                title="Contactar a la clínica por WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                WhatsApp
              </a>

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
        ) : (
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                <Calendar className="w-6 h-6 text-amber-400/80" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Control Clínico Preventivo
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {branchInfo.name}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Aún no tienes una próxima cita agendada
                </h2>
                <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                  Tu expediente clínico se encuentra activo con la Dra. Aura Estudillo. Si requieres valoración, revisión periódica o continuar tu tratamiento, solicita tu turno directo aquí.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <a
                href={`https://wa.me/${branchInfo.phoneClean}?text=${encodeURIComponent(`Hola Dra. Aura Estudillo, soy el paciente ${patientName}. Deseo agendar una consulta odontológica en ${branchInfo.name}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex-1 md:flex-initial"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Solicitar Nueva Cita</span>
              </a>
            </div>
          </div>
        )}

        {confirmationNotice && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{confirmationNotice}</span>
            </div>
            <button onClick={() => setConfirmationNotice('')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── 5. MENÚ PRINCIPAL ACCESIBLE Y TÁCTIL (DISEÑO MÓVIL PARA ADULTOS MAYORES) ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Menú de Opciones
            </span>
            <span className="text-[11px] text-amber-400 font-bold">
              Toca una opción para navegar
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Botón 1: Citas y Agenda */}
            <button
              type="button"
              onClick={() => switchTab('citas')}
              className={cn(
                'p-4 rounded-3xl text-left transition-all flex flex-col justify-between gap-3 border shadow-xl cursor-pointer min-h-[96px]',
                activeTab === 'citas'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-4 ring-amber-400/20 shadow-amber-500/20'
                  : 'bg-slate-900/90 text-white border-slate-800 hover:border-slate-700'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center font-bold',
                  activeTab === 'citas' ? 'bg-slate-950 text-amber-400' : 'bg-amber-400/10 text-amber-400'
                )}>
                  <Calendar className="w-5 h-5" />
                </div>
                <span className={cn(
                  'text-[10px] font-black px-2 py-0.5 rounded-full',
                  activeTab === 'citas' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                )}>
                  {upcomingList.length + pastList.length}
                </span>
              </div>
              <div>
                <p className={cn('text-sm font-black tracking-tight leading-tight', activeTab === 'citas' ? 'text-slate-950' : 'text-white')}>
                  Mis Citas
                </p>
                <p className={cn('text-[11px] font-medium leading-tight mt-0.5', activeTab === 'citas' ? 'text-slate-800 font-bold' : 'text-slate-400')}>
                  Calendario y agenda
                </p>
              </div>
            </button>

            {/* Botón 2: Mi Perfil */}
            <button
              type="button"
              onClick={() => switchTab('perfil')}
              className={cn(
                'p-4 rounded-3xl text-left transition-all flex flex-col justify-between gap-3 border shadow-xl cursor-pointer min-h-[96px]',
                activeTab === 'perfil'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-4 ring-amber-400/20 shadow-amber-500/20'
                  : 'bg-slate-900/90 text-white border-slate-800 hover:border-slate-700'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center font-bold',
                  activeTab === 'perfil' ? 'bg-slate-950 text-amber-400' : 'bg-blue-400/10 text-blue-400'
                )}>
                  <User className="w-5 h-5" />
                </div>
                <span className={cn(
                  'text-[10px] font-black px-2 py-0.5 rounded-full',
                  activeTab === 'perfil' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                )}>
                  Activo
                </span>
              </div>
              <div>
                <p className={cn('text-sm font-black tracking-tight leading-tight', activeTab === 'perfil' ? 'text-slate-950' : 'text-white')}>
                  Mi Perfil
                </p>
                <p className={cn('text-[11px] font-medium leading-tight mt-0.5', activeTab === 'perfil' ? 'text-slate-800 font-bold' : 'text-slate-400')}>
                  Datos y sucursal
                </p>
              </div>
            </button>

            {/* Botón 3: Recetas Médicas */}
            <button
              type="button"
              onClick={() => switchTab('recetas')}
              className={cn(
                'p-4 rounded-3xl text-left transition-all flex flex-col justify-between gap-3 border shadow-xl cursor-pointer min-h-[96px]',
                activeTab === 'recetas'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-4 ring-amber-400/20 shadow-amber-500/20'
                  : 'bg-slate-900/90 text-white border-slate-800 hover:border-slate-700'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center font-bold',
                  activeTab === 'recetas' ? 'bg-slate-950 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'
                )}>
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <span className={cn(
                  'text-[10px] font-black px-2 py-0.5 rounded-full',
                  activeTab === 'recetas' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                )}>
                  {prescriptions.length}
                </span>
              </div>
              <div>
                <p className={cn('text-sm font-black tracking-tight leading-tight', activeTab === 'recetas' ? 'text-slate-950' : 'text-white')}>
                  Mis Recetas
                </p>
                <p className={cn('text-[11px] font-medium leading-tight mt-0.5', activeTab === 'recetas' ? 'text-slate-800 font-bold' : 'text-slate-400')}>
                  Recetario digital
                </p>
              </div>
            </button>

            {/* Botón 4: Tratamientos Realizados */}
            <button
              type="button"
              onClick={() => switchTab('bitacora')}
              className={cn(
                'p-4 rounded-3xl text-left transition-all flex flex-col justify-between gap-3 border shadow-xl cursor-pointer min-h-[96px]',
                activeTab === 'bitacora'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-4 ring-amber-400/20 shadow-amber-500/20'
                  : 'bg-slate-900/90 text-white border-slate-800 hover:border-slate-700'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center font-bold',
                  activeTab === 'bitacora' ? 'bg-slate-950 text-amber-400' : 'bg-purple-400/10 text-purple-400'
                )}>
                  <Activity className="w-5 h-5" />
                </div>
                <span className={cn(
                  'text-[10px] font-black px-2 py-0.5 rounded-full',
                  activeTab === 'bitacora' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                )}>
                  {clinicalTimeline.length}
                </span>
              </div>
              <div>
                <p className={cn('text-sm font-black tracking-tight leading-tight', activeTab === 'bitacora' ? 'text-slate-950' : 'text-white')}>
                  Tratamientos
                </p>
                <p className={cn('text-[11px] font-medium leading-tight mt-0.5', activeTab === 'bitacora' ? 'text-slate-800 font-bold' : 'text-slate-400')}>
                  Historial de atención
                </p>
              </div>
            </button>
          </div>
        </div>

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

        {/* ── SECCIÓN 3: MÓDULO DE CALENDARIO Y PERFIL EN PÁGINA PRINCIPAL ── */}
        {activeTab === 'citas' && (
          <div className="space-y-6">
            {/* Notificaciones y Avisos de Citas en Vivo para el Paciente */}
            <PatientAppointmentNotifications
              patientId={patient?.id}
              patientName={patientName}
              branchName={branchInfo.name}
              branchPhoneClean={branchInfo.phoneClean}
            />

            <PatientCalendarSchedule
              appointments={appointments}
              patientName={patientName}
              branchName={branchInfo.name}
              branchPhoneClean={branchInfo.phoneClean}
              onAppointmentUpdated={async () => {
                try {
                  const res = await fetch('/api/appointments');
                  if (res.ok) {
                    const json = await res.json();
                    if (json.success && Array.isArray(json.appointments)) {
                      setAppointments(json.appointments);
                    }
                  }
                } catch {}
              }}
            />

            {/* Resumen de Mi Perfil Clínico Integrado en la Página Principal */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Mi Perfil y Expediente Clínico</h3>
                    <p className="text-xs text-slate-400">Datos oficiales registrados bajo normativa NOM-004-SSA3</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => switchTab('perfil')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white border border-amber-400/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Ver Perfil Completo &amp; Consentimiento</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Paciente</span>
                  <strong className="text-white font-black text-sm block truncate">{patientName}</strong>
                  <span className="text-[11px] text-slate-400 block truncate">{user?.email || 'Registrado'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-amber-400/30 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Sede de Atención</span>
                  <strong className="text-amber-400 font-black text-sm block flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                    {branchInfo.name}
                  </strong>
                  <span className="text-[11px] text-slate-400 block">Sede asignada a tu expediente</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Especialista</span>
                  <strong className="text-white font-black text-sm block">Dra. Aura Estudillo</strong>
                  <span className="text-[11px] text-amber-300 block">Céd. Prof. 8492019</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Estatus de Expediente</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Activo &amp; NOM-004-SSA3
                  </span>
                </div>
              </div>
            </div>
          </div>
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

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPrescription(rx)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/15"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Ver / Imprimir PDF
                      </button>

                      <a
                        href={`https://wa.me/${branchInfo.phoneClean}?text=${encodeURIComponent(
                          `Hola Dra. Aura Estudillo, soy ${patientName}. Deseo consultar o recibir mi receta oficial ${rx.folio}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors cursor-pointer"
                        title="Recibir por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                      </a>
                    </div>
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
            {/* ── PANEL PERMANENTE: PRÓXIMA CITA CLÍNICA & SISTEMA DE RECORDATORIOS (24H Y 1H) ── */}
            {upcomingAppointment && appointmentCountdown ? (
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                      <CalendarCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          {upcomingAppointment.folio ? `Folio: ${upcomingAppointment.folio}` : 'Cita Activa'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {branchInfo.name}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white mt-1">
                        Tu Próxima Cita Odontológica
                      </h3>
                    </div>
                  </div>

                  {appointmentCountdown.is1hAlert ? (
                    <span className="px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black uppercase flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      ¡ALERTA 1H: CITA EN MENOS DE 1 HORA!
                    </span>
                  ) : appointmentCountdown.is24hAlert ? (
                    <span className="px-3.5 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black uppercase flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
                      RECORDATORIO 24H ACTIVO
                    </span>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-400" />
                      {appointmentCountdown.countdownText}
                    </span>
                  )}
                </div>

                {/* Grid con detalles de la cita */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" /> Fecha y Horario
                    </span>
                    <p className="text-white font-black text-sm capitalize">
                      {appointmentCountdown.formattedDate}
                    </p>
                    <p className="text-amber-400 font-mono font-bold text-base">
                      {appointmentCountdown.formattedTime} hrs
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" /> Sede de Atención
                    </span>
                    <p className="text-white font-bold text-sm">
                      {branchInfo.name}
                    </p>
                    <span className="text-[11px] text-amber-300 block">
                      Sede registrada en expediente
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-blue-400" /> Especialista
                    </span>
                    <p className="text-white font-bold text-sm">
                      Dra. Aura Estudillo
                    </p>
                    <p className="text-slate-400 text-xs">
                      Cédula Profesional 8492019
                    </p>
                  </div>
                </div>

                {/* Protocolo Automático de Recordatorios (24h y 1h) */}
                <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    Protocolo Activo de Recordatorios Automatizados (Avisos 24h &amp; 1h)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-amber-400" /> Notificación 24 Horas Antes
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          appointmentCountdown.reminder24hStatus === 'Enviado / Activo'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {appointmentCountdown.reminder24hStatus}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Se despacha vía WhatsApp oficial para confirmar tu asistencia y preparar tu expediente con 1 día de anticipación.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" /> Alerta Preventiva 1 Hora Antes
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          appointmentCountdown.reminder1hStatus === 'Enviado / Activo'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {appointmentCountdown.reminder1hStatus}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Aviso final para que salgas con tiempo hacia el consultorio y evitar demoras en tu atención odontológica.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleConfirmAttendance(upcomingAppointment.id || upcomingAppointment.folio)}
                    disabled={confirmingAppt || appointmentCountdown.isConfirmed}
                    className={`inline-flex items-center justify-center gap-2 font-black px-5 py-3 rounded-2xl text-xs shadow-lg transition-all cursor-pointer ${
                      appointmentCountdown.isConfirmed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {appointmentCountdown.isConfirmed ? 'Asistencia Confirmada' : (confirmingAppt ? 'Confirmando...' : 'Confirmar Mi Asistencia')}
                  </button>

                  {googleCalendarUrl && (
                    <a
                      href={googleCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-3 rounded-2xl text-xs border border-slate-700 transition-all cursor-pointer shadow-md"
                    >
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      Añadir a Google Calendar
                    </a>
                  )}

                  <a
                    href={`https://wa.me/${branchInfo.phoneClean}?text=${encodeURIComponent(
                      `Hola Dra. Aura Estudillo, soy ${patientName}. Deseo confirmar los detalles de mi cita programada para el ${appointmentCountdown.formattedDate} a las ${appointmentCountdown.formattedTime} en ${branchInfo.name}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold px-4 py-3 rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    Enviar WhatsApp a la Clínica
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Aún no tienes una próxima cita agendada</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tu expediente clínico se encuentra activo con la Dra. Aura Estudillo. Si requieres valoración, revisión semestral o continuar tu tratamiento, solicita tu turno directo aquí.
                    </p>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${branchInfo.phoneClean}?text=${encodeURIComponent(
                    `Hola Dra. Aura Estudillo, soy el paciente ${patientName}. Deseo agendar una cita odontológica en la sede ${branchInfo.name}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  Solicitar Nueva Cita
                </a>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tarjeta de Información Personal */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Datos Personales del Paciente</h3>
                      <p className="text-xs text-slate-400">Expediente Clínico Oficial (NOM-004-SSA3)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Editar Datos
                  </button>
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
                    <span className="text-slate-400">Fecha de Nacimiento:</span>
                    <strong className="text-amber-300 font-bold">
                      {patient?.birth_date || patient?.date_of_birth
                        ? new Date(patient.birth_date || patient.date_of_birth).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'No registrada (haz clic en Editar Datos)'}
                    </strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-900">
                    <span className="text-slate-400">Contacto de Emergencia:</span>
                    <strong className="text-white">
                      {patient?.emergency_contact_name || 'Familiar registrado'} (
                      {patient?.emergency_phone || patient?.emergency_contact_phone || 'Sin número'})
                    </strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-900">
                    <span className="text-slate-400">Origen / Recomendación:</span>
                    <strong className="text-amber-300 font-bold">
                      {patient?.referrer_name
                        ? `Recomendado por: ${patient.referrer_name}`
                        : (patient?.acquisition_channel === 'qr' ? 'Escaneo de Código QR' : 'Visita Directa / Sin dato')}
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
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Sede de Atención Asignada</h3>
                      <p className="text-xs text-amber-300">Dirección Médica • Dra. Aura Estudillo</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cambiar Sede
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-400/30 space-y-2">
                    <span className="text-slate-400 block text-[11px] font-bold uppercase">Sede Clínica Registrada</span>
                    <strong className="text-amber-400 text-base font-black flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
                      {branchInfo.name}
                    </strong>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Sede oficial para tus consultas y atenciones con la Dra. Aura Estudillo.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Expediente clínico protegido bajo protocolo de bioseguridad NOM-004-SSA3.</span>
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

            {/* Módulo de Consentimiento Informado Quirúrgico (NOM-004-SSA3) */}
            <div className="bg-slate-950/90 border border-amber-500/40 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      Consentimientos Informados y Firma Digital
                    </h4>
                    <p className="text-xs text-slate-400">
                      Biometría táctil y certificación SHA-256 (NOM-004-SSA3-2012)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsConsentModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Firmar Consentimiento Quirúrgico</span>
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Antes de cualquier intervención quirúrgica (extracciones, endodoncias, implantes o cirugía de terceros molares), puedes firmar y ratificar tu consentimiento informado directamente en pantalla. Cada firma genera un hash criptográfico único que queda registrado permanentemente en tu expediente.
              </p>
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

      {/* ── MODAL DE FIRMA DIGITAL BIOMÉTRICA DE CONSENTIMIENTO INFORMADO (NOM-004-SSA3) ── */}
      <InformedConsentSignModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        patientId={patient?.id || user?.id}
        patientName={patientName}
        patientPhone={patient?.phone}
        branchName={branchInfo.name}
      />

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
                  {allergyEval.status === 'rojo' && (
                    <p className="text-[11px] text-rose-400 font-bold mt-1">
                      ⚠️ Alergia confirmada: {allergyEval.realAllergies.join(', ')}
                    </p>
                  )}
                  {allergyEval.status === 'verde' && (
                    <p className="text-[11px] text-emerald-400 font-bold mt-1">
                      ✓ Sin alergias confirmadas
                    </p>
                  )}
                  {allergyEval.status === 'amarillo' && (
                    <p className="text-[11px] text-amber-400 font-medium mt-1">
                      ℹ️ Sin registro de alergias
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

      {/* ── MODAL: COMPLETAR REGISTRO Y ASIGNACIÓN DE SUCURSAL (NOM-004-SSA3) ── */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-950 border-2 border-amber-500/50 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.25)] text-white p-6 sm:p-8 space-y-5 my-8">
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera del Modal */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Expediente NOM-004-SSA3
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Completa tu Registro y Sucursal
                </h3>
              </div>
            </div>

            {editSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
              {/* Selección Visual de Sucursal */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-2">
                  1. Selecciona tu Sucursal de Atención Habitual *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tarjeta Sucursal Balbuena */}
                  <div
                    onClick={() => setProfileForm(prev => ({
                      ...prev,
                      branchName: 'Sucursal Balbuena',
                      branchId: '00000000-0000-0000-0000-000000000001'
                    }))}
                    className={cn(
                      "p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2",
                      profileForm.branchName.includes('Balbuena')
                        ? "bg-amber-400/15 border-amber-400 text-white shadow-lg shadow-amber-500/10"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-amber-300">Sede Matriz</span>
                      {profileForm.branchName.includes('Balbuena') && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <strong className="text-white text-sm block">Sucursal Balbuena</strong>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Venustiano Carranza, CDMX</span>
                    </div>
                  </div>

                  {/* Tarjeta Sucursal Chalma de Guadalupe */}
                  <div
                    onClick={() => setProfileForm(prev => ({
                      ...prev,
                      branchName: 'Sucursal Chalma de Guadalupe',
                      branchId: '00000000-0000-0000-0000-000000000002'
                    }))}
                    className={cn(
                      "p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2",
                      profileForm.branchName.includes('Chalma')
                        ? "bg-amber-400/15 border-amber-400 text-white shadow-lg shadow-amber-500/10"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-cyan-300">Sede Norte</span>
                      {profileForm.branchName.includes('Chalma') && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <strong className="text-white text-sm block">Sucursal Chalma de Guadalupe</strong>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Gustavo A. Madero, CDMX</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nombre Completo */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                  2. Nombre Completo del Paciente *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Tu nombre y apellidos"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
                  />
                </div>
              </div>

              {/* Fecha de Nacimiento y Edad */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                    3. Fecha de Nacimiento *
                  </label>
                  {calculatedAge !== null && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full">
                      {calculatedAge} años calculados
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={profileForm.birthDate}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, birthDate: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Teléfono Celular (10 dígitos) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                  4. Teléfono Celular para Recordatorios 24h &amp; 1h *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="55 1234 5678"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
                  />
                </div>
              </div>

              {/* ¿Cómo nos conociste o quién te recomendó? (Redes sociales en pausa) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                  5. ¿Cómo nos conociste o quién te recomendó? *
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setProfileForm(prev => ({ ...prev, acquisitionChannel: 'referral' }))}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      profileForm.acquisitionChannel === 'referral'
                        ? "bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600"
                    )}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Recomendación</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfileForm(prev => ({ ...prev, acquisitionChannel: 'qr' }))}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      profileForm.acquisitionChannel === 'qr'
                        ? "bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600"
                    )}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Código QR</span>
                  </button>
                </div>

                {profileForm.acquisitionChannel === 'referral' && (
                  <div className="mt-2">
                    <label className="block text-[10px] font-bold uppercase text-amber-300 mb-1">
                      ¿Quién te recomendó? (Nombre de la persona, familiar o doctor) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Mi tía Rosa, Dr. Pedro Martínez, amigo..."
                      value={profileForm.referrerName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, referrerName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-amber-500/50 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Botón de Guardar */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{savingProfile ? 'Guardando y Certificando...' : 'Guardar y Certificar Expediente (100%)'}</span>
                </button>
              </div>
            </form>
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
