"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const messageService_1 = require("./modules/whatsapp/services/messageService");
// Carrega variáveis de ambiente
dotenv_1.default.config();
async function testTwilioMessage() {
    console.log("🧪 ===== TESTE DE ENVIO TWILIO =====\n");
    // Verifica variáveis de ambiente
    console.log("🔍 Verificando configurações:");
    console.log(`   TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`   TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`   TWILIO_WHATSAPP_FROM: ${process.env.TWILIO_WHATSAPP_FROM || '❌ Não configurado'}\n`);
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
        console.error("❌ Erro: Variáveis de ambiente do Twilio não configuradas!");
        console.error("Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_FROM no arquivo .env\n");
        process.exit(1);
    }
    // Número de destino (deve ser um número que você tem acesso no sandbox do Twilio)
    const destinationNumber = process.argv[2];
    if (!destinationNumber) {
        console.error("❌ Erro: Número de destino não fornecido!");
        console.error("Uso: npm run test:twilio <numero>");
        console.error("Exemplo: npm run test:twilio +5517999999999\n");
        process.exit(1);
    }
    console.log(`📱 Número de destino: ${destinationNumber}\n`);
    // Mensagem de teste
    const testMessage = "🎉 Teste de integração Twilio WhatsApp!\n\nSe você recebeu esta mensagem, a integração está funcionando perfeitamente! 🚀";
    console.log("📤 Enviando mensagem de teste...\n");
    try {
        const sid = await (0, messageService_1.sendWhatsAppMessage)(destinationNumber, testMessage);
        if (sid) {
            console.log("\n✅ ===== TESTE CONCLUÍDO COM SUCESSO =====");
            console.log(`✅ Mensagem enviada com sucesso!`);
            console.log(`✅ SID da mensagem: ${sid}`);
            console.log("✅ Verifique seu WhatsApp para confirmar o recebimento.\n");
        }
        else {
            console.log("\n❌ ===== TESTE FALHOU =====");
            console.log("❌ Falha ao enviar mensagem.");
            console.log("❌ Verifique os logs acima para mais detalhes.\n");
            process.exit(1);
        }
    }
    catch (error) {
        console.error("\n❌ ===== ERRO NO TESTE =====");
        console.error("Erro:", error.message);
        console.error("Stack:", error.stack);
        console.error("================================\n");
        process.exit(1);
    }
}
// Executa o teste
testTwilioMessage();
