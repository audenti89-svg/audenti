'use client'

import { useRef, useState, useEffect } from 'react'
import { PenTool, CheckCircle, RotateCcw, X, Shield, FileText, Lock } from 'lucide-react'

interface DigitalConsentSignatureModalProps {
  isOpen: boolean
  onClose: () => void
  patientName: string
  patientId?: string
  procedureName?: string
  onSigned?: (signatureDataUrl: string) => void
}

export function DigitalConsentSignatureModal({
  isOpen,
  onClose,
  patientName,
  patientId,
  procedureName = 'Tratamiento Dental Odontológico & Consentimiento Informado',
  onSigned,
}: DigitalConsentSignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setHasSignature(false)
      setSavedSuccess(false)
      setTimeout(initCanvas, 100)
    }
  }, [isOpen])

  const initCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Ajustar resolución de dibujo para pantallas retina
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    ctx.strokeStyle = '#0284c7' // Blue primary color
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Fondo blanco claro
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    initCanvas()
    setHasSignature(false)
  }

  const handleSaveSignature = async () => {
    if (!canvasRef.current || !hasSignature) return
    setIsSaving(true)

    try {
      const signatureDataUrl = canvasRef.current.toDataURL('image/png')

      if (onSigned) {
        onSigned(signatureDataUrl)
      }

      setSavedSuccess(true)
      setTimeout(() => {
        setIsSaving(false)
        onClose()
      }, 1200)
    } catch (err) {
      console.error('Error al guardar firma:', err)
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Encabezado */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Firma Digital &amp; Consentimiento Informado
              </h3>
              <p className="text-xs text-slate-400">
                Audenti — Clínica Dra. Aura Estudillo (Céd. Prof. 8492019)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen del documento clínico */}
        <div className="p-5 space-y-4 text-xs text-slate-300">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 space-y-1.5">
            <div className="flex justify-between items-center text-slate-400">
              <span>Paciente Titular:</span>
              <strong className="text-white text-sm font-semibold">{patientName || 'Paciente Registrado'}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Procedimiento:</span>
              <strong className="text-cyan-300">{procedureName}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Fecha &amp; Timestamp:</span>
              <span className="text-slate-300 font-mono text-[11px]">{new Date().toLocaleString('es-MX')}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px] leading-relaxed text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400 inline" />
              Declaración de Voluntad y Validez Legal:
            </p>
            <p>
              El/la paciente declara haber recibido explicación clara, detallada y comprensible sobre el diagnóstico, alternativas de tratamiento, riesgos y cuidados postoperatorios bajo la supervisión de la Dra. Aura Estudillo.
            </p>
          </div>

          {/* Lienzo de Firma Táctil / PWA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-slate-200">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Firma autógrafa digital (en pantalla o con lápiz óptico):
              </span>
              <button
                type="button"
                onClick={clearSignature}
                className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Limpiar trazo
              </button>
            </div>

            <div className="relative border-2 border-dashed border-slate-700 rounded-xl overflow-hidden bg-white touch-none">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 cursor-crosshair block"
                style={{ touchAction: 'none' }}
              />
              {!hasSignature && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400/60 text-xs font-medium">
                  Trace su firma aquí con el dedo o mouse
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pie y Botones */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="w-3.5 h-3.5 text-cyan-500" />
            <span>Encriptación SHA-256 enlazada a expediente</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveSignature}
              disabled={!hasSignature || isSaving}
              className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                savedSuccess
                  ? 'bg-emerald-600 text-white'
                  : hasSignature
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Consentimiento Registrado
                </>
              ) : isSaving ? (
                'Procesando...'
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirmar y Firmar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
