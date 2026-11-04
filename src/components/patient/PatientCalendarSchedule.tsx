'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  CalendarCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PatientAppointment {
  id: string;
  folio?: string;
  patient_id?: string;
  patient_name?: string;
  treatment?: string;
  treatment_type?: string;
  title?: string;
  appointment_date?: string;
  appointment_time?: string;
  start_time: string;
  end_time?: string;
  branch?: string;
  branch_name?: string;
  doctor_name?: string;
  status: string;
  attendance_confirmed?: boolean;
  attendance_confirmed_at?: string;
  notes?: string;
}

interface PatientCalendarScheduleProps {
  appointments: PatientAppointment[];
  patientName: string;
  branchName: string;
  branchPhoneClean: string;
  onAppointmentUpdated?: () => void;
}

export function PatientCalendarSchedule({
  appointments,
  patientName,
  branchName,
  branchPhoneClean,
  onAppointmentUpdated
}: PatientCalendarScheduleProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmedSuccessId, setConfirmedSuccessId] = useState<string | null>(null);
  const [filterView, setFilterView] = useState<'upcoming' | 'all' | 'past'>('upcoming');

  // Separar citas en próximas y pasadas
  const { upcomingList, pastList } = useMemo(() => {
    const now = new Date();
    const up: PatientAppointment[] = [];
    const past: PatientAppointment[] = [];

    appointments.forEach((a) => {
      const apptDate = new Date(a.start_time || `${a.appointment_date}T${a.appointment_time || '12:00'}`);
      if (apptDate >= now && a.status !== 'cancelled' && a.status !== 'completed') {
        up.push(a);
      } else {
        past.push(a);
      }
    });

    up.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    past.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return { upcomingList: up, pastList: past };
  }, [appointments]);

  // Lista a mostrar según el filtro
  const displayList = useMemo(() => {
    if (selectedDate) {
      return appointments.filter((a) => {
        const dStr = new Date(a.start_time).toISOString().split('T')[0];
        return dStr === selectedDate;
      });
    }
    if (filterView === 'upcoming') return upcomingList;
    if (filterView === 'past') return pastList;
    return [...upcomingList, ...pastList];
  }, [appointments, upcomingList, pastList, filterView, selectedDate]);

  // Días del mes para el mini-calendario interactivo
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 es domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Días del mes anterior para relleno
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const prevDays: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
    // Ajustar para que la semana empiece en Lunes (1) en vez de Domingo (0)
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      prevDays.push({
        day: dayNum,
        dateStr: prevDate.toISOString().split('T')[0],
        isCurrentMonth: false
      });
    }

    const currentDays: { day: number; dateStr: string; isCurrentMonth: boolean; hasAppt: boolean; apptCount: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const thisDate = new Date(year, month, d);
      // Asegurar formato YYYY-MM-DD local
      const yyyy = thisDate.getFullYear();
      const mm = String(thisDate.getMonth() + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const matchingAppts = appointments.filter((a) => {
        const aDate = new Date(a.start_time).toISOString().split('T')[0];
        return aDate === dateStr;
      });

      currentDays.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        hasAppt: matchingAppts.length > 0,
        apptCount: matchingAppts.length
      });
    }

    return { prevDays, currentDays, monthName: currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) };
  }, [currentDate, appointments]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  // Confirmar asistencia en la base de datos
  const handleConfirmAttendance = async (apptId: string) => {
    try {
      setConfirmingId(apptId);
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: apptId,
          attendance_confirmed: true
        })
      });

      if (res.ok) {
        setConfirmedSuccessId(apptId);
        if (onAppointmentUpdated) {
          onAppointmentUpdated();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'No se pudo confirmar la asistencia. Por favor intenta de nuevo.');
      }
    } catch (err: any) {
      alert('Error de conexión al confirmar la asistencia: ' + err.message);
    } finally {
      setConfirmingId(null);
    }
  };

  // Cálculo de recordatorios (24h y 1h)
  const getReminderStatus = (startTimeStr: string) => {
    const now = Date.now();
    const apptTime = new Date(startTimeStr).getTime();
    const diffHours = (apptTime - now) / (1000 * 60 * 60);

    const isPast = diffHours < 0;
    const isWithin24h = diffHours <= 24 && diffHours > 0;
    const isWithin1h = diffHours <= 1 && diffHours > 0;

    return {
      diffHours,
      isPast,
      isWithin24h,
      isWithin1h,
      reminder24hText: isPast
        ? 'Emitido (24h previas)'
        : isWithin24h
        ? 'Activo: Notificación enviada'
        : 'Programado (24h previas)',
      reminder1hText: isPast
        ? 'Emitido (1h previa)'
        : isWithin1h
        ? 'Activo: Salida en camino'
        : 'Programado (1h previa)'
    };
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* ── ALERTA DE CONFIRMACIÓN EXITOSA ── */}
      {confirmedSuccessId && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-emerald-300 tracking-wider">
                Asistencia Ratificada en Clínica
              </p>
              <p className="text-xs text-white">
                ¡Gracias por confirmar! La Dra. Aura Estudillo y tu sillón dental en <strong>{branchName}</strong> están listos para tu atención.
              </p>
            </div>
          </div>
          <button
            onClick={() => setConfirmedSuccessId(null)}
            className="text-xs text-emerald-400 hover:text-white px-2.5 py-1 rounded-lg bg-emerald-900/40 hover:bg-emerald-900 transition-colors"
          >
            Entendido
          </button>
        </div>
      )}

      {/* ── CUADRÍCULA DE CALENDARIO Y AGENDA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANEL IZQUIERDO: MINI-CALENDARIO INTERACTIVO (5 columnas) */}
        <div className="lg:col-span-5 bg-slate-950/90 border border-amber-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-xl space-y-4">
          {/* Encabezado del Mes */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-amber-400" />
              <h3 className="font-black text-sm capitalize text-white">
                {calendarDays.monthName}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToday}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-900 text-amber-300 hover:bg-slate-800 border border-slate-700 transition-colors"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400 py-1">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
            <span className="text-amber-400/80">Dom</span>
          </div>

          {/* Rejilla de días */}
          <div className="grid grid-cols-7 gap-1">
            {/* Días del mes anterior */}
            {calendarDays.prevDays.map((d, i) => (
              <div
                key={`prev-${i}`}
                className="h-10 flex items-center justify-center text-xs text-slate-600 rounded-xl select-none"
              >
                {d.day}
              </div>
            ))}

            {/* Días del mes actual */}
            {calendarDays.currentDays.map((d) => {
              const isToday = d.dateStr === todayStr;
              const isSelected = d.dateStr === selectedDate;
              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : d.dateStr)}
                  className={cn(
                    'h-10 rounded-xl text-xs font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer',
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 font-black'
                      : isToday
                      ? 'border border-amber-400/80 text-amber-300 bg-amber-950/20'
                      : 'text-slate-200 hover:bg-slate-900/80',
                    d.hasAppt && !isSelected && 'text-blue-300 font-black'
                  )}
                >
                  <span>{d.day}</span>
                  {d.hasAppt && (
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full absolute bottom-1.5',
                        isSelected ? 'bg-slate-950' : 'bg-amber-400 ring-2 ring-amber-400/40 animate-pulse'
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Leyenda y Sede Asignada */}
          <div className="pt-3 border-t border-slate-900 space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Día con Cita Médica
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-amber-400" /> Hoy
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 text-slate-300 flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-xs">{branchName}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Atención médica programada exclusivamente en tu sucursal clínica asignada.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: LISTA DE CITAS Y RECORDATORIOS INTERACTIVOS (7 columnas) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barra de Filtros */}
          <div className="flex items-center justify-between gap-3 bg-slate-950/90 border border-slate-800 p-2.5 rounded-2xl">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(null);
                  setFilterView('upcoming');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                  filterView === 'upcoming' && !selectedDate
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                Próximas ({upcomingList.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(null);
                  setFilterView('past');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                  filterView === 'past' && !selectedDate
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                Concluidas ({pastList.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(null);
                  setFilterView('all');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                  filterView === 'all' && !selectedDate
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                Todas ({appointments.length})
              </button>
            </div>

            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-xs text-amber-300 hover:text-white px-2 py-1 rounded-lg bg-amber-400/10 border border-amber-400/30"
              >
                Limpiar fecha
              </button>
            )}
          </div>

          {/* Listado de Citas */}
          {displayList.length > 0 ? (
            <div className="space-y-4">
              {displayList.map((appt) => {
                const startTime = appt.start_time || `${appt.appointment_date}T${appt.appointment_time || '12:00'}`;
                const apptDate = new Date(startTime);
                const isPast = apptDate < new Date();
                const isConfirmedByPatient = !!appt.attendance_confirmed || appt.status === 'confirmed';
                const isThisConfirming = confirmingId === appt.id;
                const reminders = getReminderStatus(startTime);

                return (
                  <div
                    key={appt.id}
                    className={cn(
                      'bg-slate-950/90 border rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 backdrop-blur-xl transition-all',
                      isConfirmedByPatient
                        ? 'border-emerald-500/40'
                        : isPast
                        ? 'border-slate-800 opacity-90'
                        : 'border-blue-500/40 hover:border-amber-400/50'
                    )}
                  >
                    {/* Encabezado de la Cita */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-900 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider',
                              isConfirmedByPatient
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isPast
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            )}
                          >
                            {isConfirmedByPatient
                              ? 'Asistencia Confirmada'
                              : isPast
                              ? 'Consulta Concluida'
                              : 'Pendiente de Confirmación'}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            Folio: {appt.folio || appt.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <h4 className="text-base font-black text-white mt-1">
                          {appt.treatment || appt.treatment_type || appt.title || 'Consulta Odontológica General'}
                        </h4>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5 sm:justify-end">
                          <Clock className="w-3.5 h-3.5" />
                          {apptDate.toLocaleDateString('es-MX', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-slate-300 font-semibold mt-0.5">
                          {appt.appointment_time || apptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs
                        </p>
                      </div>
                    </div>

                    {/* Datos Clínicos y Asignación de Doctor / Sede */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80">
                      <div className="space-y-1">
                        <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">
                          Sucursal de Atención
                        </span>
                        <p className="text-white font-semibold flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {appt.branch || appt.branch_name || branchName}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">
                          Especialista Asignado
                        </span>
                        <p className="text-white font-semibold flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          {appt.doctor_name || 'Dra. Aura Estudillo (Céd. 8492019)'}
                        </p>
                      </div>
                    </div>

                    {/* Módulo de Recordatorios (24h y 1h antes) */}
                    {!isPast && (
                      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Bell className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                            Protocolo de Recordatorios Automatizados
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                            <span className="text-slate-400">Recordatorio 24h:</span>
                            <span
                              className={cn(
                                'font-bold px-2 py-0.5 rounded-md text-[10px]',
                                reminders.isWithin24h
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-slate-800 text-slate-300'
                              )}
                            >
                              {reminders.reminder24hText}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                            <span className="text-slate-400">Alerta 1h previa:</span>
                            <span
                              className={cn(
                                'font-bold px-2 py-0.5 rounded-md text-[10px]',
                                reminders.isWithin1h
                                  ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                                  : 'bg-slate-800 text-slate-300'
                              )}
                            >
                              {reminders.reminder1hText}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Acciones del Paciente */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                      {isConfirmedByPatient ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Asistencia confirmada para esta fecha</span>
                        </div>
                      ) : isPast ? (
                        <span className="text-xs text-slate-500 italic">
                          Cita registrada en tu historial clínico
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmAttendance(appt.id)}
                          disabled={isThisConfirming}
                          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isThisConfirming ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                              <span>Confirmando en base de datos...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>Confirmar Asistencia a Cita</span>
                            </>
                          )}
                        </button>
                      )}

                      <a
                        href={`https://wa.me/${branchPhoneClean}?text=${encodeURIComponent(
                          `Hola Dra. Aura Estudillo, soy ${patientName}. Deseo consultar sobre mi cita del ${apptDate.toLocaleDateString(
                            'es-MX'
                          )} en ${branchName}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Contactar por WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-950/80 border border-slate-800 rounded-3xl space-y-3">
              <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">
                {selectedDate
                  ? `No hay citas agendadas para el día ${selectedDate}`
                  : filterView === 'upcoming'
                  ? 'No cuentas con citas próximas pendientes'
                  : 'No se encontraron citas en esta sección'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Para programar una nueva valoración clínica en Balbuena o Chalma, puedes utilizar el asistente de citas en vivo o contactar a la clínica.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
