'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado');

      // 1. Obtener tenant y branch por defecto si existen
      const { data: defaultTenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
      const { data: defaultBranch } = await supabase.from('branches').select('id').limit(1).maybeSingle();

      // 2. Actualizar o insertar paciente en la tabla 'patients'
      const patientPayload: any = {
        user_id: user.id,
        full_name: formData.full_name,
        phone: formData.phone,
        email: user.email,
      };

      if (defaultTenant?.id) patientPayload.tenant_id = defaultTenant.id;
      if (defaultBranch?.id) patientPayload.branch_id = defaultBranch.id;

      const { data: patientRecord, error: patientErr } = await supabase
        .from('patients')
        .upsert(patientPayload, { onConflict: 'user_id' })
        .select('id')
        .maybeSingle();

      if (patientErr) {
        console.warn('Nota en patients upsert:', patientErr);
      }

      // 3. Registrar o actualizar el cuestionario médico estructurado
      const patientId = patientRecord?.id;
      if (patientId) {
        await supabase.from('medical_questionnaires').upsert({
          patient_id: patientId,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
          allergies: formData.drug_allergies ? formData.drug_allergies.split(',').map(s => s.trim()) : [],
          chronic_diseases: formData.medical_conditions ? formData.medical_conditions.split(',').map(s => s.trim()) : [],
          completed_at: new Date().toISOString()
        }, { onConflict: 'patient_id' });
      }

      // 4. Marcar usuario con onboarding completado
      await supabase.from('users').update({
        full_name: formData.full_name,
        phone: formData.phone,
        onboarding_completed: true
      }).eq('id', user.id);

      router.push('/dashboard');
    } catch (err) {
      console.error('Error al guardar datos de onboarding:', err);
      alert('Hubo un error al guardar tu información médica.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 text-slate-900">
      <div className="max-w-xl w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-[#202D4C]">Audenti — Configuración de Expediente</h1>
          <p className="text-sm text-slate-600">Dra. Aura Estudillo | Por tu seguridad, necesitamos estos datos clínicos obligatorios antes de continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nombre Completo Real</label>
            <input 
              type="text" 
              required
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#202D4C] outline-none"
              placeholder="Ej. María Elena Sánchez Pérez"
              value={formData.full_name}
              onChange={e => setFormData({...formData, full_name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Teléfono Celular de Contacto</label>
            <input 
              type="tel" 
              required
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#202D4C] outline-none"
              placeholder="55 1234 5678"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Contacto de Emergencia (Nombre)</label>
              <input 
                type="text" 
                required
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#202D4C] outline-none"
                placeholder="Familiar o cercano"
                value={formData.emergency_contact_name}
                onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Teléfono de Emergencia</label>
              <input 
                type="tel" 
                required
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#202D4C] outline-none"
                placeholder="Número de urgencia"
                value={formData.emergency_contact_phone}
                onChange={e => setFormData({...formData, emergency_contact_phone: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Alergias a Medicamentos o Anestesia (Separadas por comas)</label>
            <input 
              type="text" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#202D4C] outline-none"
              placeholder="Ej. Penicilina, Lidocaína, Ninguna"
              value={formData.drug_allergies}
              onChange={e => setFormData({...formData, drug_allergies: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Condiciones Médicas / Enfermedades Crónicas</label>
            <input 
              type="text" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#202D4C] outline-none"
              placeholder="Ej. Hipertensión, Diabetes, Embarazo, Ninguna"
              value={formData.medical_conditions}
              onChange={e => setFormData({...formData, medical_conditions: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-[#202D4C] text-white font-bold rounded-lg hover:bg-[#151e33] transition-colors mt-6"
          >
            {loading ? 'Guardando expediente...' : 'Guardar y Acceder al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
