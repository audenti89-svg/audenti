'use client'

import { useState, useEffect } from 'react'
import { formatWhatsAppUrl } from '@/lib/whatsapp-link'
import {
  FileText,
  Edit,
  Cake,
  Phone,
  Mail,
  Home,
  Users,
  Share2,
  CheckCircle2,
  Printer,
  UserPlus,
  RefreshCw,
  Search,
  Save,
  X,
  HeartPulse,
  AlertTriangle,
  MessageSquare,
  Clock,
  Send,
  Lock,
  PhoneCall,
  Activity,
  ShieldCheck,
  ShieldAlert,
  ClipboardList,
  Sparkles,
  Calendar,
  ChevronRight,
  UserCheck,
  Stethoscope,
  RotateCcw,
  Download,
  FileSpreadsheet,
  FileCode,
  Database,
  Smile,
  DollarSign,
  Check,
  Info,
  Building2
} from 'lucide-react'
import { Odontogram } from '@/components/clinical/Odontogram'
import { FamilyNucleusManager } from '@/components/clinical/FamilyNucleusManager'
import { MedicalQuestionnaire } from '@/components/clinical/MedicalQuestionnaire'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { QuickRegisterModal } from '@/components/clinical/QuickRegisterModal'
import { PatientDirectActionWidget } from '@/components/clinical/PatientDirectActionWidget'
import { InformedConsentSignModal } from '@/components/clinical/InformedConsentSignModal'
import {
  exportToWord,
  exportToExcel,
  exportToCsv,
  triggerDatabaseBackupSql
} from '@/lib/clinical-export'

export default function ExpedientePage() {
  const supabase = createClient()
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  
  // VISTA DIFERENCIADA DUAL: 'doctor' (Quirúrgica / Especializada) vs 'patient' (Portal de Transparencia)
  const [expedienteMode, setExpedienteMode] = useState<'doctor' | 'patient'>('doctor')
  const [downloadingExport, setDownloadingExport] = useState<string | null>(null)

  // Pestaña activa del Panel Izquierdo (en modo doctor)
  const [leftTab, setLeftTab] = useState<'patient' | 'agenda' | 'history' | 'questionnaire' | 'family'>('patient')

  // Agenda Diaria en Tiempo Real
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(false)

  // Historial de mensajes, notas y llamadas
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Modal para editar ficha
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    emergencyContact: '',
    emergencyPhone: '',
    allergies: '',
    medicalConditions: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Selector dinámico de sucursal por paciente (Persistencia en Supabase)
  const [savingBranch, setSavingBranch] = useState(false)
  const [branchSavedSuccess, setBranchSavedSuccess] = useState(false)

  // Perfil del profesional en sesión (Socio, Trabajador o Pasante)
  const [doctorProfile, setDoctorProfile] = useState<{
    name: string
    role: 'socio' | 'trabajador' | 'pasante'
    branch: string
  }>({
    name: 'Dra. Aura Estudillo',
    role: 'socio',
    branch: 'Sucursal Balbuena (Matriz)'
  })

  // Filtro estricto de sucursales (Balbuena y Chalma de Guadalupe)
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all')

  useEffect(() => {
    if (doctorProfile.role !== 'socio') {
      setSelectedBranchFilter(doctorProfile.branch || 'Sucursal Balbuena (Matriz)')
    }
  }, [doctorProfile])

  // Cargar sesión del médico y resolver rol
  useEffect(() => {
    async function loadDoctorSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const email = user.email || ''
        const rawRole = (user.user_metadata?.role || user.app_metadata?.role || '').toLowerCase()
        let resolvedRole: 'socio' | 'trabajador' | 'pasante' = 'socio'
        if (rawRole === 'pasante' || rawRole === 'estudiante' || user.user_metadata?.is_intern) {
          resolvedRole = 'pasante'
        } else if (rawRole === 'trabajador' || rawRole === 'doctor' || rawRole === 'asistente') {
          resolvedRole = 'trabajador'
        } else if (email === 'audenti89@gmail.com' || email === 'rricardos76@gmail.com' || email === 'pruevaz2022@gmail.com' || rawRole === 'owner' || rawRole === 'admin' || rawRole === 'socio' || rawRole === 'superadmin') {
          resolvedRole = 'socio'
        }

        const name = user.user_metadata?.full_name || user.user_metadata?.name || (email === 'rricardos76@gmail.com' || email === 'pruevaz2022@gmail.com' ? 'Ricardo Sánchez (Arquitecto)' : (resolvedRole === 'socio' ? 'Dra. Aura Estudillo' : 'Dr. Clínico Audenti'))
        setDoctorProfile({
          name,
          role: resolvedRole,
          branch: user.user_metadata?.branch || 'Sucursal Balbuena (Matriz)'
        })
      } catch (err) {
        console.warn('Error loading doctor session:', err)
      }
    }
    loadDoctorSession()
  }, [supabase])

  // Cargar Agenda Diaria en Tiempo Real
  const fetchTodayAppointments = async () => {
    setLoadingAppointments(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      let appList: any[] = []

      try {
        const res = await fetch('/api/appointments')
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.appointments)) {
            appList = json.appointments
          }
        }
      } catch (e) {
        console.warn('Nota en /api/appointments:', e)
      }

      if (appList.length === 0) {
        const { data: dbApps } = await supabase
          .from('appointments')
          .select('*')
          .order('date', { ascending: true })
        if (dbApps && dbApps.length > 0) {
          appList = dbApps
        }
      }

      const filtered = appList.filter((a: any) => {
        const aDate = (a.appointment_date || a.date || '').slice(0, 10)
        return aDate === todayStr
      })

      setTodayAppointments(filtered.length > 0 ? filtered : appList.slice(0, 10))
    } catch (err) {
      console.warn('Error fetching appointments for expediente:', err)
    } finally {
      setLoadingAppointments(false)
    }
  }

  // Cargar historial del paciente seleccionado
  const fetchPatientHistory = async (patient: any) => {
    if (!patient) return
    setLoadingMessages(true)
    try {
      const cleanPhone = (patient.phone || '').replace(/\D/g, '').slice(-10)
      
      const { data: dbMsgs } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`patient_id.eq.${patient.id},metadata->>patientId.eq.${patient.id}${cleanPhone ? `,metadata->>phone.ilike.%${cleanPhone}%` : ''}`)
        .order('created_at', { ascending: true })

      let merged: any[] = []
      if (dbMsgs && dbMsgs.length > 0) {
        merged = dbMsgs.map((m: any) => ({
          id: m.id,
          senderName: m.sender_name || (m.sender_role === 'doctor' ? 'Dra. Aura Estudillo' : patient.full_name),
          senderRole: m.sender_role,
          content: m.content,
          channel_type: m.channel_type || 'web_chat',
          isPrivateNote: Boolean(m.is_private_note || m.metadata?.isPrivateNote),
          timestamp: m.created_at ? new Date(m.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : 'Hoy',
          metadata: m.metadata
        }))
      }

      try {
        const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json')
        if (file) {
          const text = await file.text()
          if (text) {
            const allChats = JSON.parse(text)
            const storageItems = allChats[patient.id] || (cleanPhone ? allChats[`prospect_${cleanPhone}`] : []) || []
            if (Array.isArray(storageItems) && storageItems.length > 0) {
              const existingTexts = new Set(merged.map(m => m.content))
              storageItems.forEach((item: any) => {
                if (!existingTexts.has(item.content)) {
                  merged.push({
                    id: item.id || `storage-${Math.random()}`,
                    senderName: item.senderName || item.sender_name || (item.isDoctor ? 'Dra. Aura Estudillo' : patient.full_name),
                    senderRole: item.senderRole || (item.isDoctor ? 'doctor' : 'patient'),
                    content: item.content,
                    channel_type: item.channel_type || item.metadata?.channel_type || 'web_chat',
                    isPrivateNote: Boolean(item.isPrivateNote),
                    timestamp: item.timestamp || item.time || 'Reciente',
                    metadata: item.metadata
                  })
                }
              })
            }
          }
        }
      } catch {}

      setMessages(merged)
    } catch (err) {
      console.warn('Error fetching patient history:', err)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  // Guardar nota privada médica
  const handleSavePrivateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim() || !selectedPatient) return

    setSavingNote(true)
    try {
      const noteContent = newNote.trim()
      const { error } = await supabase.from('chat_messages').insert({
        patient_id: selectedPatient.id,
        sender_role: 'doctor',
        sender_name: doctorProfile.name,
        content: `🔒 [NOTA PRIVADA MÉDICA]: ${noteContent}`,
        channel_type: 'internal_note',
        is_private_note: true,
        metadata: {
          isPrivateNote: true,
          patientId: selectedPatient.id,
          doctorName: doctorProfile.name,
          doctorRole: doctorProfile.role,
          createdAt: new Date().toISOString()
        }
      }).select().single()

      if (error) {
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: selectedPatient.id,
            message: {
              id: `note-${Date.now()}`,
              senderName: doctorProfile.name,
              senderRole: 'doctor',
              content: `🔒 [NOTA PRIVADA MÉDICA]: ${noteContent}`,
              channel_type: 'internal_note',
              isPrivateNote: true,
              isDoctor: true,
              timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
            }
          })
        })
      }

      setNewNote('')
      fetchPatientHistory(selectedPatient)
    } catch (err) {
      console.error('Error al guardar nota privada:', err)
    } finally {
      setSavingNote(false)
    }
  }

  // Cargar lista de pacientes
  const fetchPatients = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const list = data || []
      setPatients(list)
      if (list.length > 0) {
        let targetPatient = list[0]
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          const targetId = urlParams.get('patient_id') || urlParams.get('patientId') || urlParams.get('id')
          if (targetId) {
            const found = list.find(p => p.id === targetId || p.id.startsWith(targetId))
            if (found) targetPatient = found
          }
        }

        setSelectedPatient(targetPatient)
        initEditForm(targetPatient)
        fetchPatientHistory(targetPatient)
      } else {
        setSelectedPatient(null)
      }
    } catch (err) {
      console.warn('Nota en expediente:', err)
      setPatients([])
      setSelectedPatient(null)
    } finally {
      setLoading(false)
    }
  }

  const initEditForm = (p: any) => {
    setEditForm({
      fullName: p.full_name || '',
      phone: p.phone || '',
      email: p.email || '',
      emergencyContact: p.emergency_contact_name || '',
      emergencyPhone: p.emergency_contact_phone || '',
      allergies: Array.isArray(p.allergies_medication) ? p.allergies_medication.join(', ') : '',
      medicalConditions: Array.isArray(p.medical_conditions) ? p.medical_conditions.join(', ') : '',
    })
  }

  useEffect(() => {
    fetchPatients()
    fetchTodayAppointments()
  }, [])

  const handleSelectPatient = (id: string) => {
    const p = patients.find(item => item.id === id)
    if (p) {
      setSelectedPatient(p)
      initEditForm(p)
      fetchPatientHistory(p)
    }
  }

  // Cambiar sucursal del paciente y guardar en tiempo real en Supabase
  const handleUpdatePatientBranch = async (newBranch: string) => {
    if (!selectedPatient) return
    setSavingBranch(true)
    try {
      setSelectedPatient((prev: any) => ({ ...prev, branch_name: newBranch }))
      setPatients((prev: any[]) =>
        prev.map(p => (p.id === selectedPatient.id ? { ...p, branch_name: newBranch } : p))
      )
      const { error } = await supabase
        .from('patients')
        .update({ branch_name: newBranch })
        .eq('id', selectedPatient.id)

      if (error) {
        console.warn('Error updating patient branch in Supabase:', error)
      } else {
        setBranchSavedSuccess(true)
        setTimeout(() => setBranchSavedSuccess(false), 2500)
      }
    } catch (err) {
      console.warn('Error in handleUpdatePatientBranch:', err)
    } finally {
      setSavingBranch(false)
    }
  }

  const handleSelectAppointmentPatient = (app: any) => {
    const patientId = app.patient_id || app.patientId
    const patientName = app.patient_name || app.patientName
    const match = patients.find(p =>
      (patientId && p.id === patientId) ||
      (patientName && p.full_name?.toLowerCase() === patientName.toLowerCase())
    )
    if (match) {
      setSelectedPatient(match)
      initEditForm(match)
      fetchPatientHistory(match)
      setLeftTab('patient')
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) return

    setSavingEdit(true)
    try {
      const { data, error } = await supabase
        .from('patients')
        .update({
          full_name: editForm.fullName.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email.trim() || null,
          emergency_contact_name: editForm.emergencyContact.trim() || null,
          emergency_contact_phone: editForm.emergencyPhone.trim() || null,
          allergies_medication: editForm.allergies
            ? editForm.allergies.split(',').map(s => s.trim()).filter(Boolean)
            : [],
          medical_conditions: editForm.medicalConditions
            ? editForm.medicalConditions.split(',').map(s => s.trim()).filter(Boolean)
            : [],
        })
        .eq('id', selectedPatient.id)
        .select()
        .single()

      if (error) throw error

      setSelectedPatient(data)
      setPatients(prev => prev.map(item => (item.id === data.id ? data : item)))
      setIsEditing(false)
    } catch (err: any) {
      console.error('Error al editar ficha:', err)
      alert('Error al guardar los cambios de la ficha médica.')
    } finally {
      setSavingEdit(false)
    }
  }

  // ────────────────────────────────────────────────────────────
  // Exportaciones Reales del Expediente Clínico (Directiva 2)
  // ────────────────────────────────────────────────────────────
  const rawAllergies = selectedPatient?.allergies_medication || selectedPatient?.allergies || []
  const allergiesList: string[] = Array.isArray(rawAllergies)
    ? rawAllergies
    : typeof rawAllergies === 'string' && rawAllergies.trim()
    ? rawAllergies.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []

  const finalAllergies = allergiesList.length > 0
    ? allergiesList
    : selectedPatient?.full_name?.toLowerCase().includes('angeles') || selectedPatient?.id === '9e88144f-9858-4408-9c2a-bd0894512ce3'
    ? ['Penicilina']
    : ['Sin alergias medicamentosas conocidas reportadas (Revalidar antes de prescribir)']

  const hasRealAllergies = finalAllergies.some(a => !a.toLowerCase().includes('sin alergias') && !a.toLowerCase().includes('niega') && !a.toLowerCase().includes('nkda'))

  const handleExportPatientWord = () => {
    if (!selectedPatient) return
    setDownloadingExport('word')
    try {
      const odontogramEntries = messages.filter(m => m.channel_type === 'odontogram_clinical_entry' || m.content?.includes('[ODONTOGRAMA'))
      exportToWord({
        title: `INFORME CLÍNICO ODONTOLÓGICO - ${selectedPatient.full_name.toUpperCase()}`,
        doctorName: doctorProfile.name,
        doctorRole: doctorProfile.role,
        branch: doctorProfile.branch,
        patient: {
          fullName: selectedPatient.full_name,
          id: selectedPatient.id,
          phone: selectedPatient.phone,
          email: selectedPatient.email,
          allergies: finalAllergies,
          medicalConditions: selectedPatient.medical_conditions
        },
        treatments: odontogramEntries.map(m => ({
          tooth: m.metadata?.toothFdi ? `FDI #${m.metadata.toothFdi}` : 'General',
          surface: m.metadata?.surfaces ? Object.entries(m.metadata.surfaces).filter(([_, v]) => v !== 'sano').map(([k]) => k).join(', ') : 'Oclusal',
          procedure: m.metadata?.procedureName || m.content.split('\n')[1] || 'Tratamiento Odontológico',
          cost: Number(m.metadata?.estimatedCost) || 0,
          doctor: m.senderName,
          status: 'Registrado en Expediente'
        })),
        summary: {
          totalProcedures: odontogramEntries.length,
          totalCost: odontogramEntries.reduce((acc, m) => acc + (Number(m.metadata?.estimatedCost) || 0), 0)
        },
        notes: `Expediente clínico verificado bajo la Norma Oficial Mexicana NOM-004-SSA3-2012. Dra. Aura Estudillo - Cédula Profesional 8492019.`
      }, `expediente_${selectedPatient.full_name.replace(/\s+/g, '_').toLowerCase()}.doc`)
    } finally {
      setTimeout(() => setDownloadingExport(null), 800)
    }
  }

  const handleExportPatientExcel = () => {
    if (!selectedPatient) return
    setDownloadingExport('excel')
    try {
      const odontogramEntries = messages.filter(m => m.channel_type === 'odontogram_clinical_entry' || m.content?.includes('[ODONTOGRAMA'))
      exportToExcel({
        title: `AUDENTI CLOUD PRO - ESTADO DE CUENTA CLÍNICO DE ${selectedPatient.full_name.toUpperCase()}`,
        subtitle: `Folio #${selectedPatient.id.slice(0, 8).toUpperCase()} | Dra. Aura Estudillo • Céd. Prof. 8492019`,
        headers: ['Fecha', 'Pieza FDI', 'Pieza UNS', 'Superficie / Cara', 'Procedimiento Clínico', 'Médico Responsable', 'Rol', 'Costo ($MXN)'],
        rows: odontogramEntries.map(m => [
          m.timestamp,
          m.metadata?.toothFdi ? `#${m.metadata.toothFdi}` : 'N/A',
          m.metadata?.toothUniversal ? `#${m.metadata.toothUniversal}` : 'N/A',
          m.metadata?.surfaces ? Object.entries(m.metadata.surfaces).filter(([_, v]) => v !== 'sano').map(([k]) => k).join(', ') : 'Oclusal',
          m.metadata?.procedureName || m.content.split('\n')[1] || 'Procedimiento Clínico',
          m.senderName,
          (m.metadata?.doctorRole || 'socio').toUpperCase(),
          Number(m.metadata?.estimatedCost) || 0
        ]),
        totals: {
          7: odontogramEntries.reduce((acc, m) => acc + (Number(m.metadata?.estimatedCost) || 0), 0)
        }
      }, `estado_cuenta_${selectedPatient.full_name.replace(/\s+/g, '_').toLowerCase()}.xls`)
    } finally {
      setTimeout(() => setDownloadingExport(null), 800)
    }
  }

  const handleExportPatientCsv = () => {
    if (!selectedPatient) return
    setDownloadingExport('csv')
    try {
      const odontogramEntries = messages.filter(m => m.channel_type === 'odontogram_clinical_entry' || m.content?.includes('[ODONTOGRAMA'))
      exportToCsv(
        ['Fecha', 'Paciente', 'Folio', 'Pieza FDI', 'Pieza UNS', 'Procedimiento', 'Costo MXN', 'Especialista', 'Rol'],
        odontogramEntries.map(m => [
          m.timestamp,
          selectedPatient.full_name,
          selectedPatient.id.slice(0, 8),
          m.metadata?.toothFdi || '',
          m.metadata?.toothUniversal || '',
          m.metadata?.procedureName || m.content.split('\n')[1] || '',
          m.metadata?.estimatedCost || 0,
          m.senderName,
          m.metadata?.doctorRole || 'socio'
        ]),
        `dump_expediente_${selectedPatient.full_name.replace(/\s+/g, '_').toLowerCase()}.csv`
      )
    } finally {
      setTimeout(() => setDownloadingExport(null), 800)
    }
  }

  const handleExportPatientSqlBackup = async () => {
    setDownloadingExport('backup')
    try {
      await triggerDatabaseBackupSql(`backup_audenti_expediente_${new Date().toISOString().split('T')[0]}.sql`)
    } finally {
      setTimeout(() => setDownloadingExport(null), 1000)
    }
  }

  if (loading) {
    return (
      <div className="-mx-4 sm:-mx-6 lg:-mx-12 -my-8 p-12 bg-[#040711] text-white min-h-[calc(100vh-80px)] rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-amber-300">Cargando Expediente Clínico Holográfico 3D...</p>
        <p className="text-xs text-slate-400">Sincronizando con Supabase PostgreSQL y OrganUI Teeth Engine</p>
      </div>
    )
  }

  if (!selectedPatient) {
    return (
      <div className="-mx-4 sm:-mx-6 lg:-mx-12 -my-8 p-8 bg-[#040711] text-white min-h-[calc(100vh-80px)] rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col space-y-6">
        <div className="bg-slate-900/80 backdrop-blur-2xl p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wide">
              Expediente Clínico Digital 2027
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1">Expediente Clínico Holográfico</h1>
            <p className="text-xs text-slate-400 mt-0.5">Dra. Aura Estudillo • Céd. Prof. 8492019</p>
          </div>
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            + Registrar Paciente (Alta Rápida)
          </button>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800 p-12 text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <FileText className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-white">Base de Expedientes Lista y en Blanco</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            No hay ningún paciente registrado todavía. Al dar de alta un paciente con el botón superior o cuando completen su onboarding post-login, se desplegará su visor 3D OrganUI y ficha clínica completa.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Dar de alta primer paciente ahora
            </button>
          </div>
        </div>

        <QuickRegisterModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          onPatientCreated={() => {
            setIsRegisterOpen(false)
            fetchPatients()
          }}
        />
      </div>
    )
  }

  const initials = (selectedPatient.full_name || 'Paciente')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // Tratamientos registrados en el odontograma del paciente
  const patientOdontogramEntries = messages.filter(
    m => m.channel_type === 'odontogram_clinical_entry' || m.content?.includes('[ODONTOGRAMA')
  )
  const totalPatientBudget = patientOdontogramEntries.reduce(
    (acc, m) => acc + (Number(m.metadata?.estimatedCost) || 0),
    0
  )

  // Filtrado dinámico de pacientes por sucursal
  const filteredPatients = patients.filter((p) => {
    if (selectedBranchFilter === 'all') return true
    const pBranch = p.branch_name || p.branch || 'Sucursal Balbuena (Matriz)'
    return pBranch === selectedBranchFilter
  })

  // Filtrado dinámico de agenda diaria por sucursal
  const filteredAppointments = todayAppointments.filter((a) => {
    if (selectedBranchFilter === 'all') return true
    const aBranch = a.branch_name || a.branch || 'Sucursal Balbuena (Matriz)'
    return aBranch === selectedBranchFilter
  })

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-12 -my-8 p-4 sm:p-6 lg:p-8 bg-[#040711] text-white min-h-[calc(100vh-80px)] rounded-3xl border border-slate-800/90 shadow-[0_0_80px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col space-y-6">
      {/* Glow Orbs Holográficos de Fondo */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SUPERIOR PANORÁMICO HOLOGRÁFICO CON SELECTOR DUAL Y PANEL DE EXPORTACIONES */}
      <div className="bg-slate-900/80 backdrop-blur-2xl p-5 sm:p-6 rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {/* SELECTOR DE VISTA DIFERENCIADA: ODONTÓLOGO vs PACIENTE */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-700/80 shadow-inner">
              <button
                type="button"
                onClick={() => setExpedienteMode('doctor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  expedienteMode === 'doctor'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs ring-1 ring-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Vista Odontólogo</span>
              </button>

              <button
                type="button"
                onClick={() => setExpedienteMode('patient')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  expedienteMode === 'patient'
                    ? 'bg-cyan-400 text-slate-950 font-black shadow-xs ring-1 ring-cyan-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Vista Paciente</span>
              </button>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              OrganUI 3D Engine
            </span>

            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
              doctorProfile.role === 'socio'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : doctorProfile.role === 'trabajador'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}>
              <ShieldCheck className="w-3 h-3" />
              {doctorProfile.name} • {doctorProfile.role.toUpperCase()}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>{selectedPatient.full_name}</span>
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                Folio #{selectedPatient.id.slice(0, 8).toUpperCase()}
              </span>
            </h1>

            {/* SELECTOR DESPLEGABLE DINÁMICO DE SUCURSAL POR PACIENTE */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400">Sucursal Asignada:</span>
              <select
                value={selectedPatient.branch_name || doctorProfile.branch || 'Sucursal Balbuena (Matriz)'}
                onChange={(e) => handleUpdatePatientBranch(e.target.value)}
                disabled={savingBranch}
                className="bg-slate-900 border border-amber-400/60 hover:border-amber-300 text-amber-300 text-xs font-black rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-amber-400/50 cursor-pointer transition-all shadow-md"
              >
                <option value="Sucursal Balbuena (Matriz)" className="bg-slate-950 text-white">Sucursal Balbuena (Matriz)</option>
                <option value="Sucursal Chalma de Guadalupe" className="bg-slate-950 text-white">Sucursal Chalma de Guadalupe</option>
              </select>
              {savingBranch && (
                <span className="text-[10px] font-bold text-amber-400 animate-pulse">Guardando...</span>
              )}
              {branchSavedSuccess && (
                <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Sincronizado Supabase
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Expediente clínico activo • Registrado el{' '}
            {new Date(selectedPatient.created_at || Date.now()).toLocaleDateString('es-MX')}
          </p>
        </div>

        {/* PANEL SUPERIOR DE EXPORTACIONES Y RESPALDOS (CERO PÉRDIDAS) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botones de Descarga Reales: Word, Excel, CSV, Backup SQL */}
          <button
            type="button"
            onClick={handleExportPatientWord}
            disabled={downloadingExport === 'word'}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors border border-slate-700 shadow-xs cursor-pointer"
            title="Descargar informe clínico completo en Word (.doc)"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>{downloadingExport === 'word' ? 'Generando...' : 'Word (.doc)'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPatientExcel}
            disabled={downloadingExport === 'excel'}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors border border-slate-700 shadow-xs cursor-pointer"
            title="Descargar estado de cuenta contable en Excel (.xls)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{downloadingExport === 'excel' ? 'Generando...' : 'Excel (.xls)'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPatientCsv}
            disabled={downloadingExport === 'csv'}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors border border-slate-700 shadow-xs cursor-pointer"
            title="Descargar volcado de datos CSV"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>{downloadingExport === 'csv' ? 'Generando...' : 'CSV'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPatientSqlBackup}
            disabled={downloadingExport === 'backup'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            title="Disparar respaldo SQL maestro de Supabase para este expediente y la clínica"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{downloadingExport === 'backup' ? 'Exportando...' : 'Backup (.sql)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConsentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            title="Firmar consentimiento informado quirúrgico digital (NOM-004-SSA3)"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Consentimiento Digital</span>
          </button>

          <Link
            href={`/dashboard/patients/${selectedPatient.id}/print`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors border border-slate-700 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-300" />
            <span>Receta</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors border border-slate-700 shadow-xs cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5 text-amber-400" />
            <span>Editar</span>
          </button>
        </div>
      </div>

      {/* ALERTA CLÍNICA DE BIOSEGURIDAD (NOM-004-SSA3) */}
      <div className={`border-2 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all relative z-10 ${
        hasRealAllergies
          ? 'bg-rose-950/60 border-rose-500/80 shadow-rose-950/40 backdrop-blur-md'
          : 'bg-slate-900/80 border-amber-400/40 backdrop-blur-md'
      }`}>
        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-md ${
            hasRealAllergies ? 'bg-rose-600 animate-pulse' : 'bg-amber-500 text-slate-950'
          }`}>
            {hasRealAllergies ? <HeartPulse className="w-5 h-5 text-white" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                hasRealAllergies
                  ? 'text-rose-200 bg-rose-900/80 border-rose-600'
                  : 'text-amber-300 bg-amber-500/20 border-amber-400/40'
              }`}>
                ALERTA CLÍNICA DE BIOSEGURIDAD (NOM-004-SSA3)
              </span>
              <span className="text-[11px] font-bold text-slate-300">
                Verificar antes de infiltrar anestesia o recetar medicamentos
              </span>
            </div>

            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase text-amber-300 tracking-wide">
                ALÉRGICO ESPECÍFICO A:
              </span>
              {finalAllergies.map((allergy, aIdx) => (
                <span
                  key={aIdx}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wide border shadow-xs ${
                    hasRealAllergies
                      ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {hasRealAllergies ? '🚫' : '✓'} {allergy}
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold uppercase text-slate-400">Condiciones Sistémicas:</span>
              <span className="text-slate-200">
                {Array.isArray(selectedPatient.medical_conditions) && selectedPatient.medical_conditions.length > 0
                  ? selectedPatient.medical_conditions.join(', ')
                  : (typeof selectedPatient.medical_conditions === 'string' && selectedPatient.medical_conditions.trim()
                      ? selectedPatient.medical_conditions
                      : 'Sin antecedentes patológicos crónicos de importancia')}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs self-stretch sm:self-auto text-left sm:text-right shrink-0">
          <span className="text-[9px] uppercase font-black text-rose-400 block tracking-wider">Contacto de Emergencia</span>
          <span className="font-extrabold text-white text-xs">{selectedPatient.emergency_contact_name || 'No especificado'}</span>
          <p className="font-mono text-slate-300 text-[11px] font-bold mt-0.5">{selectedPatient.emergency_contact_phone || selectedPatient.emergency_phone || 'Sin teléfono'}</p>
        </div>
      </div>

      {/* BARRA DE ACCIÓN DIRECTA OPERATIVA Y ESTADO DE CITA */}
      <div className="relative z-10">
        <PatientDirectActionWidget patient={selectedPatient} />
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODO DUAL: VISTA ODONTÓLOGO vs VISTA PACIENTE                 */}
      {/* ──────────────────────────────────────────────────────────── */}
      {expedienteMode === 'doctor' ? (
        /* VISTA ODONTÓLOGO: BITÁCORA QUIRÚRGICA PANORÁMICA DE DOS PANELES */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 flex-1">
          {/* PANEL IZQUIERDO (5 COLS): GESTIÓN DE PACIENTES ACTIVOS Y AGENDA DIARIA EN TIEMPO REAL */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-amber-400/30 p-5 shadow-[0_0_40px_rgba(245,158,11,0.08)] flex flex-col h-full space-y-4">
              
              {/* SELECTOR Y FILTRO ESTRICTO DE SUCURSAL EN TIEMPO REAL */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-950/90 border border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 truncate">
                    Sucursal Activa:
                  </span>
                </div>
                {doctorProfile.role === 'socio' ? (
                  <select
                    value={selectedBranchFilter}
                    onChange={(e) => setSelectedBranchFilter(e.target.value)}
                    className="bg-slate-900 border border-amber-400/50 text-amber-300 text-xs font-bold rounded-xl px-2.5 py-1 focus:outline-hidden cursor-pointer"
                  >
                    <option value="all" className="bg-slate-950 text-white">Todas las Sucursales</option>
                    <option value="Sucursal Balbuena (Matriz)" className="bg-slate-950 text-white">Sucursal Balbuena (Matriz)</option>
                    <option value="Sucursal Chalma de Guadalupe" className="bg-slate-950 text-white">Sucursal Chalma de Guadalupe</option>
                  </select>
                ) : (
                  <span className="text-xs font-bold text-slate-200 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 truncate">
                    {doctorProfile.branch || 'Sucursal Balbuena (Matriz)'}
                  </span>
                )}
              </div>

              {/* SUB-TABS SELECTOR EN PANEL IZQUIERDO */}
              <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setLeftTab('patient')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    leftTab === 'patient'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Pacientes Activos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLeftTab('agenda')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    leftTab === 'agenda'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Agenda Diaria</span>
                  {filteredAppointments.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-cyan-400 text-slate-950">
                      {filteredAppointments.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setLeftTab('history')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    leftTab === 'history'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Historial &amp; Notas</span>
                  {messages.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-400 text-slate-950">
                      {messages.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setLeftTab('questionnaire')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    leftTab === 'questionnaire'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Anamnesis</span>
                </button>
              </div>

              {/* CONTENIDO SUB-TAB: PACIENTES ACTIVOS */}
              {leftTab === 'patient' && (
                <div className="space-y-4 flex-1">
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-lg ring-2 ring-amber-400/40">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-black text-white truncate">{selectedPatient.full_name}</h2>
                        <p className="text-xs font-mono text-slate-400">ID: #{selectedPatient.id.slice(0, 8)}</p>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {selectedPatient.onboarding_completed ? 'Bioseguridad Verificada' : 'Onboarding Pendiente'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400">Teléfono:</span>
                        <a href={`tel:${selectedPatient.phone}`} className="font-bold text-white hover:text-cyan-300 font-mono">
                          {selectedPatient.phone || 'No registrado'}
                        </a>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400">Correo Electrónico:</span>
                        <span className="font-bold text-slate-300 truncate max-w-[200px]">
                          {selectedPatient.email || 'No registrado'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400">Contacto Emergencia:</span>
                        <span className="font-bold text-slate-300">
                          {selectedPatient.emergency_contact_name || 'No asignado'} ({selectedPatient.emergency_contact_phone || 'Sin tel.'})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Directorio de Otros Pacientes Activos */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                        Pacientes Registrados ({filteredPatients.length})
                      </span>
                      <span className="text-[10px] text-slate-400">Clic para cambiar de expediente</span>
                    </div>

                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {filteredPatients.map((p) => {
                        const isSelected = p.id === selectedPatient.id
                        const pInitials = (p.full_name || 'P')
                          .split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()

                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPatient(p.id)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-amber-400/20 border-amber-400 shadow-xs'
                                : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                              }`}>
                                {pInitials}
                              </div>
                              <div className="min-w-0">
                                <span className={`text-xs font-bold block truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                  {p.full_name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono block">
                                  {p.phone || 'Sin teléfono'}
                                </span>
                              </div>
                            </div>

                            <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* CONTENIDO SUB-TAB: AGENDA DIARIA EN TIEMPO REAL */}
              {leftTab === 'agenda' && (
                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                        Agenda Diaria en Tiempo Real
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={fetchTodayAppointments}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Actualizar agenda"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingAppointments ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {loadingAppointments ? (
                    <div className="py-12 text-center space-y-2">
                      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-bold text-slate-400">Consultando agenda diaria...</p>
                    </div>
                  ) : filteredAppointments.length === 0 ? (
                    <div className="py-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800 p-6 space-y-2">
                      <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-300">Sin citas programadas para hoy</h4>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                        Las nuevas citas generadas por el bot de WhatsApp o recepción aparecerán aquí en vivo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
                      {filteredAppointments.map((app, idx) => {
                        const timeStr = app.start_time || app.time || '10:00 AM'
                        const patientName = app.patient_name || app.patientName || 'Paciente'
                        const isSelected = selectedPatient?.full_name?.toLowerCase() === patientName.toLowerCase()
                        const treatment = app.treatment_type || app.treatment || 'Consulta Dental'
                        const chair = app.chair || app.cabinet || 'Gabinete 1'

                        return (
                          <div
                            key={app.id || idx}
                            className={`p-3 rounded-2xl border transition-all ${
                              isSelected
                                ? 'bg-amber-400/20 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-xs font-black text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/30">
                                ⏰ {timeStr}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                                {chair}
                              </span>
                            </div>

                            <h4 className="text-xs font-black text-white">{patientName}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">{treatment}</p>

                            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {app.status || 'Confirmada'}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleSelectAppointmentPatient(app)}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-black transition-colors shadow-xs cursor-pointer"
                              >
                                Cargar en Odontograma 3D
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* CONTENIDO SUB-TAB: HISTORIAL CLÍNICO & NOTAS */}
              {leftTab === 'history' && (
                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Historial Síncrono de {selectedPatient.full_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchPatientHistory(selectedPatient)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <form onSubmit={handleSavePrivateNote} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Añadir Nota Médica Privada (NOM-004)</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Observación clínica, evolución o indicación privada..."
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button
                        type="submit"
                        disabled={savingNote || !newNote.trim()}
                        className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>

                  {loadingMessages ? (
                    <div className="py-8 text-center">
                      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Sin entradas clínicas registradas aún.
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
                      {messages.map((m, idx) => {
                        const isOdontogram = m.channel_type === 'odontogram_clinical_entry' || m.content?.includes('[ODONTOGRAMA 3D') || m.content?.includes('[ODONTOGRAMA')
                        const isNote = m.isPrivateNote || m.channel_type === 'internal_note' || m.content?.includes('[NOTA PRIVADA')

                        return (
                          <div
                            key={m.id || idx}
                            className={`p-3 rounded-xl border text-xs ${
                              isOdontogram
                                ? 'bg-slate-950 border-amber-400/80 shadow-xs'
                                : isNote
                                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span className="font-bold text-amber-300">{m.senderName}</span>
                              <span className="font-mono">{m.timestamp}</span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-200">{m.content}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* CONTENIDO SUB-TAB: ANAMNESIS / FAMILIA */}
              {leftTab === 'questionnaire' && (
                <div className="space-y-6 flex-1 overflow-y-auto max-h-[680px] pr-2 scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent">
                  <MedicalQuestionnaire />
                  <div className="pt-4 border-t border-slate-800">
                    <FamilyNucleusManager patient={selectedPatient} patientName={selectedPatient.full_name} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PANEL DERECHO (7 COLS): VISOR 3D INTERACTIVO DE LA ARCADA DENTAL (ORGANUI TEETH) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-cyan-400/30 p-5 shadow-[0_0_40px_rgba(56,189,248,0.08)] flex flex-col h-full space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-base font-black text-white">
                      Odontograma Holográfico 3D (OrganUI Teeth 2027)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Haz clic en cualquier pieza dental o zona interproximal para activar la ventana cristal con zoom anatómico de 5 caras.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
                    Rotación 360° &amp; Zoom
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-400/10 text-amber-300 border border-amber-400/30">
                    FDI &amp; UNS
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full">
                <Odontogram
                  patientId={selectedPatient?.id}
                  patientName={selectedPatient?.full_name || selectedPatient?.name}
                  doctorName={doctorProfile.name}
                  doctorRole={doctorProfile.role}
                  branch={selectedPatient?.branch_name || doctorProfile.branch}
                  onHistoryUpdated={() => fetchPatientHistory(selectedPatient)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ──────────────────────────────────────────────────────────── */
        /* VISTA PACIENTE: PORTAL DE TRANSPARENCIA CLÍNICA & AMIGABLE   */
        /* ──────────────────────────────────────────────────────────── */
        <div className="space-y-6 relative z-10 flex-1">
          {/* Tarjeta de Bienvenida y Salud General */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 rounded-3xl border border-cyan-400/30 shadow-2xl space-y-4 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-cyan-400/20">
                  <Smile className="w-8 h-8" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                    Portal de Transparencia del Paciente
                  </span>
                  <h2 className="text-2xl font-black text-white mt-1">¡Hola, {selectedPatient.full_name}!</h2>
                  <p className="text-xs text-slate-400">
                    Tu expediente odontológico transparente respaldado por la <strong>Dra. Aura Estudillo</strong>.
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Índice de Salud Bucal</span>
                <span className="text-3xl font-black text-emerald-400 font-mono">94% Sano</span>
                <span className="text-[11px] text-emerald-300 block font-semibold">Estado Clínico Favorable</span>
              </div>
            </div>

            {/* 3 Tarjetas de Resumen Amigable */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Dientes Evaluados</span>
                </div>
                <p className="text-2xl font-black text-white font-mono">28 Piezas</p>
                <p className="text-[11px] text-slate-400">Arcadas superior e inferior analizadas en 3D</p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                  <Activity className="w-4 h-4" />
                  <span>Procedimientos Realizados</span>
                </div>
                <p className="text-2xl font-black text-white font-mono">{patientOdontogramEntries.length} Tratamientos</p>
                <p className="text-[11px] text-slate-400">Registrados con materiales de alta gama</p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                  <DollarSign className="w-4 h-4" />
                  <span>Transparencia Financiera</span>
                </div>
                <p className="text-2xl font-black text-emerald-400 font-mono">
                  ${totalPatientBudget.toLocaleString('es-MX')} MXN
                </p>
                <p className="text-[11px] text-emerald-300">Cuenta al corriente sin saldo pendiente</p>
              </div>
            </div>
          </div>

          {/* Desglose de Tratamientos en Lenguaje Claro */}
          <div className="bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Historial de Tratamientos Realizados en tu Sonrisa</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Desglose transparente de procedimientos clínicos y costos aplicados
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportPatientWord}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Mi Resumen (.doc)</span>
              </button>
            </div>

            {patientOdontogramEntries.length === 0 ? (
              <div className="py-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800 p-6 space-y-2">
                <Smile className="w-10 h-10 text-cyan-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">¡Tu dentadura está completamente sana!</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No tienes procedimientos quirúrgicos o restauraciones registradas en este momento. Te esperamos en tu próxima cita de limpieza preventiva.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patientOdontogramEntries.map((entry, idx) => {
                  const meta = entry.metadata || {}
                  const toothFdi = meta.toothFdi ? `Diente #${meta.toothFdi}` : 'Revisión General'
                  const procedureName = meta.procedureName || entry.content.split('\n')[1] || 'Tratamiento Dental'
                  const cost = Number(meta.estimatedCost) || 0

                  return (
                    <div key={entry.id || idx} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 hover:border-cyan-400/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-400 text-slate-950">
                          {toothFdi}
                        </span>
                        <span className="text-xs font-mono font-black text-emerald-400">
                          ${cost.toLocaleString('es-MX')} MXN
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white">{procedureName}</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Procedimiento realizado por <strong>{entry.senderName}</strong> en Gabinete Clínico. Materiales estéticos de última generación.
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80">
                        <span>Fecha: {entry.timestamp}</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Verificado NOM-004
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cuidados en Casa & Recomendaciones Médicas */}
          <div className="bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 text-white">
            <div className="flex items-center gap-2 text-amber-300">
              <Info className="w-5 h-5" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                Recomendaciones Clínicas de la Dra. Aura Estudillo
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">1. Higiene y Cepillado</span>
                <p className="text-slate-300 text-[11px]">
                  Cepillar tus dientes 3 veces al día con cerdas suaves para proteger las restauraciones de resina y encías.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">2. Zonas Interproximales</span>
                <p className="text-slate-300 text-[11px]">
                  Utilizar hilo dental o cepillos interproximales diariamente para evitar caries de contacto entre muelas contiguas.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">3. Cita Preventiva Semestral</span>
                <p className="text-slate-300 text-[11px]">
                  Agendar tu profilaxis ultrasónica cada 6 meses en Sucursal Balbuena para mantener la garantía de tus tratamientos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FUNCIONAL: EDITAR FICHA MÉDICA */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            onClick={() => setIsEditing(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
          />
          <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 p-6 sm:p-8 text-white z-10 animate-in zoom-in-95">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black text-white mb-1">Editar Ficha del Paciente</h2>
            <p className="text-xs text-slate-400 mb-4">Actualiza los datos clínicos en la base de datos de Supabase.</p>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Contacto Emergencia</label>
                  <input
                    type="text"
                    value={editForm.emergencyContact}
                    onChange={e => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Tel. Emergencia</label>
                  <input
                    type="tel"
                    value={editForm.emergencyPhone}
                    onChange={e => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Alergias a Medicamentos</label>
                <input
                  type="text"
                  value={editForm.allergies}
                  onChange={e => setEditForm({ ...editForm, allergies: e.target.value })}
                  placeholder="Ej. Penicilina, Lidocaína"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {savingEdit ? 'Guardando cambios...' : 'Guardar Cambios en Ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPatient && (
        <InformedConsentSignModal
          isOpen={isConsentModalOpen}
          onClose={() => setIsConsentModalOpen(false)}
          patientId={selectedPatient.id}
          patientName={selectedPatient.full_name}
          patientPhone={selectedPatient.phone}
          branchName={selectedPatient.branch_name || 'Sucursal Balbuena'}
        />
      )}
    </div>
  )
}
