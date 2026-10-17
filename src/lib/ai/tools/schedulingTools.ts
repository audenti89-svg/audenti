// src/lib/ai/tools/schedulingTools.ts

export const schedulingTools = [
  {
    name: 'getAvailableSlots',
    description: 'Consulta los horarios y sillones dentales disponibles para una fecha específica en la clínica.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        doctorId: { type: 'string', description: 'ID opcional del doctor para filtrar su agenda' }
      },
      required: ['date']
    }
  },
  {
    name: 'bookAppointment',
    description: 'Agenda una cita dental de forma segura validando que no existan empalmes en el gabinete.',
    parameters: {
      type: 'object',
      properties: {
        patientId: { type: 'string', description: 'ID del paciente' },
        doctorId: { type: 'string', description: 'ID del odontólogo asignado' },
        startTime: { type: 'string', description: 'Fecha y hora de inicio en formato ISO 8601' },
        chairId: { type: 'string', description: 'ID del sillón dental asignado' }
      },
      required: ['patientId', 'doctorId', 'startTime', 'chairId']
    }
  }
];
