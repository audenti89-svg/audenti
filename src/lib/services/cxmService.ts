import { createClient } from '@supabase/supabase-js';
import { executeAIAgent } from '@/lib/ai/router';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function processCXMFollowUps() {
  try {
    // 1. Consultamos citas finalizadas hace 24 horas que requieran seguimiento
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, patient_id, patients(name, full_name, phone), treatments(name)')
      .eq('status', 'completed')
      .eq('follow_up_sent', false);

    if (error) {
      console.warn('[CXM Service] Nota consultando appointments finalizadas en Supabase:', error.message);
    }

    const processedList = [];

    for (const apt of appointments || []) {
      const patient = apt.patients as any;
      const treatment = apt.treatments as any;
      const patientName = patient?.full_name || patient?.name || 'Estimado/a paciente';
      const patientPhone = patient?.phone;

      if (!patientPhone) continue;

      // 2. Generamos el mensaje personalizado usando el agente de pacientes
      const prompt = `Redacta un mensaje corto, amable y empático de seguimiento post-tratamiento para el paciente ${patientName}, quien se realizó el procedimiento de ${treatment?.name || 'odontología general'} ayer en Audenti. Pregúntale cómo se siente y recuérdale cuidar su salud dental.`;

      const aiResult = await executeAIAgent({
        domain: 'patient_chat',
        prompt,
      });

      const messageContent = typeof aiResult.result === 'string'
        ? aiResult.result
        : (aiResult.result?.result || aiResult.result?.content || JSON.stringify(aiResult.result));

      // 3. Disparamos el envío por WhatsApp vía API Externa (Zernio / WhatsApp Cloud)
      try {
        const { sendExternalMessage } = await import('@/lib/messaging/external-client');
        await sendExternalMessage({
          to: patientPhone,
          message: messageContent,
          patientId: apt.patient_id,
          patientName,
          metadata: { type: 'cxm_followup_24h', appointmentId: apt.id }
        });
      } catch (sendErr: any) {
        console.warn(`[CXM 24h] Error enviando mensaje a ${patientPhone}:`, sendErr.message);
      }

      // 4. Marcamos el seguimiento como enviado en Supabase
      try {
        await supabase
          .from('appointments')
          .update({ follow_up_sent: true })
          .eq('id', apt.id);
      } catch (updateErr: any) {
        console.warn(`[CXM Service] No se pudo actualizar follow_up_sent para la cita ${apt.id}:`, updateErr.message);
      }

      processedList.push({
        appointmentId: apt.id,
        patientName,
        phone: patientPhone,
        message: messageContent
      });
    }

    return {
      success: true,
      processedCount: processedList.length,
      processedList
    };

  } catch (error: any) {
    console.error('[CXM Service Error]:', error.message);
    throw error;
  }
}
