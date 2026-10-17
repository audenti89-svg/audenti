import { NextResponse } from 'next/server';
import { processCXMFollowUps } from '@/lib/services/cxmService';

export async function GET(request: Request) {
  // Validar el secreto de Vercel Cron para seguridad
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await processCXMFollowUps();
    return NextResponse.json({
      success: true,
      message: 'CXM follow-ups processed successfully',
      result: res
    }, { status: 200 });
  } catch (error: any) {
    console.error('[CRON CXM Error]:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error executing CXM follow-ups'
    }, { status: 500 });
  }
}
