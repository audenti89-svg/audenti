/**
 * Generador Universal de Enlaces de WhatsApp para Audenti Cloud Pro
 * - En Windows Desktop: Lanza el protocolo directo `whatsapp://send?phone=...` que abre
 *   la aplicación nativa de WhatsApp instalada en Windows.
 * - Con fallback seguro a WhatsApp Web si no está instalada.
 * - Maneja automáticamente números mexicanos (10 dígitos -> 521XXXXXXXXXX) e internacionales.
 */

export function cleanMexicanPhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone || !rawPhone.trim()) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 10) {
    return `521${digits}`;
  } else if (digits.length === 12 && digits.startsWith('52')) {
    return `521${digits.slice(2)}`;
  } else if (digits.length === 13 && digits.startsWith('521')) {
    return digits;
  }
  return digits;
}

export function formatWhatsAppUrl(rawPhone?: string | null, text?: string): string {
  const fullPhone = cleanMexicanPhoneNumber(rawPhone);
  const encodedText = text ? encodeURIComponent(text) : '';

  if (!fullPhone) {
    return encodedText ? `whatsapp://send?text=${encodedText}` : `whatsapp://send`;
  }

  // whatsapp://send invoca la app de escritorio de WhatsApp nativa de Windows
  return `whatsapp://send?phone=${fullPhone}${encodedText ? `&text=${encodedText}` : ''}`;
}

export function formatWhatsAppWebUrl(rawPhone?: string | null, text?: string): string {
  const fullPhone = cleanMexicanPhoneNumber(rawPhone);
  const encodedText = text ? encodeURIComponent(text) : '';

  if (!fullPhone) {
    return encodedText ? `https://web.whatsapp.com/send?text=${encodedText}` : `https://web.whatsapp.com/`;
  }

  return `https://web.whatsapp.com/send?phone=${fullPhone}${encodedText ? `&text=${encodedText}` : ''}`;
}

/**
 * Función inteligente para abrir WhatsApp en Windows:
 * 1. Intenta abrir la aplicación de WhatsApp instalada mediante protocolo `whatsapp://`
 * 2. Si el usuario no tiene la app instalada o tarda en responder, abre WhatsApp Web como fallback
 */
export function openWhatsAppDirectly(rawPhone?: string | null, text?: string) {
  if (typeof window === 'undefined') return;

  const nativeUri = formatWhatsAppUrl(rawPhone, text);
  const webUri = formatWhatsAppWebUrl(rawPhone, text);

  let hasBlurred = false;
  const onBlur = () => {
    hasBlurred = true;
  };

  window.addEventListener('blur', onBlur, { once: true });

  // Crear un iframe invisible o asignar window.location para lanzar el handler de protocolo sin salir de la página
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  try {
    iframe.src = nativeUri;
  } catch {
    window.location.href = nativeUri;
  }

  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    window.removeEventListener('blur', onBlur);
    // Si la ventana no perdió el foco (la app nativa no se abrió), abrir WhatsApp Web
    if (!hasBlurred) {
      window.open(webUri, '_blank', 'noopener,noreferrer');
    }
  }, 1200);
}
