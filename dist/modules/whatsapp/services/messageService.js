"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppMessage = sendWhatsAppMessage;
exports.sendWelcomeMessage = sendWelcomeMessage;
exports.sendRegistrationSuccess = sendRegistrationSuccess;
const twilio_1 = __importDefault(require("twilio"));
function getTwilioClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
        console.error("⚠️ Erro: TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN não configurados.");
    }
    return (0, twilio_1.default)(accountSid, authToken);
}
function getTwilioFromNumber() {
    const twilioFrom = process.env.TWILIO_WHATSAPP_FROM || "";
    const from = twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`;
    if (!from) {
        console.error("⚠️ Erro: TWILIO_WHATSAPP_FROM não configurado.");
    }
    return from;
}
/**
 * Envia mensagem de WhatsApp com ou sem botões simulados
 * @param to - número do destinatário (somente números, ex: "5511999998888")
 * @param message - texto principal da mensagem
 * @param buttons - lista opcional de botões [{ label: string, value?: string }]
 * @returns SID da mensagem ou null em caso de erro
 */
async function sendWhatsAppMessage(to, message, buttons) {
    try {
        if (!to)
            throw new Error("Número de destino não informado.");
        if (!message)
            throw new Error("Mensagem vazia não permitida.");
        // Ajusta o formato do número
        const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
        // Adiciona botões como texto formatado
        let msgBody = message;
        if (buttons && buttons.length > 0) {
            const formattedButtons = buttons
                .map((b, i) => `${i + 1}. ${b.label}`)
                .join("\n");
            msgBody += `\n\nSelecione uma opção:\n${formattedButtons}`;
        }
        const client = getTwilioClient();
        const from = getTwilioFromNumber();
        console.log(`📤 Tentando enviar mensagem via Twilio:`);
        console.log(`   From: ${from}`);
        console.log(`   To: ${formattedTo}`);
        console.log(`   Account SID: ${process.env.TWILIO_ACCOUNT_SID?.substring(0, 10)}...`);
        const msg = await client.messages.create({
            from,
            to: formattedTo,
            body: msgBody,
        });
        console.log(`✅ Mensagem enviada para ${to} | SID: ${msg.sid}`);
        return msg.sid;
    }
    catch (error) {
        console.error("❌ Erro ao enviar mensagem:", error.message || error);
        console.error("   Detalhes completos:", error);
        return null;
    }
}
/**
 * Envia mensagem de boas-vindas com opções iniciais
 * (Fluxo para clientes novos ou número não identificado)
 */
async function sendWelcomeMessage(to) {
    const message = `Olá! 👋\nNão identifiquei seu cadastro no sistema.\nPor favor, selecione uma das opções abaixo:`;
    const buttons = [
        { label: "🆕 Sou um novo cliente" },
        { label: "📱 Mudei de número" },
        { label: "❓Outros assuntos" },
    ];
    return await sendWhatsAppMessage(to, message, buttons);
}
/**
 * Envia confirmação de cadastro concluído
 */
async function sendRegistrationSuccess(to, name) {
    const message = `✅ Cadastro concluído com sucesso, ${name}!\nAgora você pode agendar seus serviços normalmente.`;
    return await sendWhatsAppMessage(to, message);
}
