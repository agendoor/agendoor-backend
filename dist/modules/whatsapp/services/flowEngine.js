"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIncomingMessage = handleIncomingMessage;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function handleIncomingMessage(phone, body, name) {
    console.log(`📩 Mensagem recebida de ${phone}: "${body}"`);
    // Busca cliente existente pelo número de telefone
    let client = await prisma.client.findFirst({ where: { phone } });
    // 🔹 Novo cliente (não encontrado no banco)
    if (!client) {
        console.log(`🆕 Cliente novo detectado: ${phone}`);
        // Busca uma companhia existente (primeira empresa cadastrada)
        const company = await prisma.company.findFirst();
        if (!company) {
            console.error("❌ Nenhuma empresa cadastrada no sistema!");
            return {
                reply: "Desculpe, o sistema não está configurado corretamente. Entre em contato com o administrador.",
            };
        }
        // Cria registro temporário com flowStep inicial
        client = await prisma.client.create({
            data: {
                companyId: company.id,
                phone,
                fullName: name || "Cliente Temporário",
                cpf: `temp_${phone.replace(/\D/g, "")}`, // CPF temporário único
                flowStep: "awaiting_choice",
            },
        });
        console.log(`✅ Cliente temporário criado: ${client.id}`);
        return {
            reply: "Olá 👋, não encontrei seu cadastro.\nSelecione uma opção abaixo:",
            buttons: [
                { label: "Sou novo(a) cliente", value: "1" },
                { label: "Mudei de número", value: "2" },
            ],
        };
    }
    console.log(`👤 Cliente identificado: ${client.fullName} (ID: ${client.id}, FlowStep: ${client.flowStep})`);
    // 🔹 Controle do fluxo pelo flowStep
    switch (client.flowStep) {
        case "awaiting_choice":
            console.log(`⏳ Cliente aguardando escolha: ${phone}`);
            // Cliente escolheu "Sou novo(a)" - solicita nome completo
            if (body === "1" || /novo/i.test(body)) {
                console.log(`✅ Cliente escolheu: Novo cliente`);
                await prisma.client.update({
                    where: { id: client.id },
                    data: { flowStep: "awaiting_name" },
                });
                return { reply: "Perfeito! Me envie seu nome completo para criarmos seu cadastro 📝" };
            }
            // Cliente escolheu "Mudei de número" - solicita CPF para localizar cadastro
            if (body === "2" || /mudei/i.test(body)) {
                console.log(`✅ Cliente escolheu: Mudei de número`);
                await prisma.client.update({
                    where: { id: client.id },
                    data: { flowStep: "awaiting_cpf" },
                });
                return { reply: "Certo! 😊 Me envie seu CPF para localizar seu cadastro antigo." };
            }
            console.log(`⚠️ Opção inválida recebida: "${body}"`);
            return {
                reply: "Por favor, selecione uma opção válida:",
                buttons: [
                    { label: "Sou novo(a) cliente", value: "1" },
                    { label: "Mudei de número", value: "2" },
                ],
            };
        case "awaiting_name":
            console.log(`📝 Recebendo nome do cliente: ${body}`);
            // Atualiza o cliente com nome completo e finaliza cadastro
            await prisma.client.update({
                where: { id: client.id },
                data: {
                    fullName: body,
                    cpf: `${phone.replace(/\D/g, "")}`, // CPF baseado no telefone
                    flowStep: "registered"
                },
            });
            console.log(`✅ Cliente cadastrado com sucesso: ${body}`);
            return { reply: `✅ Cadastro concluído com sucesso, ${body}! Agora você pode agendar seus serviços normalmente.` };
        case "awaiting_cpf":
            console.log(`🔍 Buscando cliente com CPF: ${body}`);
            // Remove caracteres não numéricos do CPF
            const cpfClean = body.replace(/\D/g, "");
            // Busca cliente antigo com esse CPF na mesma empresa
            const existingClient = await prisma.client.findFirst({
                where: {
                    cpf: cpfClean,
                    companyId: client.companyId
                }
            });
            // Se encontrou cliente antigo diferente do temporário
            if (existingClient && existingClient.id !== client.id) {
                console.log(`✅ Cliente antigo encontrado: ${existingClient.fullName}`);
                // Atualiza o número de telefone do cliente antigo
                await prisma.client.update({
                    where: { id: existingClient.id },
                    data: { phone, flowStep: "registered" },
                });
                // Remove o cliente temporário usando deleteMany (phone não é único)
                await prisma.client.deleteMany({
                    where: {
                        id: client.id,
                        companyId: client.companyId
                    }
                });
                return {
                    reply: `✅ Cadastro encontrado com sucesso, ${existingClient.fullName}! Atualizei seu número de telefone. Agora você pode agendar seus serviços.`
                };
            }
            else {
                console.log(`⚠️ CPF não encontrado, finalizando cadastro com CPF fornecido`);
                // Atualiza o cliente temporário com o CPF fornecido
                await prisma.client.update({
                    where: { id: client.id },
                    data: { cpf: cpfClean, flowStep: "registered" },
                });
                return { reply: `✅ Cadastro atualizado com sucesso! Agora você pode agendar seus serviços.` };
            }
        case "registered":
            console.log(`👤 Cliente registrado acessando menu: ${client.fullName}`);
            // Cliente quer agendar horário
            if (/agendar/i.test(body) || body === "1") {
                console.log(`📅 Cliente quer agendar`);
                await prisma.client.update({
                    where: { id: client.id },
                    data: { flowStep: "awaiting_service" },
                });
                const services = await prisma.service.findMany({
                    where: { companyId: client.companyId, active: true },
                    take: 10,
                });
                if (services.length === 0) {
                    return { reply: "❌ No momento não temos serviços disponíveis. Entre em contato com a administração." };
                }
                let serviceList = `Perfeito, ${client.fullName}! 💬 Qual serviço deseja agendar?\n\n`;
                services.forEach((service, index) => {
                    serviceList += `${index + 1}️⃣ ${service.name}\n`;
                });
                serviceList += `\nDigite o número ou nome do serviço:`;
                return { reply: serviceList };
            }
            // Cliente quer consultar agendamentos
            if (/consultar/i.test(body) || body === "2") {
                console.log(`🔍 Cliente quer consultar agendamentos`);
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
                    return { reply: "📅 Você não possui agendamentos futuros no momento." };
                }
                let appointmentList = "📅 Seus agendamentos:\n\n";
                appointments.forEach((apt) => {
                    const dateFormatted = new Date(apt.date).toLocaleDateString("pt-BR");
                    appointmentList += `📌 ${dateFormatted} às ${apt.startTime} — ${apt.service.name}\n`;
                });
                return { reply: appointmentList };
            }
            // Cliente solicitou atendente humano
            if (/atendente/i.test(body) || /suporte/i.test(body) || body === "3") {
                console.log(`👥 Cliente solicitou atendente humano`);
                return { reply: "Ok, encaminhei sua conversa para um atendente humano 👩‍💼" };
            }
            // Exibe menu principal
            console.log(`📋 Exibindo menu principal para: ${client.fullName}`);
            return {
                reply: `Olá ${client.fullName}! 👋 Como posso te ajudar?\n\n1️⃣ Agendar horário\n2️⃣ Consultar agendamento\n3️⃣ Falar com atendente`,
            };
        case "awaiting_service":
            console.log(`🔍 Cliente escolhendo serviço: ${body}`);
            const services = await prisma.service.findMany({
                where: { companyId: client.companyId, active: true },
            });
            let selectedService = null;
            if (/^\d+$/.test(body)) {
                const index = parseInt(body) - 1;
                if (index >= 0 && index < services.length) {
                    selectedService = services[index];
                }
            }
            else {
                selectedService = services.find((s) => s.name.toLowerCase().includes(body.toLowerCase()));
            }
            if (!selectedService) {
                return { reply: "❌ Serviço não encontrado. Por favor, digite o número ou nome do serviço corretamente." };
            }
            await prisma.client.update({
                where: { id: client.id },
                data: {
                    flowStep: `awaiting_date:${selectedService.id}`,
                },
            });
            return {
                reply: `✅ Serviço selecionado: ${selectedService.name}\n\nAgora me envie a data desejada no formato DD/MM (exemplo: 20/10):`
            };
        case client.flowStep?.startsWith("awaiting_date:") ? client.flowStep : "":
            console.log(`📅 Cliente informando data: ${body}`);
            const serviceId = client.flowStep.split(":")[1];
            const dateMatch = body.match(/(\d{1,2})\/(\d{1,2})/);
            if (!dateMatch) {
                return { reply: "❌ Data inválida. Por favor, envie no formato DD/MM (exemplo: 20/10):" };
            }
            const day = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]);
            const year = new Date().getFullYear();
            const appointmentDate = new Date(year, month - 1, day);
            if (appointmentDate < new Date()) {
                return { reply: "❌ Esta data já passou. Por favor, escolha uma data futura:" };
            }
            await prisma.client.update({
                where: { id: client.id },
                data: {
                    flowStep: `awaiting_time:${serviceId}:${appointmentDate.toISOString()}`,
                },
            });
            return {
                reply: `✅ Data selecionada: ${appointmentDate.toLocaleDateString("pt-BR")}\n\nAgora me envie o horário desejado (exemplo: 14:00):`
            };
        case client.flowStep?.startsWith("awaiting_time:") ? client.flowStep : "":
            console.log(`⏰ Cliente informando horário: ${body}`);
            const [_, flowServiceId, flowDate] = client.flowStep.split(":");
            const timeMatch = body.match(/(\d{1,2}):(\d{2})/);
            if (!timeMatch) {
                return { reply: "❌ Horário inválido. Por favor, envie no formato HH:MM (exemplo: 14:00):" };
            }
            const appointmentDateTime = new Date(flowDate);
            const startTime = body.trim();
            const service = await prisma.service.findUnique({
                where: { id: flowServiceId },
            });
            if (!service) {
                await prisma.client.update({
                    where: { id: client.id },
                    data: { flowStep: "registered" },
                });
                return { reply: "❌ Erro ao processar o serviço. Por favor, tente novamente." };
            }
            const [hours, minutes] = startTime.split(":").map(Number);
            const endDate = new Date(appointmentDateTime);
            endDate.setHours(hours + Math.floor(service.duration / 60));
            endDate.setMinutes(minutes + (service.duration % 60));
            const endTime = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;
            try {
                const appointment = await prisma.appointment.create({
                    data: {
                        companyId: client.companyId,
                        clientId: client.id,
                        serviceId: flowServiceId,
                        date: appointmentDateTime,
                        startTime: startTime,
                        endTime: endTime,
                        status: "PENDING",
                        totalValue: service.price,
                    },
                });
                await prisma.client.update({
                    where: { id: client.id },
                    data: { flowStep: "registered" },
                });
                console.log(`✅ Agendamento criado: ${appointment.id}`);
                return {
                    reply: `✅ Agendamento criado com sucesso!\n\n📅 Data: ${appointmentDateTime.toLocaleDateString("pt-BR")}\n⏰ Horário: ${startTime}\n💼 Serviço: ${service.name}\n\nAguardamos você!`
                };
            }
            catch (error) {
                console.error(`❌ Erro ao criar agendamento:`, error);
                await prisma.client.update({
                    where: { id: client.id },
                    data: { flowStep: "registered" },
                });
                return { reply: "❌ Não consegui registrar seu agendamento. Por favor, tente novamente mais tarde." };
            }
        default:
            console.log(`⚠️ FlowStep inválido: ${client.flowStep}, resetando para awaiting_choice`);
            // Fallback: reseta o fluxo para o início
            await prisma.client.update({
                where: { id: client.id },
                data: { flowStep: "awaiting_choice" },
            });
            return {
                reply: "Olá 👋, não encontrei seu cadastro.\nSelecione uma opção abaixo:",
                buttons: [
                    { label: "Sou novo(a) cliente", value: "1" },
                    { label: "Mudei de número", value: "2" },
                ],
            };
    }
}
