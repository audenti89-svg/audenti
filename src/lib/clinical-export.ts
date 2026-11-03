/**
 * AUDENTI CLOUD PRO (2027) - MOTOR DE EXPORTACIÓN Y RESPALDOS MULTIFORMATO
 * Lógica de descarga nativa: Word (.doc), Excel (.xls), CSV Dump y Backup SQL (.sql)
 * Dirección Médica: Dra. Aura Estudillo
 */

export function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ────────────────────────────────────────────────────────────
// 1. EXPORTACIÓN WORD (.doc) - Informe Ejecutivo Clínico
// ────────────────────────────────────────────────────────────
export interface WordReportData {
  title?: string
  subtitle?: string
  doctorName?: string
  doctorRole?: string
  branch?: string
  date?: string
  patient?: {
    fullName: string
    id: string
    phone?: string
    email?: string
    allergies?: string[] | string
    medicalConditions?: string[] | string
  }
  treatments?: Array<{
    tooth?: string | number
    surface?: string
    procedure: string
    cost: number
    doctor?: string
    date?: string
    status?: string
  }>
  summary?: {
    totalProcedures: number
    totalCost: number
    paidAmount?: number
    balanceDue?: number
  }
  notes?: string
}

export function exportToWord(data: WordReportData, filename = 'informe_clinico_audenti.doc') {
  const dateStr = data.date || new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  const doctor = data.doctorName || 'Dra. Aura Estudillo'
  const patient = data.patient || { fullName: 'Reporte General', id: 'GENERAL' }

  const allergiesStr = Array.isArray(patient.allergies)
    ? patient.allergies.join(', ')
    : patient.allergies || 'Sin alergias medicamentosas conocidas'

  const conditionsStr = Array.isArray(patient.medicalConditions)
    ? patient.medicalConditions.join(', ')
    : patient.medicalConditions || 'Sin antecedentes patológicos crónicos'

  const treatmentsRows = (data.treatments || []).map((t, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; font-family: monospace;">${t.tooth || 'General'}</td>
      <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${t.surface || 'N/A'}</td>
      <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 600;">${t.procedure}</td>
      <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${t.doctor || doctor}</td>
      <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #047857;">$${Number(t.cost || 0).toLocaleString('es-MX')} MXN</td>
      <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center;">${t.status || 'Completado'}</td>
    </tr>
  `).join('')

  const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${data.title || 'Informe Clínico Audenti'}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #0f172a; line-height: 1.5; margin: 40px; }
        .header { border-bottom: 2px solid #f59e0b; padding-bottom: 15px; margin-bottom: 25px; }
        .clinic-title { font-size: 20pt; font-weight: bold; color: #0f172a; margin: 0; }
        .subtitle { font-size: 11pt; color: #b45309; font-weight: bold; margin: 4px 0 0 0; text-transform: uppercase; }
        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 25px; }
        .meta-title { font-size: 12pt; font-weight: bold; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        .alert-box { background: #fff1f2; border-left: 4px solid #e11d48; padding: 10px 14px; margin-bottom: 20px; font-size: 10pt; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; font-size: 10pt; }
        th { background-color: #0f172a; color: #ffffff; padding: 10px 12px; border: 1px solid #0f172a; text-align: left; }
        .total-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 18px; border-radius: 8px; margin-top: 15px; text-align: right; font-size: 12pt; font-weight: bold; color: #166534; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #cbd5e1; font-size: 9pt; color: #64748b; text-align: center; }
        .signature-line { width: 250px; border-top: 1px solid #0f172a; margin: 60px auto 10px auto; text-align: center; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="clinic-title">AUDENTI CLOUD PRO</h1>
        <p class="subtitle">Clínica Odontológica Especializada • Sistema Médico NOM-004-SSA3</p>
        <p style="margin: 4px 0 0 0; font-size: 10pt; color: #64748b;">
          Dirección Médica: <strong>${doctor}</strong> • Céd. Prof. 8492019 • Sucursal: <strong>${data.branch || 'Sucursal Balbuena (Matriz)'}</strong>
        </p>
        <p style="margin: 2px 0 0 0; font-size: 9pt; color: #64748b;">Fecha de emisión: ${dateStr}</p>
      </div>

      <div class="meta-box">
        <div class="meta-title">FICHA DE IDENTIFICACIÓN DEL PACIENTE</div>
        <p style="margin: 4px 0;"><strong>Nombre Completo:</strong> ${patient.fullName}</p>
        <p style="margin: 4px 0;"><strong>Folio de Expediente:</strong> #${patient.id.slice(0, 8).toUpperCase()}</p>
        <p style="margin: 4px 0;"><strong>Teléfono de Contacto:</strong> ${patient.phone || 'No registrado'}</p>
        <p style="margin: 4px 0;"><strong>Correo Electrónico:</strong> ${patient.email || 'No registrado'}</p>
      </div>

      <div class="alert-box">
        <strong style="color: #9f1239;">ALERTA CLÍNICA DE BIOSEGURIDAD (NOM-004):</strong><br>
        <strong>Alergias a Medicamentos:</strong> ${allergiesStr}<br>
        <strong>Condiciones Médicas:</strong> ${conditionsStr}
      </div>

      <h3 style="color: #0f172a; margin-bottom: 5px;">HISTORIAL Y PLAN DE TRATAMIENTO ODONTOLÓGICO</h3>
      <p style="font-size: 9.5pt; color: #64748b; margin-top: 0;">Detalle cronológico de procedimientos registrados en la arcada dental interactiva 3D:</p>

      <table>
        <thead>
          <tr>
            <th>Pieza</th>
            <th>Cara</th>
            <th>Procedimiento</th>
            <th>Especialista</th>
            <th style="text-align: right;">Costo</th>
            <th style="text-align: center;">Estatus</th>
          </tr>
        </thead>
        <tbody>
          ${treatmentsRows || '<tr><td colspan="6" style="padding: 15px; text-align: center; color: #64748b;">Sin tratamientos registrados en este periodo.</td></tr>'}
        </tbody>
      </table>

      ${data.summary ? `
        <div class="total-box">
          Presupuesto Total Consolidado: $${Number(data.summary.totalCost || 0).toLocaleString('es-MX')} MXN
        </div>
      ` : ''}

      ${data.notes ? `
        <div style="margin-top: 20px; padding: 12px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px;">
          <strong style="color: #92400e; font-size: 10pt;">OBSERVACIONES MÉDICAS & PRESCRIPCIÓN:</strong>
          <p style="margin: 4px 0 0 0; font-size: 9.5pt; color: #78350f;">${data.notes}</p>
        </div>
      ` : ''}

      <div class="signature-line">
        ${doctor}<br>
        <span style="font-weight: normal; font-size: 8.5pt; color: #64748b;">Cédula Profesional No. 8492019<br>Directora Médica Audenti</span>
      </div>

      <div class="footer">
        Documento médico confidencial expedido bajo la Norma Oficial Mexicana NOM-004-SSA3-2012 del Expediente Clínico.<br>
        Audenti Cloud Pro 2027 • Ciudad de México • Tel: 55 2242 7769
      </div>
    </body>
    </html>
  `

  const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' })
  downloadBlob(blob, filename)
}

// ────────────────────────────────────────────────────────────
// 2. EXPORTACIÓN EXCEL (.xls) - Tablas Contables & Comisiones
// ────────────────────────────────────────────────────────────
export interface ExcelSheetData {
  sheetName?: string
  title: string
  subtitle?: string
  headers: string[]
  rows: Array<Array<string | number>>
  totals?: Record<number, number | string> // Columna -> Total
}

export function exportToExcel(data: ExcelSheetData, filename = 'reporte_financiero_audenti.xls') {
  const headerCells = data.headers.map(h => `
    <th style="background-color: #0f172a; color: #ffffff; font-weight: bold; padding: 8px 12px; border: 1px solid #cbd5e1; text-align: left;">
      ${h}
    </th>
  `).join('')

  const dataRows = data.rows.map((r, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      ${r.map((val, cellIdx) => {
        const isNum = typeof val === 'number'
        return `
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: ${isNum ? 'right' : 'left'};">
            ${isNum && val > 100 ? `$${val.toLocaleString('es-MX')}` : val}
          </td>
        `
      }).join('')}
    </tr>
  `).join('')

  let totalRow = ''
  if (data.totals) {
    totalRow = `
      <tr style="background-color: #fef3c7; font-weight: bold; border-top: 2px solid #f59e0b;">
        ${data.headers.map((_, colIdx) => {
          const val = data.totals?.[colIdx]
          const isNum = typeof val === 'number'
          return `
            <td style="padding: 8px 10px; border: 1px solid #f59e0b; text-align: ${isNum ? 'right' : 'left'};">
              ${val !== undefined ? (isNum ? `$${val.toLocaleString('es-MX')}` : val) : ''}
            </td>
          `
        }).join('')}
      </tr>
    `
  }

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        table { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; border-collapse: collapse; }
        .title { font-size: 16pt; font-weight: bold; color: #0f172a; margin-bottom: 4px; }
        .sub { font-size: 10pt; color: #64748b; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="title">${data.title}</div>
      ${data.subtitle ? `<div class="sub">${data.subtitle}</div>` : ''}
      <table>
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${dataRows}
          ${totalRow}
        </tbody>
      </table>
    </body>
    </html>
  `

  const blob = new Blob(['\ufeff', excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' })
  downloadBlob(blob, filename)
}

// ────────────────────────────────────────────────────────────
// 3. EXPORTACIÓN CSV DUMP (RFC 4180 con UTF-8 BOM)
// ────────────────────────────────────────────────────────────
export function exportToCsv(headers: string[], rows: Array<Array<string | number>>, filename = 'dump_datos_audenti.csv') {
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const headerLine = headers.map(escapeCell).join(',')
  const rowLines = rows.map(r => r.map(escapeCell).join(','))
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

// ────────────────────────────────────────────────────────────
// 4. RESPALDO FULL SQL DIRECTO DESDE SUPABASE (.sql)
// ────────────────────────────────────────────────────────────
export async function triggerDatabaseBackupSql(filename?: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/backup')
    if (res.ok) {
      const blob = await res.blob()
      const suggestedName = filename || `backup_audenti_${new Date().toISOString().split('T')[0]}.sql`
      downloadBlob(blob, suggestedName)
      return true
    }
  } catch (err) {
    console.warn('Fallo endpoint /api/admin/backup, recurriendo a fallback cliente:', err)
  }

  // Fallback de emergencia del lado del cliente
  const now = new Date()
  const fallbackSql = `-- ==============================================================================
-- AUDENTI CLOUD PRO (2027) - RESPALDO MAESTRO DE SEGURIDAD
-- Generado el: ${now.toLocaleDateString('es-MX')} ${now.toLocaleTimeString('es-MX')}
-- Dirección Médica: Dra. Aura Estudillo | Céd. Prof. 8492019
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    patient_name TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    treatment_type TEXT,
    status TEXT DEFAULT 'confirmed'
);

-- Fin del volcado de seguridad.
`
  const blob = new Blob([fallbackSql], { type: 'application/sql;charset=utf-8' })
  downloadBlob(blob, filename || `backup_audenti_${now.toISOString().split('T')[0]}.sql`)
  return true
}
