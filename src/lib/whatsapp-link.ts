/**
 * Generador Universal de Enlaces de WhatsApp para Audenti Cloud Pro
 * - En celulares: Abre directamente la app de WhatsApp o WhatsApp Business instalada
 * - En computadoras: Abre web.whatsapp.com o la app de escritorio de WhatsApp
 * - Maneja automáticamente números mexicanos (con o sin 52 / 521) y números internacionales
 * - Si no hay teléfono registrado, permite consultar o ingresar número provisional
 */

export function formatWhatsAppUrl(rawPhone?: string | null, text?: string): string {
  if (!rawPhone || !rawPhone.trim()) {
    const defaultText = text ? `?text=${encodeURIComponent(text)}` : ''
    return `https://api.whatsapp.com/send${defaultText}`
  }

  // Limpiar caracteres no numéricos
  const digits = rawPhone.replace(/\D/g, '')

  let fullPhone = digits

  // Si tiene 10 dígitos (número estándar mexicano sin lada país)
  if (digits.length === 10) {
    fullPhone = `521${digits}`
  } else if (digits.length === 12 && digits.startsWith('52')) {
    // Si ya empieza con 52 y tiene 10 dígitos después, convertir a formato 521 para chat web
    const nationalNumber = digits.slice(2)
    fullPhone = `521${nationalNumber}`
  } else if (digits.length === 13 && digits.startsWith('521')) {
    fullPhone = digits
  }

  const encodedText = text ? `?text=${encodeURIComponent(text)}` : ''
  
  // api.whatsapp.com/send redirige limpiamente tanto a la app instalada en móvil/PC como a WhatsApp Web
  return `https://api.whatsapp.com/send?phone=${fullPhone}${text ? `&text=${encodeURIComponent(text)}` : ''}`
}
