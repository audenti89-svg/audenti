import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isInternalUser } from '@/lib/auth/admin-emails';

export const runtime = 'nodejs';

/**
 * Image-to-Code Pipeline para Audenti Cloud Pro
 * Utiliza Google Gemini Multimodal para convertir bocetos médicos, recetas o fotos en JSX/Tailwind.
 * Protegido contra uso no autorizado y filtración de credenciales.
 */
export async function POST(request: Request) {
  try {
    // 1. Blindaje de Autorización: Requiere sesión médica o administrativa activa
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado. Se requiere inicio de sesión.' }, { status: 401 });
    }

    const userEmail = (user.email || '').toLowerCase().trim();
    const userRole = (user.user_metadata?.role || user.app_metadata?.role || '').toLowerCase().trim();
    if (!isInternalUser(userEmail, userRole)) {
      return NextResponse.json({ success: false, error: 'Prohibido. Solo el personal clínico tiene acceso a esta herramienta.' }, { status: 403 });
    }

    const { imageBase64, mimeType = 'image/png', promptContext } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'Imagen base64 requerida' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINI;
    if (!geminiKey) {
      return NextResponse.json({ success: false, error: 'Motor de visión no configurado' }, { status: 503 });
    }

    const systemPrompt = `Eres un Ingeniero Frontend Senior especializado en Next.js, React y Tailwind CSS para Audenti Cloud Pro.
Tu objetivo es analizar la imagen proporcionada (un boceto en papel, una receta médica, una tabla o una captura de pantalla de software) y convertirla en un componente de React con Tailwind CSS limpio, elegante, responsive y listo para producción.
Reglas:
1. Usa la paleta clínica de Audenti: Slate/Navy (#0a0f1d), Sky Blue (#0284c7) y Emerald (#10b981).
2. Estructura el código en TypeScript/TSX.
3. Devuelve únicamente el bloque de código TSX bien formateado sin explicaciones innecesarias.
${promptContext ? `Instrucción adicional del usuario: ${promptContext}` : ''}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2500
        }
      })
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'No fue posible procesar la imagen con el modelo de visión' }, { status: 502 });
    }

    const data = await response.json();
    const code = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({
      success: true,
      code: code
    });
  } catch (error: any) {
    console.error('[IMAGE-TO-CODE ERROR]:', error?.message);
    return NextResponse.json({ success: false, error: 'Error interno al procesar imagen' }, { status: 500 });
  }
}
