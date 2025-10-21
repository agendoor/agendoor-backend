import { PrismaClient } from "@prisma/client";
import { 
  addDays, 
  startOfDay, 
  format, 
  parseISO, 
  isSameDay,
  addMinutes,
  parse,
  isWithinInterval,
  isBefore,
  isAfter
} from "date-fns";
import { isNationalHoliday, isStateHoliday, isCityHoliday } from "./holidays";

const prisma = new PrismaClient();

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface DayAvailability {
  date: Date;
  dateStr: string;
  hasSlots: boolean;
  slots: TimeSlot[];
}

/**
 * Verifica se uma data está bloqueada para a empresa
 */
export async function isDateBlocked(companyId: string, date: Date): Promise<boolean> {
  const dateStart = startOfDay(date);
  
  // Busca configurações de agenda
  const agendaSettings = await prisma.agendaSettings.findUnique({
    where: { companyId }
  });

  // Verifica feriados nacionais
  if (agendaSettings?.nationalHolidays && isNationalHoliday(date)) {
    return true;
  }

  // Verifica feriados estaduais (se configurado)
  if (agendaSettings?.stateHolidays) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { state: true }
    });
    if (company && isStateHoliday(date, company.state)) {
      return true;
    }
  }

  // Verifica feriados municipais (se configurado)
  if (agendaSettings?.cityHolidays) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { city: true }
    });
    if (company && isCityHoliday(date, company.city)) {
      return true;
    }
  }

  // Verifica feriados personalizados
  const customHoliday = await prisma.customHoliday.findFirst({
    where: {
      companyId,
      enabled: true,
      date: {
        gte: dateStart,
        lt: addDays(dateStart, 1)
      }
    }
  });

  if (customHoliday) return true;

  // Verifica pontes de feriado
  const holidayBridge = await prisma.holidayBridge.findFirst({
    where: {
      companyId,
      enabled: true,
      startDate: { lte: date },
      endDate: { gte: date }
    }
  });

  if (holidayBridge) return true;

  // Verifica bloqueios de data (férias, etc)
  const dateBlock = await prisma.dateBlock.findFirst({
    where: {
      companyId,
      enabled: true,
      startDate: { lte: date },
      endDate: { gte: date }
    }
  });

  if (dateBlock) {
    // Se for bloqueio de dia inteiro, bloqueia
    if (dateBlock.allDay) return true;
    
    // Se for bloqueio parcial, não bloqueia a data inteira
    // (será tratado na verificação de horários)
  }

  // Verifica se tem desbloqueio para esta data
  const dateUnblock = await prisma.dateUnblock.findFirst({
    where: {
      companyId,
      enabled: true,
      date: {
        gte: dateStart,
        lt: addDays(dateStart, 1)
      }
    }
  });

  // Se tem desbloqueio, não está bloqueada
  if (dateUnblock) return false;

  return false;
}

/**
 * Verifica se um horário está dentro do intervalo de almoço
 */
function isLunchTime(time: string, lunchStart?: string, lunchEnd?: string): boolean {
  if (!lunchStart || !lunchEnd) return false;
  
  const timeDate = parse(time, "HH:mm", new Date());
  const lunchStartDate = parse(lunchStart, "HH:mm", new Date());
  const lunchEndDate = parse(lunchEnd, "HH:mm", new Date());
  
  return isWithinInterval(timeDate, { start: lunchStartDate, end: lunchEndDate });
}

/**
 * Gera horários disponíveis para um serviço em uma data específica
 */
export async function getAvailableSlots(
  companyId: string,
  serviceId: string,
  date: Date
): Promise<TimeSlot[]> {
  const slots: TimeSlot[] = [];
  
  // Busca o serviço
  const service = await prisma.service.findUnique({
    where: { id: serviceId }
  });

  if (!service || !service.active) return slots;

  // Verifica se a data está bloqueada
  if (await isDateBlocked(companyId, date)) return slots;

  // Verifica se o serviço está disponível neste dia da semana
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc
  const dayEnabled = [
    service.sundayEnabled,
    service.mondayEnabled,
    service.tuesdayEnabled,
    service.wednesdayEnabled,
    service.thursdayEnabled,
    service.fridayEnabled,
    service.saturdayEnabled
  ][dayOfWeek];

  if (!dayEnabled) return slots;

  // Busca configurações de agenda (para lunch break)
  const agendaSettings = await prisma.agendaSettings.findUnique({
    where: { companyId }
  });

  // Busca agendamentos existentes para este dia e serviço
  const dateStart = startOfDay(date);
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      companyId,
      serviceId,
      date: {
        gte: dateStart,
        lt: addDays(dateStart, 1)
      },
      status: {
        in: ["PENDING", "CONFIRMED"]
      }
    }
  });

  // Busca bloqueios parciais (allDay = false) para esta data
  const partialBlocks = await prisma.dateBlock.findMany({
    where: {
      companyId,
      enabled: true,
      allDay: false,
      startDate: { lte: date },
      endDate: { gte: date }
    }
  });

  // Gera slots baseado no horário de funcionamento do serviço
  const startHour = parseInt(service.startTime.split(":")[0]);
  const startMinute = parseInt(service.startTime.split(":")[1]);
  const endHour = parseInt(service.endTime.split(":")[0]);
  const endMinute = parseInt(service.endTime.split(":")[1]);

  let currentTime = new Date(date);
  currentTime.setHours(startHour, startMinute, 0, 0);

  const endTime = new Date(date);
  endTime.setHours(endHour, endMinute, 0, 0);

  // Intervalo padrão de 30 minutos
  const slotInterval = 30;

  while (isBefore(currentTime, endTime)) {
    const timeStr = format(currentTime, "HH:mm");
    
    // Verifica se está no horário de almoço
    if (agendaSettings?.lunchBreakEnabled && 
        isLunchTime(timeStr, agendaSettings.lunchBreakStart, agendaSettings.lunchBreakEnd)) {
      currentTime = addMinutes(currentTime, slotInterval);
      continue;
    }

    // Calcula horário de término do serviço
    const serviceEndTime = addMinutes(currentTime, service.duration);

    // Verifica se tem tempo suficiente antes do fechamento
    if (isAfter(serviceEndTime, endTime)) {
      break;
    }

    // Verifica conflitos com agendamentos existentes
    let hasConflict = false;
    for (const apt of existingAppointments) {
      const aptStart = parse(apt.startTime, "HH:mm", date);
      const aptEnd = parse(apt.endTime, "HH:mm", date);
      
      // Verifica se há sobreposição
      if (
        (isWithinInterval(currentTime, { start: aptStart, end: aptEnd }) ||
        isWithinInterval(serviceEndTime, { start: aptStart, end: aptEnd }) ||
        (isBefore(currentTime, aptStart) && isAfter(serviceEndTime, aptEnd)))
      ) {
        hasConflict = true;
        break;
      }
    }

    // Verifica conflitos com bloqueios parciais
    if (!hasConflict) {
      for (const block of partialBlocks) {
        if (block.startTime && block.endTime) {
          const blockStart = parse(block.startTime, "HH:mm", date);
          const blockEnd = parse(block.endTime, "HH:mm", date);
          
          // Verifica se há sobreposição com o bloqueio parcial
          if (
            (isWithinInterval(currentTime, { start: blockStart, end: blockEnd }) ||
            isWithinInterval(serviceEndTime, { start: blockStart, end: blockEnd }) ||
            (isBefore(currentTime, blockStart) && isAfter(serviceEndTime, blockEnd)))
          ) {
            hasConflict = true;
            break;
          }
        }
      }
    }

    slots.push({
      time: timeStr,
      available: !hasConflict
    });

    currentTime = addMinutes(currentTime, slotInterval);
  }

  return slots;
}

/**
 * Gera calendário com disponibilidade para os próximos N dias
 */
export async function getCalendarAvailability(
  companyId: string,
  serviceId: string,
  daysAhead: number = 30
): Promise<DayAvailability[]> {
  const calendar: DayAvailability[] = [];
  const today = startOfDay(new Date());

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(today, i);
    const slots = await getAvailableSlots(companyId, serviceId, date);
    const availableSlots = slots.filter(s => s.available);

    calendar.push({
      date,
      dateStr: format(date, "yyyy-MM-dd"),
      hasSlots: availableSlots.length > 0,
      slots
    });
  }

  return calendar;
}
