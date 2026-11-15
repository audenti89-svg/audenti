import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Endpoint para registrar subscripciones de Web Push de la Dra. Aura y personal clínico
export async function POST(request: Request) {
  try {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado. Se requiere sesión activa.' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || typeof subscription.endpoint !== 'string') {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    let allSubs: any[] = [];
    try {
      const { data: file } = await adminSupabase.storage.from('audenti_database').download('push_subscriptions.json');
      if (file) {
        const text = await file.text();
        if (text && text.trim()) allSubs = JSON.parse(text);
      }
    } catch {}

    // Evitar duplicados por endpoint
    allSubs = allSubs.filter(s => s.endpoint !== subscription.endpoint);
    allSubs.push({
      ...subscription,
      userId: user.id,
      userEmail: user.email || 'audenti89@gmail.com',
      updatedAt: new Date().toISOString()
    });

    await adminSupabase.storage.from('audenti_database').upload(
      'push_subscriptions.json',
      JSON.stringify(allSubs, null, 2),
      { upsert: true, contentType: 'application/json' }
    );

    return NextResponse.json({ success: true, count: allSubs.length });
  } catch (err: any) {
    console.error('[Push Subscription Error]:', err?.message);
    return NextResponse.json({ error: 'Error interno al registrar suscripción' }, { status: 500 });
  }
}
