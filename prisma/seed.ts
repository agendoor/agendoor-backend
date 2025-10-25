import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  console.log('💳 Criando planos...');
  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      priceCents: 9900,
      currency: 'BRL',
      description: 'Plano básico para pequenos profissionais',
      features: JSON.stringify([
        'Até 100 agendamentos/mês',
        'Gestão de clientes',
        'Calendário básico',
        'Suporte por email'
      ]),
      active: true,
      sortOrder: 1
    },
    {
      id: 'pro',
      name: 'Pro',
      priceCents: 19900,
      currency: 'BRL',
      description: 'Plano profissional para clínicas em crescimento',
      features: JSON.stringify([
        'Agendamentos ilimitados',
        'Gestão de clientes avançada',
        'Calendário completo',
        'Relatórios financeiros',
        'Múltiplos profissionais',
        'Suporte prioritário'
      ]),
      active: true,
      sortOrder: 2
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      priceCents: 39900,
      currency: 'BRL',
      description: 'Plano empresarial para grandes clínicas',
      features: JSON.stringify([
        'Tudo do plano Pro',
        'API personalizada',
        'Integração com sistemas',
        'Múltiplas unidades',
        'Suporte dedicado 24/7',
        'Customizações avançadas'
      ]),
      active: true,
      sortOrder: 3
    }
  ];

  for (const planData of plans) {
    await prisma.plan.upsert({
      where: { id: planData.id },
      update: planData,
      create: planData
    });
    console.log(`  ✅ Plano "${planData.name}" criado/atualizado`);
  }

  // Criar tipos de negócio e abas
  const businessTypesData = [
    {
      name: 'Barbearia',
      description: 'Serviços de corte de cabelo e barba para homens.',
      icon: 'barber',
      color: '#dc2626',
      sortOrder: 1,
      tabs: [
        {
          name: 'Dados Básicos',
          slug: 'dados-basicos',
          description: 'Informações básicas do cliente',
          icon: '👤',
          color: '#6366f1',
          isRequired: true,
          sortOrder: 0,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'aniversario', label: 'Data de Aniversário', type: 'date', required: false },
              { name: 'profissao', label: 'Profissão', type: 'text', required: false }
            ]
          })
        },
        {
          name: 'Histórico de Serviços',
          slug: 'historico-servicos',
          description: 'Últimos cortes e serviços realizados',
          icon: '📊',
          color: '#10b981',
          isRequired: false,
          sortOrder: 1,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'services', label: 'Serviços Realizados', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Preferências',
          slug: 'preferencias',
          description: 'Preferências de corte e estilo',
          icon: '⭐',
          color: '#f59e0b',
          isRequired: false,
          sortOrder: 2,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'cortePreferido', label: 'Corte Preferido', type: 'text', required: false },
              { name: 'estiloBarba', label: 'Estilo de Barba', type: 'text', required: false },
              { name: 'observacoes', label: 'Observações Especiais', type: 'textarea', required: false }
            ]
          })
        },
        {
          name: 'Recorrência',
          slug: 'recorrência',
          description: 'Agendamentos automáticos e frequência',
          icon: '🔄',
          color: '#8b5cf6',
          isRequired: false,
          sortOrder: 3,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'frequencia', label: 'Frequência (dias)', type: 'number', required: false },
              { name: 'autoAgendamento', label: 'Agendamento Automático', type: 'boolean', required: false },
              { name: 'diasPreferidos', label: 'Dias Preferidos', type: 'multiselect', options: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'], required: false },
              { name: 'horarioPreferido', label: 'Horário Preferido', type: 'time', required: false }
            ]
          })
        }
      ]
    },
    {
      name: 'Salão de Beleza',
      description: 'Salões de beleza e estética',
      icon: 'beauty',
      color: '#ec4899',
      sortOrder: 2,
      tabs: [
        {
          name: 'Dados Básicos',
          slug: 'dados-basicos',
          description: 'Informações básicas da cliente',
          icon: '👤',
          color: '#6366f1',
          isRequired: true,
          sortOrder: 0,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'aniversario', label: 'Data de Aniversário', type: 'date', required: false },
              { name: 'profissao', label: 'Profissão', type: 'text', required: false },
              { name: 'tipoCapelo', label: 'Tipo de Cabelo', type: 'select', options: ['Liso', 'Ondulado', 'Cacheado', 'Crespo'], required: false }
            ]
          })
        },
        {
          name: 'Histórico de Serviços',
          slug: 'historico-servicos',
          description: 'Cabelo, unhas, depilação e estética',
          icon: '📊',
          color: '#10b981',
          isRequired: false,
          sortOrder: 1,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'services', label: 'Serviços Realizados', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Preferências',
          slug: 'preferencias',
          description: 'Cores, produtos e técnicas preferidas',
          icon: '🎨',
          color: '#f59e0b',
          isRequired: false,
          sortOrder: 2,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'corEsmalte', label: 'Cor de Esmalte Preferida', type: 'color', required: false },
              { name: 'coloracao', label: 'Coloração Preferida', type: 'text', required: false },
              { name: 'quimicos', label: 'Químicos Utilizados', type: 'textarea', required: false },
              { name: 'alergias', label: 'Alergias a Produtos', type: 'textarea', required: false }
            ]
          })
        },
        {
          name: 'Pacotes e Planos',
          slug: 'pacotes-planos',
          description: 'Controle de sessões pré-pagas',
          icon: '💎',
          color: '#8b5cf6',
          isRequired: false,
          sortOrder: 3,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'packages', label: 'Pacotes Adquiridos', type: 'array', required: false }
            ]
          })
        }
      ]
    },
    {
      name: 'Clínica de Saúde',
      description: 'Consultas médicas, fisioterapia, psicologia, etc.',
      icon: 'health',
      color: '#0891b2',
      sortOrder: 3,
      tabs: [
        {
          name: 'Dados do Paciente',
          slug: 'dados-paciente',
          description: 'Informações completas do paciente',
          icon: '👤',
          color: '#6366f1',
          isRequired: true,
          sortOrder: 0,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'convenio', label: 'Convênio', type: 'text', required: false },
              { name: 'tipoSanguineo', label: 'Tipo Sanguíneo', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: false },
              { name: 'profissao', label: 'Profissão', type: 'text', required: false },
              { name: 'estadoCivil', label: 'Estado Civil', type: 'select', options: ['Solteiro', 'Casado', 'Divorciado', 'Viúvo'], required: false }
            ]
          })
        },
        {
          name: 'Anamnese',
          slug: 'anamnese',
          description: 'História clínica e questões médicas',
          icon: '📋',
          color: '#ef4444',
          isRequired: true,
          sortOrder: 1,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'medicamentos', label: 'Medicamentos em uso', type: 'textarea', required: false },
              { name: 'alergias', label: 'Alergias conhecidas', type: 'textarea', required: false },
              { name: 'doencas', label: 'Doenças pré-existentes', type: 'textarea', required: false },
              { name: 'cirurgias', label: 'Cirurgias anteriores', type: 'textarea', required: false },
              { name: 'gestante', label: 'Gestante', type: 'boolean', required: false },
              { name: 'fumante', label: 'Fumante', type: 'boolean', required: false },
              { name: 'diabetes', label: 'Diabetes', type: 'boolean', required: false },
              { name: 'hipertensao', label: 'Hipertensão', type: 'boolean', required: false }
            ]
          })
        },
        {
          name: 'Prontuário',
          slug: 'prontuario',
          description: 'Registro detalhado de consultas e procedimentos',
          icon: '🔬',
          color: '#10b981',
          isRequired: true,
          sortOrder: 2,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'entries', label: 'Entradas do Prontuário', type: 'array', required: false }
            ]
          })
        }
      ]
    },
    {
      name: 'Odontologia',
      description: 'Serviços odontológicos e tratamentos dentários.',
      icon: 'dental',
      color: '#0ea5e9',
      sortOrder: 4,
      tabs: [
        {
          name: 'Dados Básicos',
          slug: 'dados-basicos',
          description: 'Informações básicas do paciente',
          icon: '👤',
          color: '#6366f1',
          isRequired: true,
          sortOrder: 0,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'convenio', label: 'Convênio', type: 'text', required: false },
              { name: 'numeroCartao', label: 'Número do Cartão', type: 'text', required: false },
              { name: 'profissao', label: 'Profissão', type: 'text', required: false },
              { name: 'estadoCivil', label: 'Estado Civil', type: 'select', options: ['Solteiro', 'Casado', 'Divorciado', 'Viúvo'], required: false }
            ]
          })
        },
        {
          name: 'Anamnese',
          slug: 'anamnese',
          description: 'História clínica e questões médicas',
          icon: '📋',
          color: '#ef4444',
          isRequired: true,
          sortOrder: 1,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'medicamentos', label: 'Medicamentos em uso', type: 'textarea', required: false },
              { name: 'alergias', label: 'Alergias conhecidas', type: 'textarea', required: false },
              { name: 'doencas', label: 'Doenças pré-existentes', type: 'textarea', required: false },
              { name: 'cirurgias', label: 'Cirurgias anteriores', type: 'textarea', required: false },
              { name: 'gestante', label: 'Gestante', type: 'boolean', required: false },
              { name: 'fumante', label: 'Fumante', type: 'boolean', required: false },
              { name: 'diabetes', label: 'Diabetes', type: 'boolean', required: false },
              { name: 'hipertensao', label: 'Hipertensão', type: 'boolean', required: false }
            ]
          })
        },
        {
          name: 'Prontuário',
          slug: 'prontuario',
          description: 'Registro detalhado de consultas e procedimentos',
          icon: '🔬',
          color: '#10b981',
          isRequired: true,
          sortOrder: 2,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'entries', label: 'Entradas do Prontuário', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Odontograma',
          slug: 'odontograma',
          description: 'Mapa interativo dos dentes',
          icon: '🗂️',
          color: '#f59e0b',
          isRequired: true,
          sortOrder: 3,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'teeth', label: 'Estado dos Dentes', type: 'odontogram', required: false }
            ]
          })
        },
        {
          name: 'Plano de Tratamento',
          slug: 'plano-tratamento',
          description: 'Procedimentos futuros e planejamento',
          icon: '📅',
          color: '#8b5cf6',
          isRequired: false,
          sortOrder: 4,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'procedures', label: 'Procedimentos Planejados', type: 'array', required: false },
              { name: 'priority', label: 'Prioridade', type: 'select', options: ['Baixa', 'Média', 'Alta', 'Urgente'], required: false },
              { name: 'estimatedCost', label: 'Custo Estimado', type: 'currency', required: false },
              { name: 'estimatedSessions', label: 'Sessões Estimadas', type: 'number', required: false }
            ]
          })
        },
        {
          name: 'Documentos',
          slug: 'documentos',
          description: 'Radiografias, fotos e exames',
          icon: '📁',
          color: '#06b6d4',
          isRequired: false,
          sortOrder: 5,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'documents', label: 'Documentos', type: 'files', required: false }
            ]
          })
        },
        {
          name: 'Financeiro',
          slug: 'financeiro',
          description: 'Histórico de pagamentos e procedimentos',
          icon: '💰',
          color: '#84cc16',
          isRequired: false,
          sortOrder: 6,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'payments', label: 'Pagamentos', type: 'array', required: false },
              { name: 'installments', label: 'Parcelamentos', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Módulo Clínico',
          slug: 'modulo-clinico',
          description: 'Sistema clínico completo: Anamnese, Prontuário, Odontograma e Histórico',
          icon: '🏥',
          color: '#10b981',
          isRequired: false,
          sortOrder: 7,
          fieldConfig: JSON.stringify({
            type: 'clinical_module'
          })
        }
      ]
    },
    {
      name: 'Banho e Tosa',
      description: 'Serviços de higiene e estética para animais de estimação.',
      icon: 'pet',
      color: '#059669',
      sortOrder: 5,
      tabs: [
        {
          name: 'Dados do Tutor',
          slug: 'dados-tutor',
          description: 'Informações do proprietário',
          icon: '👤',
          color: '#6366f1',
          isRequired: true,
          sortOrder: 0,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'endereco', label: 'Endereço Completo', type: 'textarea', required: false },
              { name: 'profissao', label: 'Profissão', type: 'text', required: false }
            ]
          })
        },
        {
          name: 'Dados do Pet',
          slug: 'dados-pet',
          description: 'Informações do animal',
          icon: '🐕',
          color: '#f59e0b',
          isRequired: true,
          sortOrder: 1,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'pets', label: 'Pets', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Histórico de Serviços',
          slug: 'historico-servicos',
          description: 'Banho, tosa e cuidados realizados',
          icon: '🛁',
          color: '#10b981',
          isRequired: false,
          sortOrder: 2,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'services', label: 'Serviços por Pet', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Observações do Pet',
          slug: 'observacoes-pet',
          description: 'Comportamento e cuidados especiais',
          icon: '📝',
          color: '#ef4444',
          isRequired: false,
          sortOrder: 3,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'behavior', label: 'Comportamento', type: 'select', options: ['Dócil', 'Agitado', 'Agressivo', 'Medroso'], required: false },
              { name: 'alergias', label: 'Alergias Conhecidas', type: 'textarea', required: false },
              { name: 'produtos', label: 'Produtos Permitidos', type: 'textarea', required: false },
              { name: 'observacoes', label: 'Observações Gerais', type: 'textarea', required: false }
            ]
          })
        }
      ]
    },
    {
      name: 'Outros',
      description: 'Outros tipos de negócio que se encaixam no agendamento.',
      icon: 'other',
      color: '#6b7280',
      sortOrder: 99,
      tabs: []
    }
  ];

  for (const businessTypeData of businessTypesData) {
    const { tabs, ...typeData } = businessTypeData;

    const businessType = await prisma.businessType.upsert({
      where: { name: typeData.name },
      update: typeData,
      create: typeData,
    });
    console.log(`  ✅ Tipo de Negócio "${businessType.name}" criado/atualizado`);

    for (const tabData of tabs) {
      await prisma.businessTypeTab.upsert({
        where: { slug_businessTypeId: { slug: tabData.slug, businessTypeId: businessType.id } },
        update: { ...tabData, businessTypeId: businessType.id },
        create: { ...tabData, businessTypeId: businessType.id },
      });
      console.log(`    ✅ Aba "${tabData.name}" criada/atualizada`);
    }
  }

  console.log('Seeding de Tipos de Negócio concluído.');

  // Remover a declaração original de businessTypes para evitar duplicação
  /  // const businessTypes = [ // Removido para evitar duplicação
  // ... (código removido)
  // ];

  // Remover o loop de criação de businessTypes original
  //  // for (const businessTypeData of businessTypes) { // Removido para evitar duplicação  // ... (código removido)
  // }
    {
      name: 'Odontologia',
      description: 'Clínicas odontológicas, dentistas e consultorias dentárias',
      icon: '🦷',
      color: '#0ea5e9',
      tabs: [
        {
          name: 'Dados Básicos',
          slug: 'dados-basicos',
          description: 'Informações básicas do paciente',
          icon: '👤',
          color: '#6366f1',
          isRequired: true,
          sortOrder: 0,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'convenio', label: 'Convênio', type: 'text', required: false },
              { name: 'numeroCartao', label: 'Número do Cartão', type: 'text', required: false },
              { name: 'profissao', label: 'Profissão', type: 'text', required: false },
              { name: 'estadoCivil', label: 'Estado Civil', type: 'select', options: ['Solteiro', 'Casado', 'Divorciado', 'Viúvo'], required: false }
            ]
          })
        },
        {
          name: 'Anamnese',
          slug: 'anamnese',
          description: 'História clínica e questões médicas',
          icon: '📋',
          color: '#ef4444',
          isRequired: true,
          sortOrder: 1,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'medicamentos', label: 'Medicamentos em uso', type: 'textarea', required: false },
              { name: 'alergias', label: 'Alergias conhecidas', type: 'textarea', required: false },
              { name: 'doencas', label: 'Doenças pré-existentes', type: 'textarea', required: false },
              { name: 'cirurgias', label: 'Cirurgias anteriores', type: 'textarea', required: false },
              { name: 'gestante', label: 'Gestante', type: 'boolean', required: false },
              { name: 'fumante', label: 'Fumante', type: 'boolean', required: false },
              { name: 'diabetes', label: 'Diabetes', type: 'boolean', required: false },
              { name: 'hipertensao', label: 'Hipertensão', type: 'boolean', required: false }
            ]
          })
        },
        {
          name: 'Prontuário',
          slug: 'prontuario',
          description: 'Registro detalhado de consultas e procedimentos',
          icon: '🔬',
          color: '#10b981',
          isRequired: true,
          sortOrder: 2,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'entries', label: 'Entradas do Prontuário', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Odontograma',
          slug: 'odontograma',
          description: 'Mapa interativo dos dentes',
          icon: '🗂️',
          color: '#f59e0b',
          isRequired: true,
          sortOrder: 3,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'teeth', label: 'Estado dos Dentes', type: 'odontogram', required: false }
            ]
          })
        },
        {
          name: 'Plano de Tratamento',
          slug: 'plano-tratamento',
          description: 'Procedimentos futuros e planejamento',
          icon: '📅',
          color: '#8b5cf6',
          isRequired: false,
          sortOrder: 4,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'procedures', label: 'Procedimentos Planejados', type: 'array', required: false },
              { name: 'priority', label: 'Prioridade', type: 'select', options: ['Baixa', 'Média', 'Alta', 'Urgente'], required: false },
              { name: 'estimatedCost', label: 'Custo Estimado', type: 'currency', required: false },
              { name: 'estimatedSessions', label: 'Sessões Estimadas', type: 'number', required: false }
            ]
          })
        },
        {
          name: 'Documentos',
          slug: 'documentos',
          description: 'Radiografias, fotos e exames',
          icon: '📁',
          color: '#06b6d4',
          isRequired: false,
          sortOrder: 5,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'documents', label: 'Documentos', type: 'files', required: false }
            ]
          })
        },
        {
          name: 'Financeiro',
          slug: 'financeiro',
          description: 'Histórico de pagamentos e procedimentos',
          icon: '💰',
          color: '#84cc16',
          isRequired: false,
          sortOrder: 6,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'payments', label: 'Pagamentos', type: 'array', required: false },
              { name: 'installments', label: 'Parcelamentos', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Módulo Clínico',
          slug: 'modulo-clinico',
          description: 'Sistema clínico completo: Anamnese, Prontuário, Odontograma e Histórico',
          icon: '🏥',
          color: '#10b981',
          isRequired: false,
          sortOrder: 7,
          fieldConfig: JSON.stringify({
            type: 'clinical_module'
          })
        }
      ]
    },
    {
      name: 'Barbearia',
      description: 'Barbearias e salões masculinos',
      icon: '✂️',
      color: '#dc2626',
      tabs: [
        {
          name: 'Dados Básicos',
          slug: 'dados-basicos',
          description: 'Informações básicas do cliente',
          icon: '👤',
          color: '#6366f1',
          isRequired: true,
          sortOrder: 0,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'aniversario', label: 'Data de Aniversário', type: 'date', required: false },
              { name: 'profissao', label: 'Profissão', type: 'text', required: false }
            ]
          })
        },
        {
          name: 'Histórico de Serviços',
          slug: 'historico-servicos',
          description: 'Últimos cortes e serviços realizados',
          icon: '📊',
          color: '#10b981',
          isRequired: false,
          sortOrder: 1,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'services', label: 'Serviços Realizados', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Preferências',
          slug: 'preferencias',
          description: 'Preferências de corte e estilo',
          icon: '⭐',
          color: '#f59e0b',
          isRequired: false,
          sortOrder: 2,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'cortePreferido', label: 'Corte Preferido', type: 'text', required: false },
              { name: 'estiloBarba', label: 'Estilo de Barba', type: 'text', required: false },
              { name: 'observacoes', label: 'Observações Especiais', type: 'textarea', required: false }
            ]
          })
        },
        {
          name: 'Recorrência',
          slug: 'recorrencia',
          description: 'Agendamentos automáticos e frequência',
          icon: '🔄',
          color: '#8b5cf6',
          isRequired: false,
          sortOrder: 3,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'frequencia', label: 'Frequência (dias)', type: 'number', required: false },
              { name: 'autoAgendamento', label: 'Agendamento Automático', type: 'boolean', required: false },
              { name: 'diasPreferidos', label: 'Dias Preferidos', type: 'multiselect', options: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'], required: false },
              { name: 'horarioPreferido', label: 'Horário Preferido', type: 'time', required: false }
            ]
          })
        }
      ]
    },
    {
      name: 'Salão de Beleza',
      description: 'Salões de beleza e estética',
      icon: '💅',
      color: '#ec4899',
      tabs: [
        {
          name: 'Dados Básicos',
          slug: 'dados-basicos',
          description: 'Informações básicas da cliente',
          icon: '👤',
          color: '#6366f1',
          isRequired: true,
          sortOrder: 0,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'aniversario', label: 'Data de Aniversário', type: 'date', required: false },
              { name: 'profissao', label: 'Profissão', type: 'text', required: false },
              { name: 'tipoCapelo', label: 'Tipo de Cabelo', type: 'select', options: ['Liso', 'Ondulado', 'Cacheado', 'Crespo'], required: false }
            ]
          })
        },
        {
          name: 'Histórico de Serviços',
          slug: 'historico-servicos',
          description: 'Cabelo, unhas, depilação e estética',
          icon: '📊',
          color: '#10b981',
          isRequired: false,
          sortOrder: 1,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'services', label: 'Serviços Realizados', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Preferências',
          slug: 'preferencias',
          description: 'Cores, produtos e técnicas preferidas',
          icon: '🎨',
          color: '#f59e0b',
          isRequired: false,
          sortOrder: 2,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'corEsmalte', label: 'Cor de Esmalte Preferida', type: 'color', required: false },
              { name: 'coloracao', label: 'Coloração Preferida', type: 'text', required: false },
              { name: 'quimicos', label: 'Químicos Utilizados', type: 'textarea', required: false },
              { name: 'alergias', label: 'Alergias a Produtos', type: 'textarea', required: false }
            ]
          })
        },
        {
          name: 'Pacotes e Planos',
          slug: 'pacotes-planos',
          description: 'Controle de sessões pré-pagas',
          icon: '💎',
          color: '#8b5cf6',
          isRequired: false,
          sortOrder: 3,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'packages', label: 'Pacotes Adquiridos', type: 'array', required: false }
            ]
          })
        }
      ]
    },
    {
      name: 'Pet Shop',
      description: 'Pet shops e clínicas veterinárias',
      icon: '🐾',
      color: '#059669',
      tabs: [
        {
          name: 'Dados do Tutor',
          slug: 'dados-tutor',
          description: 'Informações do proprietário',
          icon: '👤',
          color: '#6366f1',
          isRequired: true,
          sortOrder: 0,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'endereco', label: 'Endereço Completo', type: 'textarea', required: false },
              { name: 'profissao', label: 'Profissão', type: 'text', required: false }
            ]
          })
        },
        {
          name: 'Dados do Pet',
          slug: 'dados-pet',
          description: 'Informações do animal',
          icon: '🐕',
          color: '#f59e0b',
          isRequired: true,
          sortOrder: 1,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'pets', label: 'Pets', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Histórico de Serviços',
          slug: 'historico-servicos',
          description: 'Banho, tosa e cuidados realizados',
          icon: '🛁',
          color: '#10b981',
          isRequired: false,
          sortOrder: 2,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'services', label: 'Serviços por Pet', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Observações do Pet',
          slug: 'observacoes-pet',
          description: 'Comportamento e cuidados especiais',
          icon: '📝',
          color: '#ef4444',
          isRequired: false,
          sortOrder: 3,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'behavior', label: 'Comportamento', type: 'select', options: ['Dócil', 'Agitado', 'Agressivo', 'Medroso'], required: false },
              { name: 'alergias', label: 'Alergias Conhecidas', type: 'textarea', required: false },
              { name: 'produtos', label: 'Produtos Permitidos', type: 'textarea', required: false },
              { name: 'observacoes', label: 'Observações Gerais', type: 'textarea', required: false }
            ]
          })
        }
      ]
    },
    {
      name: 'Professor Particular',
      description: 'Aulas de música, idiomas e reforço escolar',
      icon: '🎓',
      color: '#7c3aed',
      tabs: [
        {
          name: 'Dados do Aluno',
          slug: 'dados-aluno',
          description: 'Informações básicas do estudante',
          icon: '👤',
          color: '#6366f1',
          isRequired: true,
          sortOrder: 0,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'idade', label: 'Idade', type: 'number', required: false },
              { name: 'nivelConhecimento', label: 'Nível de Conhecimento', type: 'select', options: ['Iniciante', 'Básico', 'Intermediário', 'Avançado'], required: false },
              { name: 'objetivos', label: 'Objetivos', type: 'textarea', required: false }
            ]
          })
        },
        {
          name: 'Histórico de Aulas',
          slug: 'historico-aulas',
          description: 'Registro de aulas e progresso',
          icon: '📚',
          color: '#10b981',
          isRequired: false,
          sortOrder: 1,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'lessons', label: 'Aulas Realizadas', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Plano de Estudos',
          slug: 'plano-estudos',
          description: 'Conteúdo programático e cronograma',
          icon: '📋',
          color: '#f59e0b',
          isRequired: false,
          sortOrder: 2,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'curriculum', label: 'Currículo Planejado', type: 'array', required: false },
              { name: 'materials', label: 'Materiais Utilizados', type: 'textarea', required: false },
              { name: 'homework', label: 'Tarefas Pendentes', type: 'array', required: false }
            ]
          })
        }
      ]
    },
    {
      name: 'Clínica de Saúde',
      description: 'Ginecologia, dermatologia, psicologia e outras especialidades',
      icon: '🏥',
      color: '#0891b2',
      tabs: [
        {
          name: 'Dados do Paciente',
          slug: 'dados-paciente',
          description: 'Informações completas do paciente',
          icon: '👤',
          color: '#6366f1',
          isRequired: true,
          sortOrder: 0,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'convenio', label: 'Convênio Médico', type: 'text', required: false },
              { name: 'numeroCartao', label: 'Número do Cartão', type: 'text', required: false },
              { name: 'contatoEmergencia', label: 'Contato de Emergência', type: 'text', required: false }
            ]
          })
        },
        {
          name: 'Prontuário Clínico',
          slug: 'prontuario-clinico',
          description: 'Histórico médico e diagnósticos',
          icon: '📋',
          color: '#ef4444',
          isRequired: true,
          sortOrder: 1,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'entries', label: 'Entradas do Prontuário', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Exames e Documentos',
          slug: 'exames-documentos',
          description: 'Resultados laboratoriais e imagens',
          icon: '🔬',
          color: '#10b981',
          isRequired: false,
          sortOrder: 2,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'exams', label: 'Exames', type: 'array', required: false },
              { name: 'documents', label: 'Documentos', type: 'files', required: false }
            ]
          })
        },
        {
          name: 'Prescrições',
          slug: 'prescricoes',
          description: 'Receitas médicas e atestados',
          icon: '💊',
          color: '#f59e0b',
          isRequired: false,
          sortOrder: 3,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'prescriptions', label: 'Prescrições', type: 'array', required: false },
              { name: 'certificates', label: 'Atestados', type: 'array', required: false }
            ]
          })
        },
        {
          name: 'Plano de Tratamento',
          slug: 'plano-tratamento',
          description: 'Planejamento terapêutico',
          icon: '🎯',
          color: '#8b5cf6',
          isRequired: false,
          sortOrder: 4,
          fieldConfig: JSON.stringify({
            fields: [
              { name: 'treatments', label: 'Tratamentos Planejados', type: 'array', required: false },
              { name: 'followUps', label: 'Retornos Programados', type: 'array', required: false }
            ]
          })
        }
      ]
    }
  ];

  // Inserir tipos de negócio e suas abas
  for (const businessType of businessTypes) {
    const { tabs, ...businessTypeData } = businessType;
    
    const createdBusinessType = await prisma.businessType.upsert({
      where: { name: businessTypeData.name },
      update: businessTypeData,
      create: businessTypeData,
    });

    console.log(`✅ Tipo de negócio "${createdBusinessType.name}" criado/atualizado`);

    // Inserir abas para este tipo de negócio
    for (const tab of tabs) {
      const createdTab = await prisma.businessTypeTab.upsert({
        where: {
          businessTypeId_slug: {
            businessTypeId: createdBusinessType.id,
            slug: tab.slug
          }
        },
        update: {
          name: tab.name,
          description: tab.description,
          icon: tab.icon,
          color: tab.color,
          isRequired: tab.isRequired,
          sortOrder: tab.sortOrder,
          fieldConfig: tab.fieldConfig
        },
        create: {
          businessTypeId: createdBusinessType.id,
          name: tab.name,
          slug: tab.slug,
          description: tab.description,
          icon: tab.icon,
          color: tab.color,
          isRequired: tab.isRequired,
          sortOrder: tab.sortOrder,
          fieldConfig: tab.fieldConfig
        },
      });

      console.log(`  📋 Aba "${createdTab.name}" criada/atualizada`);
    }
  }

  // Criar tratamentos odontológicos padrão
  const dentalTreatments = [
    {
      name: 'Restauração com Resina',
      category: 'restaurador',
      description: 'Restauração estética com resina composta',
      estimatedDuration: 60,
      averagePrice: 150.0,
      color: '#3b82f6'
    },
    {
      name: 'Limpeza Profissional',
      category: 'preventivo', 
      description: 'Profilaxia e remoção de tártaro',
      estimatedDuration: 45,
      averagePrice: 80.0,
      color: '#10b981'
    },
    {
      name: 'Extração Dentária',
      category: 'cirurgico',
      description: 'Remoção de dente',
      estimatedDuration: 30,
      averagePrice: 120.0,
      color: '#ef4444'
    },
    {
      name: 'Tratamento de Canal',
      category: 'endodontico',
      description: 'Endodontia - tratamento do canal radicular',
      estimatedDuration: 90,
      averagePrice: 400.0,
      color: '#ec4899'
    },
    {
      name: 'Coroa Protética',
      category: 'protético',
      description: 'Prótese fixa unitária',
      estimatedDuration: 120,
      averagePrice: 800.0,
      color: '#f59e0b'
    },
    {
      name: 'Implante Dentário',
      category: 'cirurgico',
      description: 'Colocação de implante osseointegrado',
      estimatedDuration: 60,
      averagePrice: 1500.0,
      color: '#8b5cf6'
    },
    {
      name: 'Clareamento Dental',
      category: 'estético',
      description: 'Clareamento dos dentes',
      estimatedDuration: 60,
      averagePrice: 300.0,
      color: '#06b6d4'
    },
    {
      name: 'Aplicação de Flúor',
      category: 'preventivo',
      description: 'Aplicação tópica de flúor',
      estimatedDuration: 15,
      averagePrice: 40.0,
      color: '#84cc16'
    },
    {
      name: 'Faceta de Porcelana',
      category: 'estético',
      description: 'Laminado cerâmico estético',
      estimatedDuration: 120,
      averagePrice: 1200.0,
      color: '#f97316'
    },
    {
      name: 'Aparelho Ortodôntico',
      category: 'ortodontico',
      description: 'Instalação de aparelho ortodôntico',
      estimatedDuration: 90,
      averagePrice: 2500.0,
      color: '#a855f7'
    }
  ];

  console.log('🦷 Criando tratamentos odontológicos...');

  for (const treatment of dentalTreatments) {
    await prisma.dentalTreatment.upsert({
      where: { name: treatment.name },
      update: treatment,
      create: treatment
    });
    console.log(`  ✅ Tratamento "${treatment.name}" criado/atualizado`);
  }

  console.log('Seeding concluído com sucesso!');}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });