import { POST as chatPostHandler } from '@/app/api/chat/route';

// Alias directo para /api/chat/send compatible con todas las directivas de envío
export const POST = chatPostHandler;
export const runtime = 'nodejs';
