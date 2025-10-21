import { PrismaClient } from "@prisma/client";
import { addHours, subHours, subDays, isBefore, isAfter, addDays, addMinutes } from "date-fns";
import { sendWhatsAppMessage } from "../modules/whatsapp/services/messageService";

const prisma = new PrismaClient();

/**
 * Verifica se já foi enviado um lembrete específico para um agendamento
 */
async function wasReminderSent(appointmentId: string, reminderType: string): Promise<boolean> {
  const log = await prisma.whatsAppLog.findFirst({
    where: {
      appointmentId,
      message: {
        contains: reminderType
      },
      direction: "OUTGOING",
      createdAt: {
        gte: subHours(new Date(), 2)
      }
    }
  });
  
  return !!log;
}

/**
 * Envia lembretes 24h antes do agendamento
 */
export async function send24HourReminders() {
  const tomorrow = addHours(new Date(), 24);
  const tomorrowEnd = addHours(tomorrow, 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      date: {
        gte: tomorrow,
        lt: tomorrowEnd
      },
      status: {
        in: ["PENDING", "CONFIRMED"]
      }
    },
    include: {
      client: true,
      service: true,
      company: true
    }
  });

  for (const apt of appointments) {
    if (await wasReminderSent(apt.id, "é amanhã")) {
      continue;
    }

    const message = `Olá, ${apt.client.fullName}! 👋\n\nLembrete gentil: seu agendamento de *${apt.service.name}* é amanhã às *${apt.startTime}* na ${apt.company.name}. 😊\n\nPor favor, confirme sua presença:\n1️⃣ Confirmar\n2️⃣ Reagendar`;

    await sendWhatsAppMessage(
      apt.client.phone, 
      message, 
      undefined,
      apt.companyId,
      apt.clientId,
      apt.id
    );
  }

  console.log(`✅ Enviados ${appointments.length} lembretes de 24h`);
}

/**
 * Envia lembretes 12h antes para agendamentos não confirmados
 */
export async function send12HourReminders() {
  const in12Hours = addHours(new Date(), 12);
  const in12HoursEnd = addHours(in12Hours, 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      date: {
        gte: in12Hours,
        lt: in12HoursEnd
      },
      status: "PENDING"
    },
    include: {
      client: true,
      service: true,
      company: true
    }
  });

  for (const apt of appointments) {
    if (await wasReminderSent(apt.id, "para hoje")) {
      continue;
    }

    const message = `Olá, ${apt.client.fullName}! 👋\n\nTudo bem? Ainda precisamos confirmar seu agendamento de *${apt.service.name}* para hoje às *${apt.startTime}*.\n\nPosso ajudar a escolher uma nova data?\n\n1️⃣ Confirmar\n2️⃣ Reagendar`;

    await sendWhatsAppMessage(
      apt.client.phone, 
      message,
      undefined,
      apt.companyId,
      apt.clientId,
      apt.id
    );
  }

  console.log(`✅ Enviados ${appointments.length} lembretes de 12h`);
}

/**
 * Envia lembretes 1h antes do agendamento
 */
export async function send1HourReminders() {
  const in1Hour = addHours(new Date(), 1);
  const in1HourEnd = addMinutes(in1Hour, 30);

  const appointments = await prisma.appointment.findMany({
    where: {
      date: {
        gte: in1Hour,
        lt: in1HourEnd
      },
      status: {
        in: ["PENDING", "CONFIRMED"]
      }
    },
    include: {
      client: true,
      service: true,
      company: true
    }
  });

  for (const apt of appointments) {
    const message = `Olá, ${apt.client.fullName}! 👋\n\nEstá quase na hora do seu atendimento — às *${apt.startTime}*.\n\nEstamos te esperando! 😊\n\n📍 ${apt.company.name}\n📞 ${apt.company.phone}`;

    await sendWhatsAppMessage(
      apt.client.phone, 
      message,
      undefined,
      apt.companyId,
      apt.clientId,
      apt.id
    );
  }

  console.log(`✅ Enviados ${appointments.length} lembretes de 1h`);
}

/**
 * Envia pesquisa de satisfação 1 dia após o serviço
 */
export async function sendFeedbackRequests() {
  const yesterday = subDays(new Date(), 1);
  const yesterdayEnd = addHours(yesterday, 24);

  const appointments = await prisma.appointment.findMany({
    where: {
      date: {
        gte: yesterday,
        lt: yesterdayEnd
      },
      status: "COMPLETED"
    },
    include: {
      client: true,
      service: true,
      company: true
    }
  });

  for (const apt of appointments) {
    const message = `Olá, ${apt.client.fullName}! 👋\n\nEsperamos que tenha gostado do atendimento na ${apt.company.name}. 💙\n\nDe 1 a 5, como você avalia sua experiência com *${apt.service.name}*?\n\nResposta: (digite um número de 1 a 5)`;

    await sendWhatsAppMessage(
      apt.client.phone, 
      message,
      undefined,
      apt.companyId,
      apt.clientId,
      apt.id
    );
  }

  console.log(`✅ Enviadas ${appointments.length} pesquisas de satisfação`);
}

/**
 * Marca agendamentos como NO_SHOW se não foram confirmados e já passaram
 */
export async function markNoShows() {
  const now = new Date();

  const appointments = await prisma.appointment.updateMany({
    where: {
      date: { lt: now },
      status: "PENDING"
    },
    data: {
      status: "NO_SHOW"
    }
  });

  console.log(`✅ Marcados ${appointments.count} agendamentos como NO_SHOW`);
}

/**
 * Executa todos os schedulers
 */
export async function runSchedulers() {
  console.log("🔄 Executando schedulers automáticos...");
  
  try {
    await send24HourReminders();
    await send12HourReminders();
    await send1HourReminders();
    await sendFeedbackRequests();
    await markNoShows();
  } catch (error) {
    console.error("❌ Erro ao executar schedulers:", error);
  }
}
