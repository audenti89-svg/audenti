import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Endpoint para registrar subscripciones de Web Push de la Dra. Aura
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscription, userEmail } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
    }

    const supabase = createAdminClient();

    let allSubs: any[] = [];
    try {
      const { data: file } = await supabase.storage.from('audenti_database').download('push_subscriptions.json');
      if (file) {
        const text = await file.text();
        if (text && text.trim()) allSubs = JSON.parse(text);
      }
    } catch {}

    // Evitar duplicados por endpoint
    allSubs = allSubs.filter(s => s.endpoint !== subscription.endpoint);
    allSubs.push({
      ...subscription,
      userEmail: userEmail || 'audenti89@gmail.com',
      updatedAt: new Date().toISOString()
    });

    await supabase.storage.from('audenti_database').upload(
      'push_subscriptions.json',
      JSON.stringify(allSubs, null, 2),
      { upsert: true, contentType: 'application/json' }
    );

    return NextResponse.json({ success: true, count: allSubs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
