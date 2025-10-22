import { PrismaClient } from "@prisma/client";
import { getCalendarAvailability, getAvailableSlots } from "../../../utils/calendar";
import { sendWhatsAppMessage } from "./messageService";
import { format, parse, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const prisma = new PrismaClient();

/**
 * Normaliza o número de telefone
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const without55 = cleaned.replace(/^55/, "");
  return `+55${without55}`;
}

/**
 * Obtém os horários disponíveis filtrados por turno
 */
function filterSlotsByShift(slots: any[], shift: "morning" | "afternoon") {
  return slots.filter(slot => {
    const hour = parseInt(slot.time.split(":")[0]);
    if (shift === "morning") {
      return hour >= 8 && hour < 12;
    } else {
      return hour >= 14 && hour < 19;
    }
  });
}

/**
 * Lida com mensagens recebidas - fluxo inteligente aprimorado
 */
export async function handleDynamicMessage(
  phone: string,
  body: string,
  name: string
) {
  const normalizedPhone = normalizePhoneNumber(phone);
  console.log(`📩 Mensagem recebida de ${normalizedPhone}: "${body}"`);

  // TODO: Implementar lógica para determinar a companyId a partir do número de telefone do bot
  // Por enquanto, vamos assumir uma companyId padrão ou a primeira encontrada para fins de teste
  // Em um ambiente de produção, isso seria crucial para a segregação de dados.
  const company = await prisma.company.findFirst(); // AQUI É NECESSÁRIO UM companyId ESPECÍFICO
  if (!company) {
    return {
      reply: "Sistema não configurado. Entre em contato com o administrador.",
    };
  }
  const companyId = company.id; // Usar a companyId encontrada (temporário para teste)

  // Busca cliente existente associado à companyId
  let client = await prisma.client.findFirst({ where: { phone: normalizedPhone, companyId } });

  // Log da mensagem recebida
  await prisma.whatsAppLog.create({
    data: {
      companyId: companyId,
      clientId: client?.id,
      phone: normalizedPhone,
      message: body,
      direction: "INCOMING",
      paid: false,
    },
  });

  // Cliente novo
  if (!client) {
    client = await prisma.client.create({
      data: {
        companyId: companyId,
        phone: normalizedPhone,
        fullName: name || "Cliente Temporário",
        email: `temp_${normalizedPhone.replace(/\D/g, "")}@placeholder.local`,
        flowStep: "awaiting_name",
      },
    });

    return {
      reply: `👋 Olá! Bem-vindo(a) à *${company.name}*!\n\nPara começar, me diga seu *nome completo*:`, 
      buttons: []
    };
  }

  // Fluxo baseado no flowStep
  const normalizedBody = body.trim().toLowerCase();

  switch (client.flowStep) {
    case "awaiting_name":
      await prisma.client.update({
        where: { id: client.id },
        data: {
          fullName: body,
          flowStep: "awaiting_email",
        },
      });
      return { reply: `Perfeito, ${body}! 😊\n\nAgora me envie seu *e-mail*:` };

    case "awaiting_email":
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body)) {
        return { reply: "❌ E-mail inválido. Envie um e-mail válido:" };
      }

      await prisma.client.update({
        where: { id: client.id },
        data: {
          email: body.toLowerCase().trim(),
          cpf: `auto_${normalizedPhone.replace(/\D/g, "")}`,
          flowStep: "menu",
        },
      });

      return {
        reply: `✅ Cadastro concluído, ${client.fullName}! 💙\n\n👋 Olá, ${client.fullName}! Sou o assistente virtual da *${company.name}* 💈\n\nComo posso te ajudar hoje?`,
        buttons: [
          { label: "🗓️ Novo Agendamento", value: "1" },
          { label: "🔍 Consultar Agendamentos", value: "2" },
          { label: "💬 Falar com Atendente", value: "3" },
        ],
      };

    case "menu":
    case "registered":
      // Menu principal humanizado
      if (normalizedBody === "oi" || normalizedBody === "olá" || normalizedBody === "menu" || normalizedBody === "início" || normalizedBody === "inicio") {
        return {
          reply: `👋 Olá, ${client.fullName}! Sou o assistente virtual da *${company.name}* 💈\n\nComo posso te ajudar hoje?`,
          buttons: [
            { label: "🗓️ Novo Agendamento", value: "1" },
            { label: "🔍 Consultar Agendamentos", value: "2" },
            { label: "💬 Falar com Atendente", value: "3" },
          ],
        };
      }

      // Novo agendamento
      if (normalizedBody === "1" || /agendar/.test(normalizedBody) || /novo/.test(normalizedBody)) {
        const services = await prisma.service.findMany({
          where: { companyId: companyId, active: true },
          take: 10,
        });

        if (services.length === 0) {
          return { reply: "❌ Nenhum serviço disponível no momento." };
        }

        await prisma.client.update({
          where: { id: client.id },
          data: { flowStep: "awaiting_service" },
        });

        const serviceButtons = services.map((service, index) => ({
          label: `${service.name}`,
          value: `${index + 1}`,
        }));

        return {
          reply: `Perfeito! Qual serviço você deseja agendar?`,
          buttons: serviceButtons,
        };
      }

      // Consultar agendamentos
      if (normalizedBody === "2" || /consultar/.test(normalizedBody)) {
        const appointments = await prisma.appointment.findMany({
          where: {
            clientId: client.id,
            companyId: companyId, // Adicionar companyId ao filtro
            date: { gte: new Date() },
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          include: { service: true },
          orderBy: { date: "asc" },
          take: 5,
        });

        if (appointments.length === 0) {
          return {
            reply: `📅 Você não possui agendamentos futuros.\n\nGostaria de fazer um novo agendamento?`,
            buttons: [
              { label: "🗓️ Sim, agendar agora", value: "1" },
              { label: "📱 Voltar ao menu", value: "menu" },
            ],
          };
        }

        let list = `📅 *Seus próximos agendamentos:*\n\n`;
        appointments.forEach((apt, index) => {
          const dateStr = format(new Date(apt.date), "dd/MM/yyyy (EEEE)", { locale: ptBR });
          list += `${index + 1}. ${dateStr} às ${apt.startTime}\n   📋 ${apt.service.name}\n   📍 Status: ${apt.status === "CONFIRMED" ? "Confirmado ✅" : "Pendente ⏳"}\n\n`;
        });
        list += `📍 ${company.name}\n📞 ${company.phone}\n\n`;
        list += `Digite *menu* para voltar ao início.`;

        return { reply: list };
      }

      // Atendente
      if (normalizedBody === "3" || /atendente/.test(normalizedBody)) {
        return {
          reply: `Perfeito! 😊\n\nUm atendente entrará em contato com você em breve.\n\n📞 ${company.phone}\n\nAguarde alguns instantes.`,
        };
      }

      return {
        reply: `Não entendi. 😊\n\n👋 Olá, ${client.fullName}! Sou o assistente virtual da *${company.name}* 💈\n\nComo posso te ajudar hoje?`,
        buttons: [
          { label: "🗓️ Novo Agendamento", value: "1" },
          { label: "🔍 Consultar Agendamentos", value: "2" },
          { label: "💬 Falar com Atendente", value: "3" },
        ],
      };

    case client.flowStep?.startsWith("awaiting_service:") ? client.flowStep : "":
      const services = await prisma.service.findMany({
        where: { companyId: companyId, active: true },
      });

      let selectedService = null;

      if (/^\d+$/.test(body)) {
        const index = parseInt(body) - 1;
        if (index >= 0 && index < services.length) {
          selectedService = services[index];
        }
      }

      if (!selectedService) {
        return { reply: "❌ Serviço inválido. Digite o número do serviço:" };
      }

      // Atualiza flowStep com serviço selecionado - agora solicita turno
      await prisma.client.update({
        where: { id: client.id },
        data: { flowStep: `awaiting_shift:${selectedService.id}` },
      });

      return {
        reply: `Ótima escolha! ☺️\n\n📋 Serviço: *${selectedService.name}*\n\nVocê prefere horário de *manhã ou à tarde*?`,
        buttons: [
          { label: "🌅 Manhã (8h às 12h)", value: "morning" },
          { label: "🌇 Tarde (14h às 19h)", value: "afternoon" },
        ],
      };

    case client.flowStep?.startsWith("awaiting_shift:") ? client.flowStep : "":
      const serviceIdFromShift = client.flowStep.split(":")[1];

      let selectedShift: "morning" | "afternoon" | null = null;
      if (normalizedBody === "morning" || normalizedBody === "manhã" || normalizedBody === "1" || /manh/i.test(body)) {
        selectedShift = "morning";
      } else if (normalizedBody === "afternoon" || normalizedBody === "tarde" || normalizedBody === "2" || /tarde/i.test(body)) {
        selectedShift = "afternoon";
      }

      if (!selectedShift) {
        return {
          reply: "❌ Opção inválida. Escolha um turno:",
          buttons: [
            { label: "🌅 Manhã (8h às 12h)", value: "morning" },
            { label: "🌇 Tarde (14h às 19h)", value: "afternoon" },
          ],
        };
      }

      // Gera calendário com disponibilidade
      const calendar = await getCalendarAvailability(companyId, serviceIdFromShift, 15);

      // Filtra dias que têm slots no turno selecionado
      const availableDaysWithShift = [];
      for (const day of calendar) {
        if (day.hasSlots) {
          const slots = await getAvailableSlots(companyId, serviceIdFromShift, day.date);
          const shiftSlots = filterSlotsByShift(slots.filter(s => s.available), selectedShift);
          if (shiftSlots.length > 0) {
            availableDaysWithShift.push(day);
          }
        }
      }

      if (availableDaysWithShift.length === 0) {
        await prisma.client.update({
          where: { id: client.id },
          data: { flowStep: "menu" },
        });
        return {
          reply: `😔 Sem horários disponíveis no turno da ${selectedShift === "morning" ? "manhã" : "tarde"} nos próximos 15 dias.\n\nEntre em contato por telefone: ${company.phone}\n\nOu tente outro turno.`,
        };
      }

      // Atualiza flowStep com turno selecionado
      await prisma.client.update({
        where: { id: client.id },
        data: { flowStep: `awaiting_date:${serviceIdFromShift}:${selectedShift}` },
      });

      const shiftLabel = selectedShift === "morning" ? "🌅 Manhã" : "🌇 Tarde";
      const dayButtons = availableDaysWithShift.slice(0, 7).map((day, index) => {
        const today = startOfDay(new Date());
        const tomorrow = addDays(today, 1);
        const dayDate = startOfDay(day.date);

        let dayLabel = format(dayDate, "EEEE dd/MM", { locale: ptBR });
        if (dayDate.getTime() === today.getTime()) {
          dayLabel = "Hoje";
        } else if (dayDate.getTime() === tomorrow.getTime()) {
          dayLabel = "Amanhã";
        }

        return {
          label: `${dayLabel} (${shiftLabel})`,
          value: `${index + 1}`,
        };
      });

      return {
        reply: `Certo, para qual dia você gostaria de agendar no turno da ${selectedShift === "morning" ? "manhã" : "tarde"}?`,
        buttons: dayButtons,
      };

    case client.flowStep?.startsWith("awaiting_date:") ? client.flowStep : "":
      const [, serviceIdFromDate, selectedShiftFromDate] = client.flowStep.split(":");
      const selectedDayIndex = parseInt(normalizedBody) - 1;

      const calendarFromDate = await getCalendarAvailability(companyId, serviceIdFromDate, 15);
      const availableDaysFromDate = calendarFromDate.filter(day => day.hasSlots);

      if (selectedDayIndex < 0 || selectedDayIndex >= availableDaysFromDate.length) {
        return { reply: "❌ Dia inválido. Por favor, escolha um dia da lista." };
      }

      const selectedDate = availableDaysFromDate[selectedDayIndex].date;
      const availableSlotsForDate = await getAvailableSlots(companyId, serviceIdFromDate, selectedDate);
      const filteredSlotsForDate = filterSlotsByShift(availableSlotsForDate.filter(s => s.available), selectedShiftFromDate as "morning" | "afternoon");

      if (filteredSlotsForDate.length === 0) {
        await prisma.client.update({
          where: { id: client.id },
          data: { flowStep: "menu" },
        });
        return { reply: "😔 Não há horários disponíveis para este dia e turno. Por favor, tente outro dia ou turno." };
      }

      await prisma.client.update({
        where: { id: client.id },
        data: { flowStep: `awaiting_time:${serviceIdFromDate}:${selectedShiftFromDate}:${format(selectedDate, "yyyy-MM-dd")}` },
      });

      const timeButtons = filteredSlotsForDate.map((slot, index) => ({
        label: slot.time,
        value: `${index + 1}`,
      }));

      return {
        reply: `Perfeito! Qual horário você prefere para ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}?`,
        buttons: timeButtons,
      };

    case client.flowStep?.startsWith("awaiting_time:") ? client.flowStep : "":
      const [, serviceIdFromTime, selectedShiftFromTime, selectedDateString] = client.flowStep.split(":");
      const selectedTimeIndex = parseInt(normalizedBody) - 1;

      const selectedDateObj = parse(selectedDateString, "yyyy-MM-dd", new Date());
      const availableSlotsForTime = await getAvailableSlots(companyId, serviceIdFromTime, selectedDateObj);
      const filteredSlotsForTime = filterSlotsByShift(availableSlotsForTime.filter(s => s.available), selectedShiftFromTime as "morning" | "afternoon");

      if (selectedTimeIndex < 0 || selectedTimeIndex >= filteredSlotsForTime.length) {
        return { reply: "❌ Horário inválido. Por favor, escolha um horário da lista." };
      }

      const selectedTime = filteredSlotsForTime[selectedTimeIndex].time;

      // Encontrar o profissional disponível para o horário
      // TODO: Implementar lógica de seleção de profissional mais robusta
      const professional = await prisma.professional.findFirst({
        where: { companyId: companyId, active: true },
      });

      if (!professional) {
        return { reply: "❌ Nenhum profissional disponível para agendamento." };
      }

      // Criar agendamento
      const newAppointment = await prisma.appointment.create({
        data: {
          companyId: companyId,
          clientId: client.id,
          professionalId: professional.id,
          serviceId: serviceIdFromTime,
          date: selectedDateObj,
          startTime: selectedTime,
          endTime: "", // Será calculado pelo frontend ou em um serviço
          status: "PENDING",
          notes: "Agendado via WhatsApp Bot",
        },
      });

      await prisma.client.update({
        where: { id: client.id },
        data: { flowStep: "menu" },
      });

      const appointmentDateFormatted = format(newAppointment.date, "dd/MM/yyyy", { locale: ptBR });
      return {
        reply: `✅ Agendamento confirmado para ${appointmentDateFormatted} às ${newAppointment.startTime} com ${professional.fullName}!\n\nObrigado por agendar com a *${company.name}*!\n\nDigite *menu* para voltar ao início.`,
      };

    default:
      return {
        reply: `Não entendi. 😊\n\n👋 Olá, ${client.fullName}! Sou o assistente virtual da *${company.name}* 💈\n\nComo posso te ajudar hoje?`,
        buttons: [
          { label: "🗓️ Novo Agendamento", value: "1" },
          { label: "🔍 Consultar Agendamentos", value: "2" },
          { label: "💬 Falar com Atendente", value: "3" },
        ],
      };
  }
}

