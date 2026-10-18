// Helper para enviar alertas por WhatsApp a la Dra. Aura Estudillo (55 2242 7769)
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
    // Si no hay gateway QR externo configurado en local, registrar el despacho en consola/log
    console.log(`[WHATSAPP DISPATCH TO DRA. AURA (${doctorPhone})]:\n${formattedText}`)
  }
  return false
}
