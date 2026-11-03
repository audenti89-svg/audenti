'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ShieldCheck, UserCheck, HeartPulse, PhoneCall, AlertTriangle, QrCode, Sparkles } from 'lucide-react';

const BRANCHES = [
  { id: '00000000-0000-0000-0000-000000000001', code: 'balbuena', name: 'Sucursal Balbuena (Matriz)' },
  { id: '00000000-0000-0000-0000-000000000002', code: 'guadalupe-chalma', name: 'Sucursal Chalma de Guadalupe' },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    birth_year: '',
    phone: '',
    tenant_id: BRANCHES[0].id, // Sede por defecto
    emergency_contact_name: '',
    emergency_contact_phone: '',
    drug_allergies: '',
    medical_conditions: '',
    referral_source: 'Recomendación de familiar o amigo',
    referred_by: '',
    qr_code_id: '',
  });

  // Capturar parámetros de campaña (?ref=, ?canal=, ?utm_source=, ?qr=)
  useEffect(() => {
    const refParam = searchParams.get('ref') || (typeof window !== 'undefined' ? sessionStorage.getItem('audenti_ref') : null);
    const canalParam = searchParams.get('canal') || searchParams.get('utm_source') || (typeof window !== 'undefined' ? sessionStorage.getItem('audenti_canal') : null);
    const qrParam = searchParams.get('qr') || (typeof window !== 'undefined' ? sessionStorage.getItem('audenti_qr') : null);

    if (canalParam) {
      const lower = canalParam.toLowerCase();
      if (lower.includes('tiktok')) setFormData(prev => ({ ...prev, referral_source: 'TikTok' }));
      else if (lower.includes('instagram')) setFormData(prev => ({ ...prev, referral_source: 'Instagram' }));
      else if (lower.includes('youtube')) setFormData(prev => ({ ...prev, referral_source: 'YouTube' }));
      else if (lower.includes('facebook')) setFormData(prev => ({ ...prev, referral_source: 'Facebook' }));
      else if (lower.includes('qr')) setFormData(prev => ({ ...prev, referral_source: 'Código QR' }));
    }

    if (qrParam) {
      setFormData(prev => ({ ...prev, referral_source: 'Código QR', qr_code_id: qrParam }));
    }

    if (refParam) {
      setFormData(prev => ({ ...prev, referral_source: 'Recomendación de familiar o amigo', referred_by: refParam }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado. Por favor inicia sesión nuevamente.');

      // 1. Obtener tenant y branch de respaldo si existen en la BD
      const { data: defaultBranch } = await supabase.from('branches').select('id').limit(1).maybeSingle();

      const parsedAge = formData.age ? parseInt(formData.age, 10) : (formData.birth_year ? new Date().getFullYear() - parseInt(formData.birth_year, 10) : null);

      // Normalizar canal de adquisición para Atribución Comercial y BI
      const channelMap: Record<string, string> = {
        'TikTok': 'tiktok',
        'Instagram': 'instagram',
        'YouTube': 'youtube',
        'Facebook': 'facebook',
        'Recomendación de familiar o amigo': 'referral',
        'Código QR': 'qr',
        'Búsqueda en Google / Otro': 'otro',
      };
      const normalizedChannel = channelMap[formData.referral_source] || 'otro';

      // 2. Insertar o actualizar paciente en `patients` vinculando por id y user_id
      const patientPayload: any = {
        id: user.id,
        user_id: user.id,
        auth_user_id: user.id,
        full_name: formData.full_name.trim(),
        age: parsedAge,
        phone: formData.phone.trim(),
        email: user.email,
        tenant_id: formData.tenant_id,
        emergency_contact_name: formData.emergency_contact_name.trim(),
        emergency_contact_phone: formData.emergency_contact_phone.trim(),
        emergency_phone: formData.emergency_contact_phone.trim(),
        allergies: formData.drug_allergies ? [formData.drug_allergies.trim()] : [],
        allergies_medication: formData.drug_allergies
          ? formData.drug_allergies.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        medical_conditions: formData.medical_conditions
          ? formData.medical_conditions.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        referral_source: formData.referral_source,
        acquisition_channel: normalizedChannel,
        qr_code_id: formData.qr_code_id?.trim() || null,
        referred_by: formData.referral_source === 'Recomendación de familiar o amigo' ? formData.referred_by.trim() : null,
        referrer_name: formData.referral_source === 'Recomendación de familiar o amigo' ? formData.referred_by.trim() : null,
        branch_id: BRANCHES.find(b => b.id === formData.tenant_id)?.code || 'balbuena',
        branch_name: BRANCHES.find(b => b.id === formData.tenant_id)?.name || 'Sucursal Balbuena (Matriz)',
        attribution_status: (formData.referred_by?.trim() || formData.qr_code_id?.trim() || (normalizedChannel && normalizedChannel !== 'otro')) ? 'completed' : 'pending_review',
        onboarding_completed: true,
      };

      // Si viene con código de referido AUD- o nombre de referente, buscar referrer_id
      if (formData.referred_by?.trim()) {
        const refSearch = formData.referred_by.trim().toUpperCase();
        const { data: refPatient } = await supabase
          .from('patients')
          .select('id')
          .or(`referral_code.eq.${refSearch},full_name.ilike.%${formData.referred_by.trim()}%`)
          .limit(1)
          .maybeSingle();

        if (refPatient?.id) {
          patientPayload.referrer_id = refPatient.id;
        }
      }

      if (defaultBranch?.id) patientPayload.branch_id = defaultBranch.id;

      const { error: patientErr } = await supabase
        .from('patients')
        .upsert(patientPayload, { onConflict: 'id' });

      if (patientErr) {
        console.warn('Upsert directo en patients:', patientErr);
        // Fallback conservando la sede seleccionada
        const fallbackPayload: any = {
          id: user.id,
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          email: user.email,
          tenant_id: formData.tenant_id,
          branch_name: formData.tenant_id === '00000000-0000-0000-0000-000000000002' ? 'Sucursal Chalma de Guadalupe' : 'Sucursal Valbuena (Matriz)',
          emergency_contact_name: formData.emergency_contact_name.trim(),
          emergency_contact_phone: formData.emergency_contact_phone.trim(),
          acquisition_channel: normalizedChannel,
          referrer_name: formData.referred_by?.trim() || null,
          qr_code_id: formData.qr_code_id?.trim() || null,
          onboarding_completed: true,
        };
        const { error: fallbackErr } = await supabase.from('patients').upsert(fallbackPayload, { onConflict: 'id' });
        if (fallbackErr) throw fallbackErr;
      }

      // Incrementar contador de referidos del embajador si se vinculó
      if (patientPayload.referrer_id) {
        try {
          await supabase.rpc('increment_referral_count', { referrer: patientPayload.referrer_id });
        } catch {}
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

      // 4. Sincronizar tabla users (perfiles) con datos de atribución
      try {
        await supabase.from('users').update({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          acquisition_channel: normalizedChannel,
          referrer_name: formData.referred_by?.trim() || null,
          qr_code_id: formData.qr_code_id?.trim() || null,
          onboarding_completed: true,
        }).eq('id', user.id);
      } catch {
        // Soporte adicional silencioso
      }

      // Redirigir al Portal del Paciente
      router.push('/portal');
      router.refresh();
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

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wide">
              Sede o Sucursal Más Cercana *
            </label>
            <select
              value={formData.tenant_id}
              onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
              className="w-full bg-[#0d1322] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 cursor-pointer"
              required
            >
              {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Selecciona la clínica a la que deseas acudir para que la Dra. Aura reciba tu expediente en la sede correspondiente.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Edad Cumplida
              </label>
              <input
                type="number"
                min="1"
                max="120"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#E3A033] focus:ring-1 focus:ring-[#E3A033] transition-all"
                placeholder="Ej. 34"
                value={formData.age}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    age: val,
                    birth_year: val ? String(new Date().getFullYear() - parseInt(val, 10)) : ''
                  });
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Año de Nacimiento
              </label>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#E3A033] focus:ring-1 focus:ring-[#E3A033] transition-all"
                placeholder="Ej. 1990"
                value={formData.birth_year}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    birth_year: val,
                    age: val ? String(new Date().getFullYear() - parseInt(val, 10)) : formData.age
                  });
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-[#E3A033]" /> Teléfono Celular (WhatsApp) *
            </label>
            <input
              type="tel"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#E3A033] focus:ring-1 focus:ring-[#E3A033] transition-all font-mono"
              placeholder="55 1234 5678"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 13) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Contacto de Emergencia
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#E3A033] focus:ring-1 focus:ring-[#E3A033] transition-all"
                placeholder="Nombre de familiar"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#E3A033] focus:ring-1 focus:ring-[#E3A033] transition-all font-mono"
                placeholder="55 9876 5432"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-[#E3A033]" /> Alergias a Medicamentos
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
              onChange={(e) => setFormData({ ...formData, medical_conditions: e.target.value })}
            />
          </div>

          {/* CAPTURA DE ORIGEN Y ATRIBUCIÓN COMERCIAL */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                ¿Cómo te enteraste de nosotros? *
              </label>
              <select
                value={formData.referral_source}
                onChange={(e) => setFormData({ ...formData, referral_source: e.target.value })}
                className="w-full bg-[#0d1322] border border-gray-800 rounded-xl px-4 py-3 text-white text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                required
              >
                <option value="Recomendación de familiar o amigo">Recomendación de familiar o amigo</option>
                <option value="TikTok">TikTok</option>
                <option value="Instagram">Instagram</option>
                <option value="YouTube">YouTube</option>
                <option value="Facebook">Facebook</option>
                <option value="Código QR">Código QR (Material Físico / Digital)</option>
                <option value="Búsqueda en Google / Otro">Búsqueda en Google / Otro</option>
              </select>
            </div>

            {formData.referral_source === 'Código QR' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                  Código QR o Material Físico Escaneado
                </label>
                <select
                  value={formData.qr_code_id}
                  onChange={(e) => setFormData({ ...formData, qr_code_id: e.target.value })}
                  className="w-full bg-[#0d1322] border border-emerald-500/50 rounded-xl px-4 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="">Selecciona el punto de escaneo...</option>
                  <option value="qr_balbuena_01">qr_balbuena_01 — Recepción Clínica Balbuena</option>
                  <option value="qr_tarjeta_presentacion">qr_tarjeta_presentacion — Tarjeta Dra. Aura</option>
                  <option value="qr_redes_tiktok">qr_redes_tiktok — Campaña TikTok</option>
                  <option value="qr_instagram_bio">qr_instagram_bio — Instagram Bio</option>
                  <option value="qr_otro">qr_otro — Folleto / Volante Físico</option>
                </select>
              </div>
            )}

            {formData.referral_source === 'Recomendación de familiar o amigo' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                  ¿Quién te recomendó? (Nombre o Código AUD- del paciente referente) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. AUD-8492 o Carlos Martínez"
                  value={formData.referred_by}
                  onChange={(e) => setFormData({ ...formData, referred_by: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-amber-500/50 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all text-xs"
                />
              </div>
            )}
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

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0E131F] flex items-center justify-center text-slate-400 text-xs">
        Cargando formulario de bioseguridad...
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
