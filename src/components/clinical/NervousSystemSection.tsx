'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Save,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';

export interface NerveBranchInfo {
  id: string;
  name: string;
  code: string;
  description: string;
  clinicalImpact: string;
}

export const NERVE_BRANCHES: NerveBranchInfo[] = [
  {
    id: 'v1',
    name: 'Nervio Oftálmico (Par V - Rama V1)',
    code: 'V1-OFT',
    description: 'Inervación sensorial de la frente, párpado superior y dorso de la nariz.',
    clinicalImpact: 'Dolor referido hacia la región frontal o supraorbitaria en cefaleas o sinusitis.'
  },
  {
    id: 'v2',
    name: 'Nervio Maxilar (Par V - Rama V2)',
    code: 'V2-MAX',
    description: 'Inervación del maxilar superior, encía superior, dientes superiores y seno maxilar.',
    clinicalImpact: 'Zona de bloqueo para cirugías maxilares, elevación de seno y molares superiores.'
  },
  {
    id: 'v3',
    name: 'Nervio Mandibular (Par V - Rama V3)',
    code: 'V3-MAND',
    description: 'Rama mixta motora y sensitiva de la mandíbula, piso de boca y dientes inferiores.',
    clinicalImpact: 'Tronco principal para anestesia alveolar inferior y cirugía de terceros molares.'
  },
  {
    id: 'alveolar_inferior',
    name: 'Nervio Alveolar Inferior (Dentario Inferior)',
    code: 'NAI-MAND',
    description: 'Recorre el conducto mandibular inervando las raíces de molares y premolares inferiores.',
    clinicalImpact: 'Cercanía crítica con raíces de terceros molares (muelas del juicio). Riesgo de parestesia temporal.'
  },
  {
    id: 'alveolar_superior',
    name: 'Nervio Alveolar Superior (Ant / Med / Post)',
    code: 'NAS-MAX',
    description: 'Plexo nervioso para caninos, premolares y molares del maxilar superior.',
    clinicalImpact: 'Sensibilidad en cámara pulpar y ligamento periodontal ante pulpitis o caries profunda.'
  },
  {
    id: 'mentoniano',
    name: 'Nervio Mentoniano',
    code: 'N-MENT',
    description: 'Emerge del agujero mentoniano a la altura de los premolares inferiores hacia labio y mentón.',
    clinicalImpact: 'Zona a respetar en colocación de implantes anteriores e incisiones de colgajo.'
  },
  {
    id: 'lingual',
    name: 'Nervio Lingual',
    code: 'N-LING',
    description: 'Provee sensibilidad somatosensorial a los dos tercios anteriores de la lengua y encía lingual.',
    clinicalImpact: 'Ubicado en la vertiente lingual mandibular. Crucial preservación en extracciones complejas.'
  },
  {
    id: 'infraorbitario',
    name: 'Nervio Infraorbitario',
    code: 'N-INFRA',
    description: 'Emerge debajo de la órbita inervando labio superior, ala de la nariz y dientes anteriores.',
    clinicalImpact: 'Bloqueo anestésico estético para carillas anteriores y cirugía periodontal.'
  },
  {
    id: 'pulpar_periodontal',
    name: 'Plexo Pulpar y Ligamento Periodontal',
    code: 'PLEX-PULP',
    description: 'Fibras A-delta y C responsables de la propiocepción, dolor agudo y sensibilidad térmica.',
    clinicalImpact: 'Indicador directo de vitalidad pulpar, periodontitis apical y respuesta a percusión.'
  },
  {
    id: 'atm',
    name: 'Articulación Temporomandibular (ATM) & Auriculotemporal',
    code: 'ATM-AURIC',
    description: 'Inervación capsular y articular de la mandíbula con base de cráneo.',
    clinicalImpact: 'Dolor por bruxismo, chasquido articular, trismus o fatiga muscular masticatoria.'
  },
  {
    id: 'par_vii',
    name: 'Referencia VII Par (Nervio Facial - Motricidad y Mímica)',
    code: 'PAR-VII',
    description: 'Control motor de los músculos de la expresión facial y mímica labial.',
    clinicalImpact: 'Descarte de parálisis facial transitoria por difusión de anestesia en glándula parótida.'
  }
];

export type SensorySymptom =
  | 'ninguno'
  | 'dolor_agudo_pulpar'
  | 'dolor_sordo_constante'
  | 'parestesia_entumecimiento'
  | 'hiperestesia_sensibilidad'
  | 'neuralgia_descarga'
  | 'ardor_urente'
  | 'fatiga_muscular_atm';

export interface NervousEvaluationRecord {
  id: string;
  patientId: string;
  nerveBranch: string;
  side: 'derecho' | 'izquierdo' | 'bilateral';
  symptom: SensorySymptom;
  patientExplanation: string;
  clinicalConduct: string;
  doctorName: string;
  date: string;
}

export interface NervousSystemSectionProps {
  patientId?: string;
  patientName?: string;
  doctorName?: string;
  branchName?: string;
  onRecordSaved?: (record: NervousEvaluationRecord) => void;
}

export function NervousSystemSection({
  patientId,
  patientName = 'Paciente General',
  doctorName = 'Dra. Aura Estudillo',
  branchName = 'Sede Matriz — Jardín Balbuena',
  onRecordSaved
}: NervousSystemSectionProps) {
  const supabase = createClient();
  const [selectedBranch, setSelectedBranch] = useState<string>('alveolar_inferior');
  const [selectedSide, setSelectedSide] = useState<'derecho' | 'izquierdo' | 'bilateral'>('derecho');
  const [selectedSymptom, setSelectedSymptom] = useState<SensorySymptom>('dolor_agudo_pulpar');
  const [patientExplanation, setPatientExplanation] = useState<string>(
    'Se le explica al paciente que la sensibilidad corresponde a una inflamación pulpar o cercanía anatómica del nervio, descartando lesión permanente y estableciendo medidas preventivas.'
  );
  const [clinicalConduct, setClinicalConduct] = useState<string>(
    'Monitoreo clínico a las 48 horas, anestesia troncular guiada y protección con medicamentos desinflamatorios.'
  );
  const [history, setHistory] = useState<NervousEvaluationRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cargar registros previos de inervación para este paciente
  useEffect(() => {
    if (!patientId) return;
    const fetchHistory = async () => {
      try {
        const { data: dbRecords } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('patient_id', patientId)
          .eq('channel_type', 'nervous_system_evaluation')
          .order('created_at', { ascending: false });

        if (dbRecords && dbRecords.length > 0) {
          const parsed: NervousEvaluationRecord[] = dbRecords.map((r: any) => ({
            id: r.id,
            patientId: r.patient_id,
            nerveBranch: r.metadata?.nerveBranch || 'alveolar_inferior',
            side: r.metadata?.side || 'derecho',
            symptom: r.metadata?.symptom || 'dolor_agudo_pulpar',
            patientExplanation: r.metadata?.patientExplanation || r.content,
            clinicalConduct: r.metadata?.clinicalConduct || '',
            doctorName: r.sender_name || 'Dra. Aura Estudillo',
            date: new Date(r.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
          }));
          setHistory(parsed);
        }
      } catch (err) {
        console.warn('Nota cargando historial de sistema nervioso:', err);
      }
    };
    fetchHistory();
  }, [patientId, supabase]);

  const currentBranchInfo = NERVE_BRANCHES.find((b) => b.id === selectedBranch) || NERVE_BRANCHES[3];

  const handleSaveEvaluation = async () => {
    if (!patientId) {
      alert('Por favor selecciona un paciente antes de registrar la evaluación neurológica.');
      return;
    }

    try {
      setIsSaving(true);
      const newRecord: NervousEvaluationRecord = {
        id: `nerve-${Date.now()}`,
        patientId,
        nerveBranch: selectedBranch,
        side: selectedSide,
        symptom: selectedSymptom,
        patientExplanation: patientExplanation.trim(),
        clinicalConduct: clinicalConduct.trim(),
        doctorName,
        date: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
      };

      // Guardar en chat_messages con canal especializado de evaluación neurológica
      const { error: insertErr } = await supabase.from('chat_messages').insert([
        {
          patient_id: patientId,
          sender_name: doctorName,
          sender_role: 'doctor',
          content: `[EVALUACIÓN SISTEMA NERVIOSO] Rama: ${currentBranchInfo.name} (${selectedSide.toUpperCase()}). Síntoma: ${selectedSymptom}. Explicación: ${patientExplanation.trim()}`,
          channel_type: 'nervous_system_evaluation',
          is_private_note: true,
          metadata: {
            nerveBranch: selectedBranch,
            nerveCode: currentBranchInfo.code,
            side: selectedSide,
            symptom: selectedSymptom,
            patientExplanation: patientExplanation.trim(),
            clinicalConduct: clinicalConduct.trim(),
            branchName
          }
        }
      ]);

      if (insertErr) {
        console.warn('Nota insertando en Supabase chat_messages:', insertErr);
      }

      setHistory((prev) => [newRecord, ...prev]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      if (onRecordSaved) onRecordSaved(newRecord);
    } catch (err: any) {
      console.error('Error al guardar evaluación nerviosa:', err);
      alert('Error al registrar evaluación: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado de Sección */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-950 border border-cyan-500/40 shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-md">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30">
                Neurología &amp; Anestesiología Dental
              </span>
              <span className="text-[10px] text-slate-400 font-mono">NOM-004-SSA3</span>
            </div>
            <h3 className="text-sm font-black text-white mt-0.5">
              Sistema Nervioso, Inervación Trigeminal y Reflejos
            </h3>
          </div>
        </div>

        {saveSuccess && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ¡Evaluación Respaldada!
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Columna Izquierda: Selección de Rama Anatómica */}
        <div className="lg:col-span-5 space-y-2 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 block mb-1">
            1. Rama Nerviosa Odontológica:
          </label>
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {NERVE_BRANCHES.map((b) => {
              const isSelected = b.id === selectedBranch;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBranch(b.id)}
                  className={cn(
                    'p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1',
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold leading-tight truncate">{b.name}</span>
                    <span className={cn(
                      'text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md border shrink-0',
                      isSelected ? 'bg-cyan-400 text-slate-950 border-cyan-300' : 'bg-slate-800 text-slate-400 border-slate-700'
                    )}>
                      {b.code}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Parámetros Clínicos, Explicación al Paciente y Guardado */}
        <div className="lg:col-span-7 space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Ficha Resumen de la Rama Seleccionada */}
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-white font-bold">{currentBranchInfo.name}</strong>
                <span className="text-[10px] text-amber-300 font-mono font-bold">{currentBranchInfo.code}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">{currentBranchInfo.clinicalImpact}</p>
            </div>

            {/* Selector de Lado Anatómico */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 block mb-1">
                2. Lado Anatómico Comprometido:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['derecho', 'izquierdo', 'bilateral'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setSelectedSide(side)}
                    className={cn(
                      'py-1.5 px-2 rounded-xl text-xs font-bold capitalize transition-all border cursor-pointer',
                      selectedSide === side
                        ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black shadow-sm'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    )}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Síntoma Sensorial */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 block mb-1">
                3. Síntoma Sensorial o Hallazgo Clínico:
              </label>
              <select
                value={selectedSymptom}
                onChange={(e) => setSelectedSymptom(e.target.value as SensorySymptom)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:border-cyan-400 focus:outline-hidden cursor-pointer"
              >
                <option value="ninguno">🟢 Asintomático / Fisiológico normal</option>
                <option value="dolor_agudo_pulpar">🔴 Dolor Agudo Pulpar (Pulpitis Irreversible)</option>
                <option value="dolor_sordo_constante">🟠 Dolor Sordo / Constante (Periodontitis Apical)</option>
                <option value="parestesia_entumecimiento">🔵 Parestesia / Entumecimiento / Hipoestesia</option>
                <option value="hiperestesia_sensibilidad">🟡 Hiperestesia / Hipersensibilidad al Frío/Calor</option>
                <option value="neuralgia_descarga">⚡ Neuralgia Trigeminal / Descarga Eléctrica</option>
                <option value="ardor_urente">🔥 Sensación de Ardor / Dolor Urente</option>
                <option value="fatiga_muscular_atm">⚠️ Trismus / Fatiga Muscular / Chasquido ATM</option>
              </select>
            </div>

            {/* Explicación Dada al Paciente */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center justify-between mb-1">
                <span>4. Explicación Detallada Dada al Paciente:</span>
                <span className="text-[10px] text-slate-400 font-normal">NOM-004 Art. 80</span>
              </label>
              <textarea
                rows={2}
                value={patientExplanation}
                onChange={(e) => setPatientExplanation(e.target.value)}
                placeholder="Escribe exactamente qué se le informó al paciente para su tranquilidad y consentimiento..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
              />
            </div>

            {/* Conducta Clínica / Plan Terapéutico */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 block mb-1">
                5. Conducta Clínica y Recomendación:
              </label>
              <input
                type="text"
                value={clinicalConduct}
                onChange={(e) => setClinicalConduct(e.target.value)}
                placeholder="Ej. Protección pulpar indirecta, anestesia troncular lenta, cita de control..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Botón de Guardado */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Registrado por: <strong className="text-slate-200">{doctorName}</strong>
            </span>
            <button
              type="button"
              onClick={handleSaveEvaluation}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Evaluación en Expediente'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Historial Cronológico de Evaluaciones Nerviosas */}
      {history.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Historial de Evaluaciones Nerviosas ({history.length})
            </span>
            <span className="text-[10px] text-slate-400">Auditoría Clínica Dra. Aura</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {history.map((h) => {
              const bInfo = NERVE_BRANCHES.find((b) => b.id === h.nerveBranch);
              return (
                <div
                  key={h.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-cyan-300">
                      {bInfo?.name || h.nerveBranch} ({h.side.toUpperCase()})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{h.date}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    <strong className="text-amber-400">Síntoma:</strong> {h.symptom} •{' '}
                    <strong className="text-slate-400">Explicación:</strong> {h.patientExplanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
