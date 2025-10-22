import express = require("express");
import { handleIncomingMessage, normalizePhoneNumber } from "../services/flowEngine";
import { handleDynamicMessage } from "../services/dynamicFlow";
import { sendWhatsAppMessage } from "../services/messageService";
import { AuthRequest, authMiddleware } from "../../middleware/auth"; // Importar AuthRequest e authMiddleware

const router = express.Router();

// A rota /send-whatsapp pode ser acessada por usuários autenticados para enviar mensagens
router.post("/send-whatsapp", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { to, message } = req.body;
    const companyId = req.user?.companyId; // Obter companyId do usuário autenticado

    if (!companyId) {
      return res.status(401).json({ error: "companyId não encontrado no usuário autenticado." });
    }

    if (!to || !message) {
      return res.status(400).json({ error: "Campos 'to' e 'message' são obrigatórios" });
    }

    console.log("📤 Tentando enviar mensagem via Twilio:");
    console.log("   Para:", to);
    console.log("   Mensagem:", message);

    // TODO: Adicionar companyId ao sendWhatsAppMessage para registrar no contexto correto, se aplicável
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
 * Esta rota é pública, mas a lógica interna deve determinar a companyId
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

    // TODO: Implementar lógica para determinar companyId a partir do número de telefone ou outro identificador
    // Por enquanto, o bot não tem companyId, o que pode ser um problema para segregação.
    // Isso precisará de um ajuste mais profundo na lógica do bot para vincular o número de telefone
    // a uma empresa específica, ou o bot precisará de um 
