// Helper para enviar alertas y confirmaciones por WhatsApp (Dra. Aura Estudillo y Pacientes)
export async function sendDoctorWhatsAppAlert({
  title,
  message,
  patientName,
  type = 'info'
}: {
  title: string
  message: string
  patientName?: string
  type?: 'emergency' | 'voice_call' | 'chat_message' | 'info'
}) {
  // Número de la doctora configurado en entorno o perfil de programador
  const doctorPhone = process.env.DOCTOR_WHATSAPP_PHONE || '525522427769'
  const qrGatewayUrl = process.env.WHATSAPP_QR_GATEWAY_URL
  const qrApiKey = process.env.WHATSAPP_QR_API_KEY
  const qrInstanceName = process.env.WHATSAPP_QR_INSTANCE || 'audenti-aura'

  const formattedText = `*🔔 AUDENTI CRM - ALERTA 24/7*\n\n` +
    `*${title}*\n` +
    `${patientName ? `👤 *Paciente:* ${patientName}\n` : ''}` +
    `📝 *Detalle:* ${message}\n` +
    `🕒 *Hora:* ${new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date())}\n\n` +
    `_Resumen automático para la Dra. Aura Estudillo._`

  if (qrGatewayUrl) {
    try {
      await fetch(`${qrGatewayUrl}/message/sendText/${qrInstanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(qrApiKey ? { apikey: qrApiKey } : {})
        },
        body: JSON.stringify({
          number: doctorPhone,
          text: formattedText
        })
      })
      return true
    } catch (err) {
      console.warn('[WhatsApp Alert Error]:', err)
    }
  } else {
    console.log(`[WHATSAPP DISPATCH TO DRA. AURA (${doctorPhone})]:\n${formattedText}`)
  }
  return false
}

// Helper para enviar confirmación directa al WhatsApp del paciente
export async function sendPatientWhatsAppMessage({
  patientPhone,
  message,
  patientName
}: {
  patientPhone: string
  message: string
  patientName?: string
}) {
  const qrGatewayUrl = process.env.WHATSAPP_QR_GATEWAY_URL
  const qrApiKey = process.env.WHATSAPP_QR_API_KEY
  const qrInstanceName = process.env.WHATSAPP_QR_INSTANCE || 'audenti-aura'

  const formattedText = `*🦷 AUDENTI CLINICAL — DRA. AURA ESTUDILLO*\n\n` +
    `Hola ${patientName || ''},\n\n` +
    `${message}\n\n` +
    `_Sede Balbuena / Chalma de Guadalupe • Tel: 55 2242 7769_`

  if (qrGatewayUrl && patientPhone) {
    try {
      await fetch(`${qrGatewayUrl}/message/sendText/${qrInstanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(qrApiKey ? { apikey: qrApiKey } : {})
        },
        body: JSON.stringify({
          number: patientPhone.replace(/\D/g, ''),
          text: formattedText
        })
      })
      return true
    } catch (err) {
      console.warn('[WhatsApp Patient Send Error]:', err)
    }
  } else {
    console.log(`[WHATSAPP DISPATCH TO PATIENT (${patientPhone})]:\n${formattedText}`)
  }
  return false
}
