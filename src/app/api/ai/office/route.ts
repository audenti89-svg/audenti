import { NextResponse } from 'next/server';
import { AIDispatcher, AIRole } from '@/lib/ai/ai-dispatcher';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { prompt, role } = await request.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt es requerido.' }, { status: 400 });
    }

    const aiRole: AIRole = (role || 'SUPPORT') as AIRole;
    const response = await AIDispatcher.dispatch(prompt, aiRole);

    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error: any) {
    console.error('[API AI-OFFICE ERROR]:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Error interno al despachar IA'
    }, { status: 500 });
  }
}
