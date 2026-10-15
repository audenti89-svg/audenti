'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ShieldCheck, UserCheck, HeartPulse, PhoneCall, AlertTriangle } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    drug_allergies: '',
    medical_conditions: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado. Por favor inicia sesión nuevamente.');

      // 1. Obtener tenant y branch por defecto si existen
      const { data: defaultTenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
      const { data: defaultBranch } = await supabase.from('branches').select('id').limit(1).maybeSingle();

      // 2. Insertar o actualizar paciente en `patients` vinculando por id y user_id
      const patientPayload: any = {
        id: user.id,
        user_id: user.id,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: user.email,
        emergency_contact_name: formData.emergency_contact_name.trim(),
        emergency_contact_phone: formData.emergency_contact_phone.trim(),
        allergies_medication: formData.drug_allergies
          ? formData.drug_allergies.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        medical_conditions: formData.medical_conditions
          ? formData.medical_conditions.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        onboarding_completed: true,
      };

      if (defaultTenant?.id) patientPayload.tenant_id = defaultTenant.id;
      if (defaultBranch?.id) patientPayload.branch_id = defaultBranch.id;

      const { error: patientErr } = await supabase
        .from('patients')
        .upsert(patientPayload, { onConflict: 'id' });

      if (patientErr) {
        console.warn('Upsert directo en patients:', patientErr);
        // Intentar fallback sin foreign keys opcionales si fallara por RLS o FK
        const fallbackPayload: any = {
          id: user.id,
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          email: user.email,
          emergency_contact_name: formData.emergency_contact_name.trim(),
          emergency_contact_phone: formData.emergency_contact_phone.trim(),
          onboarding_completed: true,
        };
        const { error: fallbackErr } = await supabase.from('patients').upsert(fallbackPayload, { onConflict: 'id' });
        if (fallbackErr) throw fallbackErr;
      }

      // 3. Registrar o actualizar cuestionario médico de soporte
      try {
        await supabase.from('medical_questionnaires').upsert({
          patient_id: user.id,
          emergency_contact_name: formData.emergency_contact_name.trim(),
          emergency_contact_phone: formData.emergency_contact_phone.trim(),
          allergies: formData.drug_allergies
            ? formData.drug_allergies.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          chronic_diseases: formData.medical_conditions
            ? formData.medical_conditions.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          completed_at: new Date().toISOString(),
        }, { onConflict: 'patient_id' });
      } catch {
        // Soporte adicional silencioso
      }

      // 4. Actualizar tabla users si existe perfil de usuario
      try {
        await supabase.from('users').update({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          onboarding_completed: true,
        }).eq('id', user.id);
      } catch {
        // Soporte adicional silencioso
      }

      // Redirigir al dashboard con sesión médica confirmada
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error al guardar datos de onboarding:', err);
      setErrorMsg(err?.message || 'Hubo un error al guardar tu información médica obligatoria.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E131F] flex items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Decoración institucional Audenti */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E3A033]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#202D4C]/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mb-6 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E3A033]/20 text-[#E3A033] border border-[#E3A033]/30 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Bioseguridad Clínica Obligatoria
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Audenti — Configuración de Expediente
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dra. Aura Estudillo • Céd. Prof. 8492019 | Por protocolo médico legal, registra tus datos vitales para habilitar tu portal clínico.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs font-medium text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#E3A033]" /> Nombre Completo Real
            </label>
            <input
              type="text"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#E3A033] focus:ring-1 focus:ring-[#E3A033] transition-all"
              placeholder="Ej. María Elena Sánchez Pérez"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-[#E3A033]" /> Teléfono Celular de Contacto
            </label>
            <input
              type="tel"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#E3A033] focus:ring-1 focus:ring-[#E3A033] transition-all"
              placeholder="55 1234 5678"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Contacto de Emergencia (Nombre)
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#E3A033] focus:ring-1 focus:ring-[#E3A033] transition-all"
                placeholder="Familiar o cercano"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Teléfono de Emergencia
              </label>
              <input
                type="tel"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#E3A033] focus:ring-1 focus:ring-[#E3A033] transition-all"
                placeholder="Número de urgencia"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" /> Alergias a Medicamentos o Anestesia (Separar por comas)
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#E3A033] focus:ring-1 focus:ring-[#E3A033] transition-all"
              placeholder="Ej. Lidocaína, Penicilina, Látex o Ninguna"
              value={formData.drug_allergies}
              onChange={(e) => setFormData({ ...formData, drug_allergies: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Condiciones Médicas / Enfermedades Crónicas
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#E3A033] focus:ring-1 focus:ring-[#E3A033] transition-all"
              placeholder="Ej. Hipertensión, Diabetes, Embarazo o Ninguna"
              value={formData.medical_conditions}
              onChange={(e) => setFormData({ ...formData, medical_conditions: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-[#E3A033] to-[#c78820] hover:from-[#f0ab3d] hover:to-[#d69324] text-slate-950 font-black rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Registrando Bioseguridad...
              </>
            ) : (
              'Completar Expediente y Acceder al Portal'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
