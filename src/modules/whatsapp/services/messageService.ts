import twilio from "twilio";
import { PrismaClient } from "@prisma/client";
import { subHours } from "date-fns";

const prisma = new PrismaClient();

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.error("⚠️ Erro: TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN não configurados.");
  }

  return twilio(accountSid, authToken);
}

async function isWithinFreeWindow(phone: string): Promise<boolean> {
  const last24Hours = subHours(new Date(), 24);

  const lastIncomingMessage = await prisma.whatsAppLog.findFirst({
    where: {
      phone,
      direction: "INCOMING",
      createdAt: { gte: last24Hours }
    },
    orderBy: { createdAt: "desc" }
  });

  return !!lastIncomingMessage;
}

function getTwilioFromNumber() {
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM || "";
  const from = twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`;
  if (!from) console.error("⚠️ Erro: TWILIO_WHATSAPP_FROM não configurado.");
  return from;
}

/**
 * Envia mensagem de WhatsApp com botões interativos (Quick Reply ou List)
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  buttons?: { label: string; value?: string }[],
  companyId?: string,
  clientId?: string,
  appointmentId?: string
): Promise<string | null> {
  try {
    if (!to) throw new Error("Número de destino não informado.");
    if (!message) throw new Error("Mensagem vazia não permitida.");

    const normalizedPhone = to.startsWith("+") ? to : `+${to.replace(/\D/g, "")}`;
    const formattedTo = normalizedPhone.startsWith("whatsapp:") ? normalizedPhone : `whatsapp:${normalizedPhone}`;

    const isFree = await isWithinFreeWindow(normalizedPhone);
    const estimatedCost = isFree ? 0 : 0.005;

    const client = getTwilioClient();
    const from = getTwilioFromNumber();

    console.log(`📤 Enviando mensagem para ${formattedTo} (${isFree ? "GRÁTIS" : "PAGA"})`);

    let msg;
    let finalMessage = message;
    
    // 🟢 Caso tenha botões, formata como opções numeradas (sandbox-friendly)
    if (buttons && buttons.length > 0) {
      const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      
      finalMessage = message + '\n\n';
      buttons.forEach((button, index) => {
        const emoji = numberEmojis[index] || `${index + 1}.`;
        finalMessage += `${emoji} ${button.label}\n`;
      });
      finalMessage += '\n_Digite o número da opção desejada_';
    }
    
    // Envia como mensagem de texto simples
    msg = await client.messages.create({ 
      from, 
      to: formattedTo, 
      body: finalMessage 
    });

    // 🗒️ Log no banco
    if (companyId) {
      await prisma.whatsAppLog.create({
        data: {
          companyId,
          clientId,
          appointmentId,
          phone: normalizedPhone,
          message,
          direction: "OUTGOING",
          messageSid: msg.sid,
          paid: !isFree,
          cost: estimatedCost,
          status: msg.status,
        },
      });
    }

    console.log(`✅ Mensagem enviada | SID: ${msg.sid}`);
    return msg.sid;
  } catch (error: any) {
    console.error("❌ Erro ao enviar mensagem:", error.message || error);
    console.error("   Detalhes:", error);
    return null;
  }
}

export async function sendWelcomeMessage(to: string) {
  const message = `Olá! 👋\nNão identifiquei seu cadastro no sistema.\nPor favor, selecione uma das opções abaixo:`;
  const buttons = [
    { label: "🆕 Sou um novo cliente" },
    { label: "📱 Mudei de número" },
    { label: "❓ Outros assuntos" },
  ];

  return await sendWhatsAppMessage(to, message, buttons);
}

export async function sendRegistrationSuccess(to: string, name: string) {
  const message = `✅ Cadastro concluído com sucesso, ${name}!\nAgora você pode agendar seus serviços normalmente.`;
  return await sendWhatsAppMessage(to, message);
}
