const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTabsConfiguration() {
  console.log('=== ATUALIZANDO CONFIGURAÇÕES DAS ABAS ===');
  
  const newTabsConfig = [
    {
      slug: 'dados-basicos',
      name: 'Dados Básicos',
      description: 'Informações pessoais completas do paciente',
      icon: '👤',
      color: '#6366f1',
      isRequired: true,
      sortOrder: 0,
      fieldConfig: JSON.stringify({
        sections: [
          {
            title: 'Informações Pessoais',
            fields: [
              { name: 'rg', label: 'RG', type: 'text', required: true, placeholder: 'Ex: 12.345.678-9' },
              { name: 'orgaoExpedidor', label: 'Órgão Expedidor', type: 'text', required: false, placeholder: 'Ex: SSP/SP' },
              { name: 'profissao', label: 'Profissão', type: 'text', required: true, placeholder: 'Ex: Engenheiro' },
              { name: 'estadoCivil', label: 'Estado Civil', type: 'select', options: ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'], required: true },
              { name: 'naturalidade', label: 'Naturalidade', type: 'text', required: false, placeholder: 'Ex: São Paulo/SP' },
              { name: 'nacionalidade', label: 'Nacionalidade', type: 'text', required: false, default: 'Brasileira' }
            ]
          },
          {
            title: 'Contatos de Emergência',
            fields: [
              { name: 'contatoEmergenciaNome', label: 'Nome do Contato', type: 'text', required: true, placeholder: 'Nome completo' },
              { name: 'contatoEmergenciaParentesco', label: 'Parentesco', type: 'select', options: ['Pai', 'Mãe', 'Filho(a)', 'Cônjuge', 'Irmão(ã)', 'Avô/Avó', 'Tio(a)', 'Primo(a)', 'Amigo(a)', 'Outro'], required: true },
              { name: 'contatoEmergenciaTelefone', label: 'Telefone', type: 'tel', required: true, placeholder: '(11) 99999-9999' },
              { name: 'contatoEmergenciaEmail', label: 'E-mail', type: 'email', required: false }
            ]
          },
          {
            title: 'Informações do Convênio',
            fields: [
              { name: 'possuiConvenio', label: 'Possui Convênio?', type: 'boolean', required: true },
              { name: 'nomeConvenio', label: 'Nome do Convênio', type: 'text', required: false, placeholder: 'Ex: Amil, Bradesco, SulAmérica' },
              { name: 'numeroCartao', label: 'Número do Cartão', type: 'text', required: false, placeholder: 'Número do cartão do convênio' },
              { name: 'validadeCartao', label: 'Validade do Cartão', type: 'date', required: false },
              { name: 'tipoPlano', label: 'Tipo de Plano', type: 'select', options: ['Básico', 'Executivo', 'Premium', 'Master'], required: false }
            ]
          }
        ]
      })
    },
    {
      slug: 'anamnese',
      name: 'Anamnese',
      description: 'Histórico médico completo do paciente - Preenchimento obrigatório',
      icon: '📋',
      color: '#ef4444',
      isRequired: true,
      sortOrder: 1,
      fieldConfig: JSON.stringify({
        customLayout: true,
        introText: 'Por favor, preencha sua anamnese antes da consulta. Leva menos de 5 minutos.',
        sections: [
          {
            title: 'Informações do Paciente',
            layout: 'full-width',
            fields: [
              { 
                name: 'nomeCompleto', 
                label: 'Nome Completo', 
                type: 'text', 
                required: true, 
                readOnly: true,
                placeholder: 'Nome será preenchido automaticamente',
                className: 'field-readonly'
              },
              { 
                name: 'queixaPrincipal', 
                label: 'Queixa Principal *', 
                type: 'textarea', 
                rows: 4, 
                placeholder: 'Descreva detalhadamente o principal motivo da consulta, quando começou, sintomas apresentados...', 
                required: true,
                maxLength: 500
              }
            ]
          },
          {
            title: 'Histórico de Doenças',
            layout: 'full-width',
            fields: [
              { 
                name: 'historicoDoencas', 
                label: 'Selecione as doenças que possui ou já teve:', 
                type: 'checkbox-group',
                options: [
                  'Diabetes',
                  'Hipertensão',
                  'Asma',
                  'Bronquite',
                  'Problemas cardíacos',
                  'Problemas renais',
                  'Problemas hepáticos',
                  'Epilepsia',
                  'Depressão/Ansiedade',
                  'Osteoporose',
                  'Artrite/Artrose',
                  'Câncer',
                  'HIV/AIDS',
                  'Hepatite',
                  'Tuberculose',
                  'Anemia',
                  'Problemas de tireoide',
                  'Nenhuma das anteriores'
                ],
                required: true,
                layout: 'grid-3-columns'
              }
            ]
          },
          {
            title: 'Alergias e Medicamentos',
            layout: 'full-width', 
            fields: [
              { 
                name: 'alergias', 
                label: 'Alergias', 
                type: 'textarea', 
                rows: 3, 
                placeholder: 'Descreva todas as suas alergias (medicamentos, alimentos, materiais, etc.). Se não possui alergias, escreva "Nenhuma"', 
                required: true
              },
              { 
                name: 'medicamentosUso', 
                label: 'Medicamentos em Uso', 
                type: 'textarea', 
                rows: 3, 
                placeholder: 'Liste todos os medicamentos que utiliza atualmente, incluindo dosagem e frequência. Se não toma nenhum medicamento, escreva "Nenhum"', 
                required: true
              }
            ]
          },
          {
            title: 'Hábitos de Vida',
            layout: 'two-columns',
            fields: [
              { 
                name: 'atividadeFisica', 
                label: 'Pratica atividade física regularmente?', 
                type: 'radio',
                options: ['Sim', 'Não'],
                required: true,
                width: '50%'
              },
              { 
                name: 'especifiqueAtividade', 
                label: 'Qual atividade e frequência?', 
                type: 'text', 
                placeholder: 'Ex: Caminhada 3x por semana, Academia diariamente...', 
                required: false,
                width: '50%',
                dependsOn: 'atividadeFisica',
                showWhen: 'Sim'
              },
              { 
                name: 'tabagismo', 
                label: 'É fumante?', 
                type: 'radio',
                options: ['Sim', 'Não', 'Ex-fumante'],
                required: true,
                width: '50%'
              },
              { 
                name: 'especifiqueTabagismo', 
                label: 'Quantos cigarros/dia ou há quanto tempo parou?', 
                type: 'text', 
                placeholder: 'Ex: 10 cigarros/dia ou Parei há 2 anos', 
                required: false,
                width: '50%',
                dependsOn: 'tabagismo',
                showWhen: ['Sim', 'Ex-fumante']
              },
              { 
                name: 'consumoAlcool', 
                label: 'Consome bebidas alcoólicas?', 
                type: 'radio',
                options: ['Sim', 'Não', 'Ocasionalmente'],
                required: true,
                width: '50%'
              },
              { 
                name: 'especifiqueAlcool', 
                label: 'Com que frequência?', 
                type: 'text', 
                placeholder: 'Ex: Fins de semana, 1x por semana, Socialmente...', 
                required: false,
                width: '50%',
                dependsOn: 'consumoAlcool',
                showWhen: ['Sim', 'Ocasionalmente']
              }
            ]
          },
          {
            title: 'Declaração de Veracidade',
            layout: 'full-width',
            fields: [
              { 
                name: 'aceiteEletronico', 
                label: 'Declaro que as informações fornecidas são verdadeiras', 
                type: 'checkbox',
                required: true,
                helpText: 'É importante fornecer informações precisas para um atendimento adequado e seguro.',
                className: 'field-agreement'
              }
            ]
          }
        ],
        submitButton: {
          text: 'Enviar Anamnese',
          className: 'btn-submit-anamnese',
          color: 'primary'
        },
        validation: {
          showErrorsInline: true,
          highlightRequiredFields: true
        },
        styling: {
          theme: 'modern',
          responsive: true,
          cardLayout: true
        }
      })
    },
    {
      slug: 'prontuario',
      name: 'Prontuário',
      description: 'Registro detalhado de consultas, diagnósticos e procedimentos',
      icon: '🔬',
      color: '#10b981',
      isRequired: true,
      sortOrder: 2,
      fieldConfig: JSON.stringify({
        isAdvanced: true,
        type: 'medical_record'
      })
    },
    {
      slug: 'odontograma',
      name: 'Odontograma',
      description: 'Mapa interativo completo da situação dentária',
      icon: '🦷',
      color: '#f59e0b',
      isRequired: true,
      sortOrder: 3,
      fieldConfig: JSON.stringify({
        isAdvanced: true,
        type: 'odontogram'
      })
    },
    {
      slug: 'plano-tratamento',
      name: 'Plano de Tratamento',
      description: 'Procedimentos planejados, orçamentos e cronograma',
      icon: '📅',
      color: '#8b5cf6',
      isRequired: false,
      sortOrder: 4,
      fieldConfig: JSON.stringify({
        sections: [
          {
            title: 'Procedimentos Planejados',
            fields: [
              { name: 'procedimentosListar', label: 'Procedimentos a Realizar', type: 'textarea', rows: 5, placeholder: 'Liste os procedimentos planejados', required: false },
              { name: 'prioridade', label: 'Prioridade', type: 'select', options: ['Baixa', 'Média', 'Alta', 'Urgente'], required: true }
            ]
          },
          {
            title: 'Orçamento e Cronograma',
            fields: [
              { name: 'totalEstimado', label: 'Valor Total Estimado', type: 'currency', required: false },
              { name: 'numeroSessoes', label: 'Número de Sessões', type: 'number', required: false },
              { name: 'duracaoEstimada', label: 'Duração Estimada (semanas)', type: 'number', required: false },
              { name: 'dataInicio', label: 'Data de Início', type: 'date', required: false },
              { name: 'dataPrevisaoFim', label: 'Previsão de Término', type: 'date', required: false },
              { name: 'observacoes', label: 'Observações', type: 'textarea', rows: 3, placeholder: 'Observações sobre o plano de tratamento', required: false }
            ]
          }
        ]
      })
    },
    {
      slug: 'documentos',
      name: 'Documentos',
      description: 'Radiografias, fotografias, exames e documentos',
      icon: '📁',
      color: '#06b6d4',
      isRequired: false,
      sortOrder: 5,
      fieldConfig: JSON.stringify({
        isAdvanced: true,
        type: 'document_manager'
      })
    },
    {
      slug: 'financeiro',
      name: 'Financeiro',
      description: 'Orçamentos, pagamentos, parcelamentos e controle financeiro completo',
      icon: '💰',
      color: '#84cc16',
      isRequired: false,
      sortOrder: 6,
      fieldConfig: JSON.stringify({
        sections: [
          {
            title: 'Orçamentos e Tratamentos',
            fields: [
              { name: 'orcamentos', label: 'Orçamentos', type: 'array', itemType: 'object', 
                itemFields: [
                  { name: 'id', label: 'ID', type: 'text', readOnly: true },
                  { name: 'dataOrcamento', label: 'Data do Orçamento', type: 'date', required: true },
                  { name: 'validadeOrcamento', label: 'Válido até', type: 'date', required: true },
                  { name: 'tratamentos', label: 'Tratamentos Incluídos', type: 'textarea', rows: 3, required: true, placeholder: 'Lista detalhada dos tratamentos incluídos no orçamento' },
                  { name: 'valorTotal', label: 'Valor Total', type: 'currency', required: true },
                  { name: 'desconto', label: 'Desconto (%)', type: 'number', min: 0, max: 100, required: false },
                  { name: 'valorFinal', label: 'Valor Final', type: 'currency', required: true },
                  { name: 'status', label: 'Status', type: 'select', options: ['Aguardando Aprovação', 'Aprovado', 'Em Andamento', 'Concluído', 'Cancelado'], required: true },
                  { name: 'observacoes', label: 'Observações', type: 'textarea', rows: 2, required: false }
                ], required: false 
              }
            ]
          },
          {
            title: 'Planos de Pagamento',
            fields: [
              { name: 'planosPagamento', label: 'Planos de Pagamento', type: 'array', itemType: 'object',
                itemFields: [
                  { name: 'id', label: 'ID', type: 'text', readOnly: true },
                  { name: 'orcamentoId', label: 'Orçamento Relacionado', type: 'text', required: false },
                  { name: 'dataContrato', label: 'Data do Contrato', type: 'date', required: true },
                  { name: 'valorTotal', label: 'Valor Total', type: 'currency', required: true },
                  { name: 'entrada', label: 'Entrada', type: 'currency', required: false },
                  { name: 'numeroParcelas', label: 'Número de Parcelas', type: 'number', min: 1, max: 60, required: true },
                  { name: 'valorParcela', label: 'Valor da Parcela', type: 'currency', required: true },
                  { name: 'formaPagamento', label: 'Forma de Pagamento', type: 'select', options: ['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Transferência Bancária', 'Cheque', 'Convênio'], required: true },
                  { name: 'diaVencimento', label: 'Dia do Vencimento', type: 'number', min: 1, max: 31, required: true },
                  { name: 'status', label: 'Status', type: 'select', options: ['Ativo', 'Quitado', 'Em Atraso', 'Cancelado', 'Suspenso'], required: true },
                  { name: 'observacoes', label: 'Observações', type: 'textarea', rows: 2, required: false }
                ], required: false
              }
            ]
          },
          {
            title: 'Contas a Receber',
            fields: [
              { name: 'contasReceber', label: 'Contas a Receber', type: 'array', itemType: 'object',
                itemFields: [
                  { name: 'id', label: 'ID', type: 'text', readOnly: true },
                  { name: 'planoId', label: 'Plano Relacionado', type: 'text', required: false },
                  { name: 'numeroParcela', label: 'Número da Parcela', type: 'number', required: true },
                  { name: 'dataVencimento', label: 'Data de Vencimento', type: 'date', required: true },
                  { name: 'valorOriginal', label: 'Valor Original', type: 'currency', required: true },
                  { name: 'valorPago', label: 'Valor Pago', type: 'currency', required: false },
                  { name: 'dataPagamento', label: 'Data do Pagamento', type: 'date', required: false },
                  { name: 'formaPagamento', label: 'Forma de Pagamento', type: 'select', options: ['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Transferência Bancária', 'Cheque'], required: false },
                  { name: 'status', label: 'Status', type: 'select', options: ['Pendente', 'Pago', 'Atrasado', 'Cancelado'], required: true },
                  { name: 'diasAtraso', label: 'Dias de Atraso', type: 'number', readOnly: true },
                  { name: 'observacoesPagamento', label: 'Observações do Pagamento', type: 'textarea', rows: 2, required: false }
                ], required: false
              }
            ]
          },
          {
            title: 'Histórico Financeiro',
            fields: [
              { name: 'historicoFinanceiro', label: 'Histórico de Pagamentos', type: 'array', itemType: 'object',
                itemFields: [
                  { name: 'id', label: 'ID', type: 'text', readOnly: true },
                  { name: 'data', label: 'Data', type: 'date', required: true },
                  { name: 'tipo', label: 'Tipo', type: 'select', options: ['Pagamento', 'Estorno', 'Desconto', 'Juros', 'Multa', 'Negociação'], required: true },
                  { name: 'valor', label: 'Valor', type: 'currency', required: true },
                  { name: 'formaPagamento', label: 'Forma de Pagamento', type: 'select', options: ['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Transferência Bancária', 'Cheque'], required: false },
                  { name: 'descricao', label: 'Descrição', type: 'textarea', rows: 2, required: true },
                  { name: 'responsavel', label: 'Responsável', type: 'text', required: false }
                ], required: false
              }
            ]
          },
          {
            title: 'Configurações Financeiras',
            fields: [
              { name: 'formaPagamentoPreferencial', label: 'Forma de Pagamento Preferencial', type: 'select', options: ['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Transferência Bancária', 'Convênio'], required: false },
              { name: 'limiteParcelas', label: 'Limite Máximo de Parcelas', type: 'number', min: 1, max: 60, required: false },
              { name: 'descontoPagamentoVista', label: 'Desconto Padrão à Vista (%)', type: 'number', min: 0, max: 50, required: false },
              { name: 'diaPreferencialVencimento', label: 'Dia Preferencial de Vencimento', type: 'number', min: 1, max: 31, required: false },
              { name: 'rendaMensalAproximada', label: 'Renda Mensal Aproximada', type: 'currency', required: false },
              { name: 'limiteCreditoAprovado', label: 'Limite de Crédito Aprovado', type: 'currency', required: false },
              { name: 'observacoesFinanceiras', label: 'Observações Financeiras', type: 'textarea', rows: 3, placeholder: 'Informações importantes sobre o perfil financeiro, histórico de pagamentos, restrições especiais, etc.', required: false }
            ]
          },
          {
            title: 'Relatórios e Totalizadores',
            fields: [
              { name: 'totalOrcamentos', label: 'Total em Orçamentos', type: 'currency', readOnly: true },
              { name: 'totalContratado', label: 'Total Contratado', type: 'currency', readOnly: true },
              { name: 'totalPago', label: 'Total Pago', type: 'currency', readOnly: true },
              { name: 'saldoPendente', label: 'Saldo Pendente', type: 'currency', readOnly: true },
              { name: 'contasEmAtraso', label: 'Contas em Atraso', type: 'number', readOnly: true },
              { name: 'ultimoPagamento', label: 'Data do Último Pagamento', type: 'date', readOnly: true },
              { name: 'proximoVencimento', label: 'Próximo Vencimento', type: 'date', readOnly: true }
            ]
          }
        ]
      })
    }
  ];

  try {
    // Buscar o tipo de negócio Odontologia
    const businessType = await prisma.businessType.findFirst({
      where: { name: 'Odontologia' }
    });

    if (!businessType) {
      console.log('Tipo de negócio Odontologia não encontrado!');
      return;
    }

    console.log('Atualizando abas para o tipo de negócio:', businessType.name);

    // Atualizar cada aba
    for (const tabConfig of newTabsConfig) {
      try {
        const updatedTab = await prisma.businessTypeTab.updateMany({
          where: { 
            businessTypeId: businessType.id,
            slug: tabConfig.slug
          },
          data: {
            name: tabConfig.name,
            description: tabConfig.description,
            icon: tabConfig.icon,
            color: tabConfig.color,
            isRequired: tabConfig.isRequired,
            sortOrder: tabConfig.sortOrder,
            fieldConfig: tabConfig.fieldConfig
          }
        });
        
        console.log(`✅ Aba "${tabConfig.name}" atualizada com sucesso!`);
      } catch (error) {
        console.error(`❌ Erro ao atualizar aba "${tabConfig.name}":`, error);
      }
    }

    console.log('\n✨ Configuração das abas atualizada com sucesso!');
  } catch (error) {
    console.error('Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTabsConfiguration().catch(console.error);