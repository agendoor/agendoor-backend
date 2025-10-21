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
  const cleaned = phone.replace(/\D/g, '');
  const without55 = cleaned.replace(/^55/, '');
  return `+55${without55}`;
}

/**
 * Obtém os horários disponíveis filtrados por turno
 */
function filterSlotsByShift(slots: any[], shift: 'morning' | 'afternoon') {
  return slots.filter(slot => {
    const hour = parseInt(slot.time.split(':')[0]);
    if (shift === 'morning') {
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
  
  // Busca cliente existente
  let client = await prisma.client.findFirst({ where: { phone: normalizedPhone } });
  const company = await prisma.company.findFirst();

  if (!company) {
    return {
      reply: "Sistema não configurado. Entre em contato com o administrador.",
    };
  }

  // Log da mensagem recebida
  await prisma.whatsAppLog.create({
    data: {
      companyId: company.id,
      clientId: client?.id,
      phone: normalizedPhone,
      message: body,
      direction: "INCOMING",
      paid: false
    }
  });

  // Cliente novo
  if (!client) {
    client = await prisma.client.create({
      data: {
        companyId: company.id,
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
          flowStep: "awaiting_email"
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
          flowStep: "menu"
        },
      });
      
      return { 
        reply: `✅ Cadastro concluído, ${client.fullName}! 💙\n\n👋 Olá, ${client.fullName}! Sou o assistente virtual da *${company.name}* 💈\n\nComo posso te ajudar hoje?`,
        buttons: [
          { label: "🗓️ Novo Agendamento", value: "1" },
          { label: "🔍 Consultar Agendamentos", value: "2" },
          { label: "💬 Falar com Atendente", value: "3" }
        ]
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
            { label: "💬 Falar com Atendente", value: "3" }
          ]
        };
      }

      // Novo agendamento
      if (normalizedBody === "1" || /agendar/.test(normalizedBody) || /novo/.test(normalizedBody)) {
        const services = await prisma.service.findMany({
          where: { companyId: company.id, active: true },
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
          value: `${index + 1}`
        }));

        return { 
          reply: `Perfeito! Qual serviço você deseja agendar?`,
          buttons: serviceButtons
        };
      }

      // Consultar agendamentos
      if (normalizedBody === "2" || /consultar/.test(normalizedBody)) {
        const appointments = await prisma.appointment.findMany({
          where: { 
            clientId: client.id,
            date: { gte: new Date() },
            status: { in: ["PENDING", "CONFIRMED"] }
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
              { label: "📱 Voltar ao menu", value: "menu" }
            ]
          };
        }

        let list = `📅 *Seus próximos agendamentos:*\n\n`;
        appointments.forEach((apt, index) => {
          const dateStr = format(new Date(apt.date), "dd/MM/yyyy (EEEE)", { locale: ptBR });
          list += `${index + 1}. ${dateStr} às ${apt.startTime}\n   📋 ${apt.service.name}\n   📍 Status: ${apt.status === 'CONFIRMED' ? 'Confirmado ✅' : 'Pendente ⏳'}\n\n`;
        });
        list += `📍 ${company.name}\n📞 ${company.phone}\n\n`;
        list += `Digite *menu* para voltar ao início.`;

        return { reply: list };
      }

      // Atendente
      if (normalizedBody === "3" || /atendente/.test(normalizedBody)) {
        return { 
          reply: `Perfeito! 😊\n\nUm atendente entrará em contato com você em breve.\n\n📞 ${company.phone}\n\nAguarde alguns instantes.` 
        };
      }

      return {
        reply: `Não entendi. 😊\n\n👋 Olá, ${client.fullName}! Sou o assistente virtual da *${company.name}* 💈\n\nComo posso te ajudar hoje?`,
        buttons: [
          { label: "🗓️ Novo Agendamento", value: "1" },
          { label: "🔍 Consultar Agendamentos", value: "2" },
          { label: "💬 Falar com Atendente", value: "3" }
        ]
      };

    case "awaiting_service":
      const services = await prisma.service.findMany({
        where: { companyId: company.id, active: true },
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
          { label: "🌇 Tarde (14h às 19h)", value: "afternoon" }
        ]
      };

    case client.flowStep?.startsWith("awaiting_shift:") ? client.flowStep : "":
      const serviceIdFromShift = client.flowStep.split(":")[1];
      
      let selectedShift: 'morning' | 'afternoon' | null = null;
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
            { label: "🌇 Tarde (14h às 19h)", value: "afternoon" }
          ]
        };
      }

      // Gera calendário com disponibilidade
      const calendar = await getCalendarAvailability(company.id, serviceIdFromShift, 15);
      
      // Filtra dias que têm slots no turno selecionado
      const availableDaysWithShift = [];
      for (const day of calendar) {
        if (day.hasSlots) {
          const slots = await getAvailableSlots(company.id, serviceIdFromShift, day.date);
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
          reply: `😔 Sem horários disponíveis no turno da ${selectedShift === 'morning' ? 'manhã' : 'tarde'} nos próximos 15 dias.\n\nEntre em contato por telefone: ${company.phone}\n\nOu tente outro turno.` 
        };
      }

      // Atualiza flowStep com turno selecionado
      await prisma.client.update({
        where: { id: client.id },
        data: { flowStep: `awaiting_date:${serviceIdFromShift}:${selectedShift}` },
      });

      const shiftLabel = selectedShift === 'morning' ? '🌅 Manhã' : '🌇 Tarde';
      const dayButtons = availableDaysWithShift.slice(0, 7).map((day, index) => {
        const today = startOfDay(new Date());
        const tomorrow = addDays(today, 1);
        const dayDate = startOfDay(day.date);
        
        let dayLabel = format(dayDate, "EEEE dd/MM", { locale: ptBR });
        if (dayDate.getTime() === today.getTime()) {
          dayLabel = `Hoje (${format(dayDate, "dd/MM")})`;
        } else if (dayDate.getTime() === tomorrow.getTime()) {
          dayLabel = `Amanhã (${format(dayDate, "dd/MM")})`;
        } else {
          dayLabel = format(dayDate, "EEEE dd/MM", { locale: ptBR });
          dayLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
        }
        
        return {
          label: dayLabel,
          value: `${index + 1}`
        };
      });

      return { 
        reply: `📅 Veja as próximas datas disponíveis (${shiftLabel}):`,
        buttons: dayButtons
      };

    case client.flowStep?.startsWith("awaiting_date:") ? client.flowStep : "":
      const flowParts = client.flowStep.split(":");
      const serviceId = flowParts[1];
      const shift = flowParts[2] as 'morning' | 'afternoon';
      
      const calendar2 = await getCalendarAvailability(company.id, serviceId, 15);
      
      // Refaz filtro de dias com slots no turno
      const availableDaysWithShift2 = [];
      for (const day of calendar2) {
        if (day.hasSlots) {
          const slots = await getAvailableSlots(company.id, serviceId, day.date);
          const shiftSlots = filterSlotsByShift(slots.filter(s => s.available), shift);
          if (shiftSlots.length > 0) {
            availableDaysWithShift2.push(day);
          }
        }
      }

      let selectedDay = null;
      if (/^\d+$/.test(body)) {
        const index = parseInt(body) - 1;
        if (index >= 0 && index < availableDaysWithShift2.length) {
          selectedDay = availableDaysWithShift2[index];
        }
      }

      if (!selectedDay) {
        return { reply: "❌ Data inválida. Digite o número da data:" };
      }

      // Busca horários disponíveis no turno selecionado
      const slots = await getAvailableSlots(company.id, serviceId, selectedDay.date);
      const freeSlots = filterSlotsByShift(slots.filter(s => s.available), shift);

      if (freeSlots.length === 0) {
        return { reply: "😔 Sem horários disponíveis nesta data no turno selecionado. Escolha outra:" };
      }

      // IMPORTANTE: Persiste o turno no flowStep para manter a preferência do usuário
      await prisma.client.update({
        where: { id: client.id },
        data: { flowStep: `awaiting_time:${serviceId}:${selectedDay.dateStr}:${shift}` },
      });

      const slotButtons = freeSlots.slice(0, 10).map((slot, index) => ({
        label: slot.time,
        value: `${index + 1}`
      }));

      const shiftLabel2 = shift === 'morning' ? '🌅 Manhã' : '🌇 Tarde';
      return { 
        reply: `⏰ Horários disponíveis para ${format(selectedDay.date, "dd/MM/yyyy (EEEE)", { locale: ptBR })} (${shiftLabel2}):`,
        buttons: slotButtons
      };

    case client.flowStep?.startsWith("awaiting_time:") ? client.flowStep : "":
      const flowParts2 = client.flowStep.split(":");
      const flowServiceId = flowParts2[1];
      const flowDateStr = flowParts2[2];
      const flowShift = flowParts2[3] as 'morning' | 'afternoon' | undefined;
      
      const flowDate = parse(flowDateStr, "yyyy-MM-dd", new Date());
      const slots2 = await getAvailableSlots(company.id, flowServiceId, flowDate);
      
      // IMPORTANTE: Filtra slots pelo turno selecionado anteriormente
      const freeSlots2 = flowShift 
        ? filterSlotsByShift(slots2.filter(s => s.available), flowShift)
        : slots2.filter(s => s.available);

      let selectedSlot = null;
      if (/^\d+$/.test(body)) {
        const index = parseInt(body) - 1;
        if (index >= 0 && index < freeSlots2.length) {
          selectedSlot = freeSlots2[index];
        }
      }

      if (!selectedSlot) {
        return { reply: "❌ Horário inválido. Digite o número do horário:" };
      }

      const service = await prisma.service.findUnique({
        where: { id: flowServiceId },
      });

      if (!service) {
        await prisma.client.update({
          where: { id: client.id },
          data: { flowStep: "menu" },
        });
        return { reply: "❌ Erro ao processar. Tente novamente." };
      }

      // Calcula horário de término
      const [hours, minutes] = selectedSlot.time.split(":").map(Number);
      let endHour = hours + Math.floor(service.duration / 60);
      let endMinute = minutes + (service.duration % 60);
      
      if (endMinute >= 60) {
        endHour += Math.floor(endMinute / 60);
        endMinute = endMinute % 60;
      }
      
      const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

      // Cria agendamento
      const appointmentDate = parse(flowDateStr + " " + selectedSlot.time, "yyyy-MM-dd HH:mm", new Date());

      try {
        const appointment = await prisma.appointment.create({
          data: {
            companyId: company.id,
            clientId: client.id,
            serviceId: flowServiceId,
            date: appointmentDate,
            startTime: selectedSlot.time,
            endTime: endTime,
            status: "CONFIRMED",
            totalValue: service.price,
          },
        });

        await prisma.client.update({
          where: { id: client.id },
          data: { flowStep: "menu" },
        });

        const dateFormatted = format(appointmentDate, "dd/MM/yyyy (EEEE)", { locale: ptBR });

        return { 
          reply: `✅ Perfeito, ${client.fullName}!\nSeu agendamento foi confirmado 🎉\n\n💼 ${service.name}\n📅 ${dateFormatted}\n⏰ ${selectedSlot.time}\n📍 ${company.name}\n📞 ${company.phone}\n\nNos vemos em breve! 💙`
        };
      } catch (error) {
        console.error("❌ Erro ao criar agendamento:", error);
        await prisma.client.update({
          where: { id: client.id },
          data: { flowStep: "menu" },
        });
        return { reply: "❌ Erro ao agendar. Tente novamente ou fale com um atendente." };
      }

    default:
      await prisma.client.update({
        where: { id: client.id },
        data: { flowStep: "menu" },
      });
      return {
        reply: `👋 Olá, ${client.fullName}! Sou o assistente virtual da *${company.name}* 💈\n\nComo posso te ajudar hoje?`,
        buttons: [
          { label: "🗓️ Novo Agendamento", value: "1" },
          { label: "🔍 Consultar Agendamentos", value: "2" },
          { label: "💬 Falar com Atendente", value: "3" }
        ]
      };
  }
}
