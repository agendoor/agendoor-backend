import express = require("express");
import { handleIncomingMessage, normalizePhoneNumber } from "../services/flowEngine";
import { handleDynamicMessage } from "../services/dynamicFlow";
import { sendWhatsAppMessage } from "../services/messageService";

const router = express.Router();

/**
 * ✅ Rota pública para testar envio de mensagens via Twilio
 * Exemplo:
 * curl -X POST https://<sua-url>/api/whatsapp/send-whatsapp \
 *   -H "Content-Type: application/json" \
 *   -d '{"to":"+5517999999999","message":"Teste funcionando!"}'
 */
router.post("/send-whatsapp", async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: "Campos 'to' e 'message' são obrigatórios" });
    }

    console.log("📤 Tentando enviar mensagem via Twilio:");
    console.log("   Para:", to);
    console.log("   Mensagem:", message);

    const sid = await sendWhatsAppMessage(to, message);

    if (!sid) {
      return res.status(500).json({ success: false, error: "Falha ao enviar mensagem" });
    }

    return res.status(200).json({
      success: true,
      sid,
      message: "Mensagem enviada com sucesso via Twilio WhatsApp API",
    });
  } catch (err: any) {
    console.error("❌ Erro ao enviar mensagem:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ✅ Webhook: Recebe mensagens do Twilio
 * (usado para receber mensagens enviadas por clientes)
 */
router.post("/webhook", async (req, res) => {
  try {
    console.log("📥 ===== WEBHOOK TWILIO RECEBIDO =====");
    console.log("📋 Body completo:", JSON.stringify(req.body, null, 2));
    
    const { From, Body, ProfileName } = req.body;
    
    if (!From || !Body) {
      console.error("❌ Webhook inválido: faltam campos From ou Body");
      return res.status(400).json({ 
        success: false, 
        error: "Campos From e Body são obrigatórios" 
      });
    }
    
    const rawPhone = From.replace("whatsapp:", "").trim();
    const phone = normalizePhoneNumber(rawPhone);
    const message = Body?.trim();
    const name = ProfileName || "Cliente";
    
    console.log(`📞 De: ${phone} (Nome: ${name})`);
    console.log(`💬 Mensagem: "${message}"`);

    // Usa o novo fluxo dinâmico com calendário inteligente
    const response = await handleDynamicMessage(phone, message, name);
    
    console.log(`📤 Resposta gerada:`, JSON.stringify(response, null, 2));

    if (response?.reply) {
      const sid = await sendWhatsAppMessage(phone, response.reply, (response as any).buttons);
      
      if (sid) {
        console.log(`✅ Mensagem enviada com sucesso | SID: ${sid}`);
      } else {
        console.error(`❌ Falha ao enviar mensagem para ${phone}`);
      }
    } else {
      console.log(`ℹ️ Nenhuma resposta gerada para enviar`);
    }

    console.log("✅ ===== WEBHOOK PROCESSADO COM SUCESSO =====\n");
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("❌ ===== ERRO NO WEBHOOK =====");
    console.error("Erro ao processar mensagem:", err);
    console.error("Stack:", err.stack);
    console.error("=====================================\n");
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
