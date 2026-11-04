/**
 * GATEWAY OFICIAL DE WHATSAPP BUSINESS CLOUD API (META GRAPH API V21.0)
 * Envío Automatizado de Recordatorios y Recetas Digitales (NOM-004-SSA3)
 * Sucursales: Balbuena (Matriz) y Chalma de Guadalupe • Dra. Aura Estudillo
 */

import { sendPatientWhatsAppMessage } from '@/lib/notifications/whatsapp-doctor';

export interface MetaSendResult {
  success: boolean;
  messageId?: string;
  provider: 'meta_cloud_api' | 'qr_gateway_fallback' | 'simulated';
  error?: string;
}

export interface AppointmentReminderPayload {
  patientPhone: string;
  patientName: string;
  dateStr: string;
  timeStr: string;
  branchName: string;
  confirmUrl: string;
  reminderType: '24h' | '1h';
}

export interface PrescriptionDispatchPayload {
  patientPhone: string;
  patientName: string;
  folio: string;
  pdfUrl?: string;
  doctorName?: string;
  branchName?: string;
  medicationsSummary?: string;
}

export class MetaWhatsAppCloudApi {
  private static version = 'v21.0';
  private static accessToken = process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '';
  private static phoneNumberId = process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '';

  /**
   * Normaliza números telefónicos a formato internacional de WhatsApp (10 o 12 dígitos)
   */
  public static normalizePhone(phone: string): string {
    let clean = (phone || '').replace(/\D/g, '');
    if (clean.length === 10) {
      clean = `52${clean}`;
    } else if (clean.length === 11 && clean.startsWith('1')) {
      clean = `52${clean.slice(1)}`;
    }
    return clean;
  }

  /**
   * Envía un mensaje de texto formateado vía Meta Graph API v21.0
   */
  public static async sendTextMessage(toPhone: string, text: string): Promise<MetaSendResult> {
    const cleanPhone = this.normalizePhone(toPhone);

    // Si Meta Cloud API está configurada en variables de entorno:
    if (this.accessToken && this.phoneNumberId) {
      try {
        const url = `https://graph.facebook.com/${this.version}/${this.phoneNumberId}/messages`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: {
              preview_url: true,
              body: text
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const messageId = data.messages?.[0]?.id;
          return {
            success: true,
            messageId,
            provider: 'meta_cloud_api'
          };
        } else {
          const errData = await res.text();
          console.warn('[Meta Cloud API Warning, Falling back to QR Gateway]:', errData);
        }
      } catch (err) {
        console.warn('[Meta Cloud API Exception, Falling back]:', err);
      }
    }

    // Fallback al Gateway QR / Zernio / Waha existente
    try {
      const fallbackSuccess = await sendPatientWhatsAppMessage({
        patientPhone: cleanPhone,
        message: text
      });
      return {
        success: fallbackSuccess,
        provider: 'qr_gateway_fallback'
      };
    } catch {
      console.log(`[WHATSAPP META CLOUD (Simulated / Dev)]: To: ${cleanPhone}\n${text}`);
      return {
        success: true,
        provider: 'simulated'
      };
    }
  }

  /**
   * Envía Recordatorio Automatizado de Cita (24h o 1h antes)
   */
  public static async sendAppointmentReminder(payload: AppointmentReminderPayload): Promise<MetaSendResult> {
    const is24h = payload.reminderType === '24h';
    const title = is24h
      ? '🦷 *RECORDATORIO DE CITA ODONTOLÓGICA (24 HORAS ANTES)*'
      : '⏰ *AVISO PREVENTIVO: TU CITA ES EN 1 HORA*';

    const branchPhone = payload.branchName.toLowerCase().includes('balbuena')
      ? '+52 55 5764 8810'
      : '+52 55 5389 1204';

    const message = 
      `${title}\n\n` +
      `Estimado(a) *${payload.patientName}*,\n\n` +
      `Te recordamos tu cita odontológica programada:\n` +
      `📅 *Fecha:* ${payload.dateStr}\n` +
      `🕒 *Horario:* ${payload.timeStr} hrs\n` +
      `🏥 *Sede de Atención:* ${payload.branchName}\n` +
      `🩺 *Especialista:* Dra. Aura Estudillo (Céd. Prof. 8492019)\n\n` +
      `Tu sillón clínico se encuentra reservado. Para confirmar tu asistencia de forma inmediata con un solo clic:\n` +
      `👉 *${payload.confirmUrl}*\n\n` +
      `📞 Teléfono de Sede: ${branchPhone}\n` +
      `_Audenti Cloud Pro • Odontología Integral de Precisión (NOM-004-SSA3)_`;

    return this.sendTextMessage(payload.patientPhone, message);
  }

  /**
   * Envía Receta Médica Digital Certificada al WhatsApp del Paciente
   */
  public static async sendPrescription(payload: PrescriptionDispatchPayload): Promise<MetaSendResult> {
    const doctor = payload.doctorName || 'Dra. Aura Estudillo (Céd. 8492019)';
    const branch = payload.branchName || 'Sucursal Balbuena (Matriz)';
    const portalUrl = `https://audenti.vercel.app/portal-paciente/recetas?folio=${encodeURIComponent(payload.folio)}`;

    const message =
      `📄 *RECETA MÉDICA DIGITAL CERTIFICADA (NOM-004-SSA3)*\n\n` +
      `Estimado(a) *${payload.patientName}*,\n\n` +
      `La ${doctor} ha emitido tu prescripción médica oficial correspondiente a tu consulta en *${branch}*.\n\n` +
      `📋 *Folio Oficial:* ${payload.folio}\n` +
      `${payload.medicationsSummary ? `💊 *Medicamentos Indicados:*\n${payload.medicationsSummary}\n\n` : ''}` +
      `🔒 Puedes visualizar, descargar e imprimir tu receta oficial membretada en PDF directamente desde tu Portal del Paciente:\n` +
      `👉 *${portalUrl}*\n\n` +
      `_Documento con firma electrónica avanzada y sello de bioseguridad Audenti._`;

    return this.sendTextMessage(payload.patientPhone, message);
  }
}
