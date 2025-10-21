import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Normaliza o número de telefone para o formato padrão +55XXXXXXXXXXX
 * Remove espaços, parênteses, traços, pontos e garante o prefixo +55
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const without55 = cleaned.replace(/^55/, '');
  return `+55${without55}`;
}

export async function handleIncomingMessage(
  phone: string,
  body: string,
  name: string
) {
  const normalizedPhone = normalizePhoneNumber(phone);
  console.log(`📩 Mensagem recebida de ${normalizedPhone}: "${body}"`);
  
  // Busca cliente existente pelo número de telefone normalizado
  let client = await prisma.client.findFirst({ where: { phone: normalizedPhone } });

  // 🔹 Novo cliente (não encontrado no banco)
  if (!client) {
    console.log(`🆕 Cliente novo detectado: ${normalizedPhone}`);
    
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
        phone: normalizedPhone,
        fullName: name || "Cliente Temporário",
        email: `temp_${normalizedPhone.replace(/\D/g, "")}@placeholder.local`,
        cpf: `temp_${normalizedPhone.replace(/\D/g, "")}`,
        flowStep: "awaiting_choice",
      },
    });
    
    console.log(`✅ Cliente temporário criado: ${client.id}`);
    
    return {
      reply: "Olá 👋! Não encontrei seu cadastro.\nVamos criar um novo para você?",
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
      console.log(`⏳ Cliente aguardando escolha: ${normalizedPhone}`);
      
      // Cliente escolheu "Sou novo(a)" - solicita nome completo
      if (body === "1" || /novo/i.test(body)) {
        console.log(`✅ Cliente escolheu: Novo cliente`);
        await prisma.client.update({
          where: { id: client.id },
          data: { flowStep: "awaiting_name" },
        });
        return { reply: "Perfeito! 😊\nPara começar, digite seu *nome completo*:" };
      }

      // Cliente escolheu "Mudei de número" - solicita CPF para localizar cadastro
      if (body === "2" || /mudei/i.test(body)) {
        console.log(`✅ Cliente escolheu: Mudei de número`);
        await prisma.client.update({
          where: { id: client.id },
          data: { flowStep: "awaiting_cpf" },
        });
        return { reply: "Entendi! 😊\nPor favor, me envie seu CPF para localizar seu cadastro:" };
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
      
      // Atualiza o cliente com nome completo e solicita e-mail
      await prisma.client.update({
        where: { id: client.id },
        data: { 
          fullName: body,
          flowStep: "awaiting_email"
        },
      });
      console.log(`✅ Nome recebido: ${body}`);
      return { reply: `Perfeito, ${body}! 😊\nAgora me envie seu *e-mail*:` };

    case "awaiting_email":
      console.log(`📧 Recebendo e-mail do cliente: ${body}`);
      
      // Valida formato básico de e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body)) {
        return { reply: "❌ E-mail inválido. Por favor, envie um e-mail válido (exemplo: seunome@email.com):" };
      }
      
      // Atualiza o cliente com e-mail e finaliza cadastro
      await prisma.client.update({
        where: { id: client.id },
        data: { 
          email: body.toLowerCase().trim(),
          cpf: `auto_${normalizedPhone.replace(/\D/g, "")}`,
          flowStep: "menu"
        },
      });
      
      const companyInfo = await prisma.company.findUnique({
        where: { id: client.companyId }
      });
      
      console.log(`✅ Cliente cadastrado com sucesso: ${client.fullName}`);
      return { 
        reply: `✅ Cadastro concluído com sucesso, ${client.fullName}! 💙\n\nAgora você pode agendar seus serviços. Como posso ajudar?\n\n1️⃣ Novo Agendamento\n2️⃣ Consultar Agendamento\n3️⃣ Falar com Atendente` 
      };

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
          data: { phone: normalizedPhone, flowStep: "menu" },
        });
        
        // Remove o cliente temporário usando deleteMany (phone não é único)
        await prisma.client.deleteMany({
          where: { 
            id: client.id,
            companyId: client.companyId
          }
        });
        
        return { 
          reply: `✅ Cadastro encontrado com sucesso, ${existingClient.fullName}! 😊\n\nAtualizei seu número de telefone. Como posso ajudar?\n\n1️⃣ Novo Agendamento\n2️⃣ Consultar Agendamento\n3️⃣ Falar com Atendente` 
        };
      } else {
        console.log(`⚠️ CPF não encontrado, finalizando cadastro com CPF fornecido`);
        
        // Atualiza o cliente temporário com o CPF fornecido
        await prisma.client.update({
          where: { id: client.id },
          data: { cpf: cpfClean, flowStep: "menu" },
        });
        return { reply: `✅ Cadastro atualizado com sucesso! 😊\n\nAgora você pode agendar seus serviços. Como posso ajudar?\n\n1️⃣ Novo Agendamento\n2️⃣ Consultar Agendamento\n3️⃣ Falar com Atendente` };
      }

    case "menu":
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

        let serviceList = `Excelente escolha, ${client.fullName}! 😊\n\nQual serviço deseja agendar?\n\n`;
        services.forEach((service: any, index: number) => {
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
          include: { service: true, company: true },
          orderBy: { date: "asc" },
          take: 5,
        });

        if (appointments.length === 0) {
          return { reply: "📅 Você não possui agendamentos futuros no momento.\n\nGostaria de agendar um novo serviço? Digite 1 para continuar." };
        }

        let appointmentList = "📅 Seus agendamentos:\n\n";
        appointments.forEach((apt: any) => {
          const dateFormatted = new Date(apt.date).toLocaleDateString("pt-BR");
          appointmentList += `• ${dateFormatted} às ${apt.startTime} — ${apt.service.name} ✂️\n`;
        });
        appointmentList += `\n📍 Local: ${appointments[0].company.name}\n`;
        appointmentList += `📞 Contato: ${appointments[0].company.phone}\n`;
        appointmentList += `\nO que deseja fazer?\n1️⃣ Novo Agendamento\n2️⃣ Voltar ao menu`;

        return { reply: appointmentList };
      }

      // Cliente solicitou atendente humano
      if (/atendente/i.test(body) || /suporte/i.test(body) || body === "3") {
        console.log(`👥 Cliente solicitou atendente humano`);
        return { reply: "Perfeito! 😊\n\nUm de nossos atendentes entrará em contato em breve. Aguarde alguns instantes." };
      }

      // Exibe menu principal
      console.log(`📋 Exibindo menu principal para: ${client.fullName}`);
      
      const menuCompany = await prisma.company.findUnique({
        where: { id: client.companyId }
      });
      
      return {
        reply: `👋 Olá, ${client.fullName}! Sou o assistente virtual da ${menuCompany?.name || 'nossa empresa'}.\n\nEstamos aqui para cuidar de você com excelência. 💙\n\nComo posso ajudar hoje?\n\n1️⃣ Novo Agendamento\n2️⃣ Consultar Agendamento\n3️⃣ Falar com Atendente`,
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
      } else {
        selectedService = services.find((s: any) => 
          s.name.toLowerCase().includes(body.toLowerCase())
        );
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
        reply: `✅ Serviço selecionado: *${selectedService.name}*\n\nPerfeito! Agora me informe a data desejada no formato DD/MM (exemplo: 25/10):` 
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
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        return { reply: "❌ Esta data já passou. Por favor, escolha uma data futura:" };
      }

      await prisma.client.update({
        where: { id: client.id },
        data: { 
          flowStep: `awaiting_time:${serviceId}:${appointmentDate.toISOString()}`,
        },
      });

      return { 
        reply: `✅ Data selecionada: *${appointmentDate.toLocaleDateString("pt-BR")}*\n\nÓtimo! Agora me informe o horário desejado (exemplo: 14:30):` 
      };

    case client.flowStep?.startsWith("awaiting_time:") ? client.flowStep : "":
      console.log(`⏰ Cliente informando horário: ${body}`);
      
      const flowParts = client.flowStep.split(":");
      const flowServiceId = flowParts[1];
      const flowDate = flowParts.slice(2).join(":");
      const timeMatch = body.match(/(\d{1,2}):(\d{2})/);
      
      if (!timeMatch) {
        return { reply: "❌ Horário inválido. Por favor, envie no formato HH:MM (exemplo: 14:00):" };
      }

      const startTime = body.trim();
      const [hours, minutes] = startTime.split(":").map(Number);
      
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return { reply: "❌ Horário inválido. Por favor, use um horário válido entre 00:00 e 23:59:" };
      }
      
      const appointmentDateTime = new Date(flowDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);
      
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

      let endHour = hours + Math.floor(service.duration / 60);
      let endMinute = minutes + (service.duration % 60);
      
      if (endMinute >= 60) {
        endHour += Math.floor(endMinute / 60);
        endMinute = endMinute % 60;
      }
      
      if (endHour >= 24) {
        endHour = 23;
        endMinute = 59;
      }
      
      const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

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
          data: { flowStep: "menu" },
        });

        const confirmCompany = await prisma.company.findUnique({
          where: { id: client.companyId }
        });

        console.log(`✅ Agendamento criado: ${appointment.id}`);

        return { 
          reply: `Excelente escolha, ${client.fullName}! Seu agendamento está confirmado. 😊\n\n💼 Serviço: ${service.name}\n📅 Data: ${appointmentDateTime.toLocaleDateString("pt-BR")}\n⏰ Horário: ${startTime}\n📍 Local: ${confirmCompany?.name || 'Nossa empresa'}\n📱 Contato: ${confirmCompany?.phone || ''}\n\nEstamos ansiosos para recebê-lo(a)! 💙` 
        };
      } catch (error) {
        console.error(`❌ Erro ao criar agendamento:`, error);
        
        await prisma.client.update({
          where: { id: client.id },
          data: { flowStep: "menu" },
        });

        return { reply: "❌ Não consegui registrar seu agendamento. Por favor, tente novamente mais tarde ou fale com um atendente." };
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
