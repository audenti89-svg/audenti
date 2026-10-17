'use client';

import { useState } from 'react';
import { useAIAgent } from '@/hooks/useAIAgent';
import { Stethoscope, Sparkles, AlertCircle, FileCheck2, Loader2 } from 'lucide-react';

export default function AuraClinicalAssistant() {
  const { runAgent, loading, error, data } = useAIAgent({ domain: 'clinical' });
  const [notes, setNotes] = useState('');

  const handleAnalyzeNotes = async () => {
    if (!notes.trim() || loading) return;
    await runAgent(`Analiza el siguiente expediente o nota de voz clínica y estructúrala formalmente: ${notes}`);
  };

  const formattedOutput = data?.result?.result || data?.result?.content || data?.result || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md border border-slate-200/80 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Stethoscope className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              🩺 Asistente Clínico — Dra. Aura
            </h2>
            <p className="text-xs text-slate-500">
              Especialista en Estética Oral &amp; Rehabilitación • Céd. Prof. 8492019
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          Claude 3.5 Sonnet
        </span>
      </div>

      <textarea
        className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-xs text-slate-800 bg-slate-50/50 transition-all placeholder:text-slate-400"
        rows={4}
        placeholder="Escribe o pega las notas clínicas del paciente, síntomas o descripción del procedimiento..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex justify-end">
        <button
          onClick={handleAnalyzeNotes}
          disabled={loading || !notes.trim()}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analizando con Claude 3.5 Sonnet...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Procesar Nota Clínica</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {data && (
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              Resultado Estructurado Oficial:
            </span>
            {data?.executionTimeMs && (
              <span className="text-[10px] text-slate-400 font-mono">
                {data.executionTimeMs} ms
              </span>
            )}
          </div>
          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans bg-white p-3.5 rounded-lg border border-slate-200/80">
            {typeof formattedOutput === 'object' ? JSON.stringify(formattedOutput, null, 2) : formattedOutput}
          </p>
        </div>
      )}
    </div>
  );
}
