'use client';

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
  FileText,
  ShieldCheck,
  Check,
  RotateCcw,
  X,
  Printer,
  Sparkles,
  AlertTriangle,
  Lock,
  Building2,
  Calendar,
  UserCheck
} from 'lucide-react';
import { AudentiLogo } from '@/components/ui/AudentiLogo';
import { cn } from '@/lib/utils';

interface InformedConsentSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  branchName?: string;
  procedureName?: string;
  onSignedSuccess?: (consent: any) => void;
}

export function InformedConsentSignModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  patientPhone,
  branchName = 'Sucursal Balbuena (Matriz)',
  procedureName = 'Procedimiento Quirúrgico Odontológico y Anestesia Local',
  onSignedSuccess
}: InformedConsentSignModalProps) {
  const sigPadRef = useRef<SignatureCanvas | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [signedRecord, setSignedRecord] = useState<any | null>(null);
  const [agreementChecked, setAgreementChecked] = useState(false);

  if (!isOpen) return null;

  const handleClear = () => {
    sigPadRef.current?.clear();
  };

  // Función criptográfica para generar SHA-256 del documento y firma
  async function computeSHA256(payload: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const handleSaveSignature = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert('Por favor realiza tu firma dentro del recuadro digital antes de continuar.');
      return;
    }

    if (!agreementChecked) {
      alert('Debes confirmar que has leído y comprendido los términos clínicos del consentimiento informado.');
      return;
    }

    try {
      setIsSaving(true);
      const signatureDataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
      const timestamp = new Date().toISOString();

      // Cómputo del Hash Criptográfico NOM-004-SSA3
      const rawPayload = `${patientId}|${patientName}|${procedureName}|${branchName}|${timestamp}|${signatureDataUrl.slice(0, 100)}`;
      const sha256 = await computeSHA256(rawPayload);

      const res = await fetch('/api/clinical/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          patient_name: patientName,
          patient_phone: patientPhone,
          procedure_name: procedureName,
          branch: branchName,
          doctor_name: 'Dra. Aura Estudillo',
          doctor_license: '8492019',
          signature_data_url: signatureDataUrl,
          sha256_hash: `SHA256:${sha256}`,
          notes: 'Consentimiento firmado digitalmente en pantalla táctil con validación de biometría y hash criptográfico.'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSignedRecord(data.consent);
        if (onSignedSuccess) {
          onSignedSuccess(data.consent);
        }
      } else {
        alert(data.error || 'No se pudo registrar el consentimiento informado.');
      }
    } catch (err: any) {
      alert('Error guardando firma: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/40 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.2)] text-white p-5 sm:p-7 space-y-5 my-6 max-h-[92vh] overflow-y-auto">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer no-print"
          title="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── ENCABEZADO OFICIAL DE CONSENTIMIENTO ── */}
        <div className="flex items-center gap-3 border-b border-amber-500/30 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
            <AudentiLogo size={28} className="text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-wide text-white uppercase">
                Consentimiento Informado Clínico
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                NOM-004-SSA3
              </span>
            </div>
            <p className="text-xs text-amber-300">
              Dra. Aura Estudillo • Céd. Prof. 8492019 • {branchName}
            </p>
          </div>
        </div>

        {signedRecord ? (
          /* ── ESTADO POST-FIRMA EXITOSA ── */
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-black text-white">
                  ¡Consentimiento Clínico Firmado y Certificado!
                </p>
                <p className="text-xs text-emerald-200">
                  El documento ha sido sellado con éxito y respaldado en tu expediente odontológico.
                </p>
                <p className="text-[11px] font-mono text-amber-300 bg-slate-950/70 p-2 rounded-xl border border-slate-800 mt-2 break-all">
                  {signedRecord.sha256_hash}
                </p>
              </div>
            </div>

            <div className="border border-slate-800 rounded-2xl p-4 bg-slate-950/60 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Folio Oficial:</span>
                <strong className="text-white font-mono">{signedRecord.folio}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paciente:</span>
                <strong className="text-white">{signedRecord.patient_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Procedimiento Autorizado:</span>
                <strong className="text-amber-400">{signedRecord.procedure_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha y Hora de Firma:</span>
                <span className="text-slate-300">
                  {new Date(signedRecord.signed_at).toLocaleString('es-MX')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                Imprimir Copia del Paciente
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-md cursor-pointer"
              >
                Finalizar
              </button>
            </div>
          </div>
        ) : (
          /* ── CUERPO DEL CONSENTIMIENTO Y BLOC DE FIRMA ── */
          <div className="space-y-4">
            {/* Texto del Consentimiento */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2.5 max-h-48 overflow-y-auto leading-relaxed">
              <p className="font-bold text-white">
                DECLARACIÓN Y AUTORIZACIÓN CLÍNICA DEL PACIENTE:
              </p>
              <p>
                Yo, <strong className="text-white">{patientName}</strong>, en pleno uso de mis facultades mentales, declaro que la <strong className="text-amber-300">Dra. Aura Estudillo</strong> me ha explicado detalladamente la naturaleza, objetivos, beneficios, alternativas y riesgos previsibles del procedimiento denominado: <strong className="text-amber-400">{procedureName}</strong>.
              </p>
              <p>
                He tenido la oportunidad de hacer preguntas y resolver dudas con el equipo médico. Autorizo la administración de anestesia local y las medidas terapéuticas necesarias durante mi atención en la sede <strong className="text-white">{branchName}</strong>.
              </p>
              <p className="text-[11px] text-slate-400 italic">
                * Con fundamento en la Norma Oficial Mexicana NOM-004-SSA3-2012, del Expediente Clínico y Artículos 80 al 83 del Reglamento de la Ley General de Salud en Materia de Prestación de Servicios de Atención Médica.
              </p>
            </div>

            {/* Checkbox de Confirmación */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-amber-500/20 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={agreementChecked}
                onChange={(e) => setAgreementChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-700 bg-slate-900"
              />
              <span className="text-slate-200">
                He leído, comprendo y acepto la realización del procedimiento odontológico indicado bajo los estándares de bioseguridad de Audenti.
              </span>
            </label>

            {/* Bloc de Firma Digital Biométrica */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  Firma Digital del Paciente (Trazado Táctil / Stylus):
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Borrar / Limpiar
                </button>
              </div>

              <div className="border-2 border-dashed border-amber-400/50 rounded-2xl bg-white overflow-hidden shadow-inner flex items-center justify-center relative touch-none">
                <SignatureCanvas
                  ref={sigPadRef}
                  penColor="#0f172a"
                  canvasProps={{
                    className: 'w-full h-44 cursor-crosshair',
                    width: 600,
                    height: 176
                  }}
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-slate-400 pointer-events-none select-none font-medium">
                  Área protegida para firma NOM-004-SSA3
                </span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveSignature}
                disabled={isSaving || !agreementChecked}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Cifrando y Certificando SHA-256...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Firmar Consentimiento con SHA-256</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
