import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import prisma from './prisma';
import documentRoutes from './routes/documents';
import authRoutes from './modules/auth/auth.routes';
import clinicalNotesRoutes from './routes/clinical-notes';
import whatsappRoutes from './modules/whatsapp/routes/whatsappRoutes';
import availabilityRoutes from './routes/availability';
import { authMiddleware, AuthRequest } from './middleware/auth';
import { runSchedulers } from './utils/scheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para receber dados do Twilio
app.use(cookieParser());

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rotas básicas
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Agendoor API está funcionando!' });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Agendoor Backend',
    database: 'connected'
  });
});

// Rota para listar planos
app.get('/api/plans', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' }
    });
    
    res.json({ plans });
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rotas para tipos de serviço
app.get('/api/service-types', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const serviceTypes = await prisma.serviceType.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { sortOrder: 'asc' }
    });
    
    res.json({ serviceTypes });
  } catch (error) {
    console.error('Erro ao buscar tipos de serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/service-types', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, icon, color, sortOrder } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    const serviceType = await prisma.serviceType.create({
      data: {
        companyId: req.user!.companyId,
        name,
        description,
        icon,
        color,
        sortOrder: sortOrder || 0
      }
    });
    
    res.status(201).json({ serviceType });
  } catch (error) {
    console.error('Erro ao criar tipo de serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/service-types/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, active, sortOrder } = req.body;
    
    const serviceType = await prisma.serviceType.update({
      where: { 
        id,
        companyId: req.user!.companyId
      },
      data: {
        name,
        description,
        icon,
        color,
        active,
        sortOrder
      }
    });
    
    res.json({ serviceType });
  } catch (error) {
    console.error('Erro ao atualizar tipo de serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/service-types/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.serviceType.delete({
      where: { 
        id,
        companyId: req.user!.companyId
      }
    });
    
    res.json({ message: 'Tipo de serviço excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir tipo de serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== TIPOS DE NEGÓCIO E ABAS =====

// Listar todos os tipos de negócio
app.get('/api/business-types', async (req: Request, res: Response) => {
  try {
    const businessTypes = await prisma.businessType.findMany({
      where: { active: true },
      include: {
        tabs: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    
    res.json({ businessTypes });
  } catch (error) {
    console.error('Erro ao buscar tipos de negócio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar abas de um tipo de negócio específico
app.get('/api/business-types/:id/tabs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const tabs = await prisma.businessTypeTab.findMany({
      where: { 
        businessTypeId: id,
        active: true 
      },
      orderBy: { sortOrder: 'asc' }
    });
    
    res.json({ tabs });
  } catch (error) {
    console.error('Erro ao buscar abas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar dados das abas de um cliente específico
app.get('/api/clients/:clientId/tabs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    
    // Verificar se o cliente pertence à empresa do usuário
    const client = await prisma.client.findFirst({
      where: { 
        id: clientId,
        companyId: req.user!.companyId
      }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    const clientTabData = await prisma.clientTabData.findMany({
      where: { clientId },
      include: {
        tab: {
          include: {
            businessType: true
          }
        }
      }
    });
    
    res.json({ clientTabData });
  } catch (error) {
    console.error('Erro ao buscar dados das abas do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Salvar/atualizar dados de uma aba específica de um cliente
app.put('/api/clients/:clientId/tabs/:tabId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, tabId } = req.params;
    const { data, notes, lastModifiedBy } = req.body;
    
    // Verificar se cliente existe e pertence à empresa do usuário
    const client = await prisma.client.findFirst({ 
      where: { 
        id: clientId,
        companyId: req.user!.companyId
      }
    });
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Verificar se a aba existe
    const tab = await prisma.businessTypeTab.findUnique({ where: { id: tabId } });
    if (!tab) {
      return res.status(404).json({ error: 'Aba não encontrada' });
    }
    
    // Buscar dados atuais para comparação (se existirem)
    const existingTabData = await prisma.clientTabData.findUnique({
      where: {
        clientId_tabId: {
          clientId,
          tabId
        }
      }
    });
    
    let newHistory: any[] = [];
    
    if (existingTabData) {
      // Se já existe, comparar dados para detectar mudanças
      const oldData = JSON.parse(existingTabData.data || '{}');
      const existingHistory = JSON.parse(existingTabData.history || '[]');
      
      // Detectar mudanças entre oldData e data
      const changes: Array<{field: string, action: string, oldValue: any, newValue: any}> = [];
      const detectChanges = (oldObj: any, newObj: any, path = '') => {
        for (const key in newObj) {
          const fullPath = path ? `${path}.${key}` : key;
          if (!(key in oldObj)) {
            changes.push({
              field: fullPath,
              action: 'added',
              oldValue: null,
              newValue: newObj[key]
            });
          } else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
            changes.push({
              field: fullPath,
              action: 'modified',
              oldValue: oldObj[key],
              newValue: newObj[key]
            });
          }
        }
        
        // Verificar campos removidos
        for (const key in oldObj) {
          const fullPath = path ? `${path}.${key}` : key;
          if (!(key in newObj)) {
            changes.push({
              field: fullPath,
              action: 'removed',
              oldValue: oldObj[key],
              newValue: null
            });
          }
        }
      };
      
      detectChanges(oldData, data);
      
      // Criar entrada no histórico apenas se houve mudanças
      if (changes.length > 0) {
        const historyEntry = {
          timestamp: new Date().toISOString(),
          action: 'updated',
          description: `Dados da aba ${tab.name} foram atualizados`,
          user: lastModifiedBy || 'Usuário',
          changes: changes
        };
        
        newHistory = [...existingHistory, historyEntry];
      } else {
        newHistory = existingHistory;
      }
    } else {
      // Se não existe, criar entrada inicial no histórico
      const initialHistoryEntry = {
        timestamp: new Date().toISOString(),
        action: 'created',
        description: `Aba ${tab.name} foi criada e preenchida pela primeira vez`,
        user: lastModifiedBy || 'Usuário',
        changes: []
      };
      
      newHistory = [initialHistoryEntry];
    }
    
    const clientTabData = await prisma.clientTabData.upsert({
      where: {
        clientId_tabId: {
          clientId,
          tabId
        }
      },
      update: {
        data: JSON.stringify(data),
        history: JSON.stringify(newHistory),
        notes,
        lastModifiedBy
      },
      create: {
        clientId,
        tabId,
        data: JSON.stringify(data),
        history: JSON.stringify(newHistory),
        notes,
        lastModifiedBy
      },
      include: {
        tab: true
      }
    });
    
    res.json({ clientTabData });
  } catch (error) {
    console.error('Erro ao salvar dados da aba:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar histórico de uma aba específica de um cliente
app.get('/api/clients/:clientId/tabs/:tabId/history', async (req: Request, res: Response) => {
  try {
    const { clientId, tabId } = req.params;
    
    const clientTabData = await prisma.clientTabData.findUnique({
      where: {
        clientId_tabId: {
          clientId,
          tabId
        }
      },
      include: {
        tab: true,
        client: {
          select: {
            fullName: true
          }
        }
      }
    });
    
    if (!clientTabData) {
      return res.status(404).json({ error: 'Dados da aba não encontrados' });
    }
    
    const history = JSON.parse(clientTabData.history || '[]');
    
    res.json({ 
      history,
      tabName: clientTabData.tab.name,
      clientName: clientTabData.client.fullName
    });
  } catch (error) {
    console.error('Erro ao buscar histórico da aba:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== CONFIGURAÇÃO DE EMPRESA =====

// Buscar configuração da empresa
app.get('/api/company/config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      include: {
        businessType: {
          include: {
            tabs: {
              where: { active: true },
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });
    
    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    
    res.json({ company });
  } catch (error) {
    console.error('Erro ao buscar configuração da empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar tipo de negócio da empresa
app.put('/api/company/business-type', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { businessTypeId } = req.body;
    
    if (!businessTypeId) {
      return res.status(400).json({ error: 'ID do tipo de negócio é obrigatório' });
    }
    
    // Verificar se o tipo de negócio existe
    const businessType = await prisma.businessType.findUnique({ 
      where: { id: businessTypeId } 
    });
    
    if (!businessType) {
      return res.status(404).json({ error: 'Tipo de negócio não encontrado' });
    }
    
    const updatedCompany = await prisma.company.update({
      where: { id: req.user!.companyId },
      data: { businessTypeId },
      include: {
        businessType: {
          include: {
            tabs: {
              where: { active: true },
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });
    
    res.json({ company: updatedCompany });
  } catch (error) {
    console.error('Erro ao atualizar tipo de negócio da empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== FUNCIONALIDADES ESPECÍFICAS =====

// PRONTUÁRIOS E CONSULTAS (para segmentos médicos)
app.get('/api/clients/:clientId/medical-records', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    
    // Verificar se cliente pertence à empresa
    const client = await prisma.client.findFirst({
      where: { 
        id: clientId,
        companyId: req.user!.companyId
      }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Buscar dados da aba de prontuário
    const medicalRecords = await prisma.clientTabData.findMany({
      where: { 
        clientId,
        tab: {
          slug: { in: ['prontuario', 'prontuarios', 'consultas'] }
        }
      },
      include: {
        tab: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ medicalRecords });
  } catch (error) {
    console.error('Erro ao buscar prontuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// HISTÓRICO DE SERVIÇOS (para barbearia, salão)
app.get('/api/clients/:clientId/service-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    
    // Verificar se cliente pertence à empresa
    const client = await prisma.client.findFirst({
      where: { 
        id: clientId,
        companyId: req.user!.companyId
      }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Buscar agendamentos completados do cliente
    const serviceHistory = await prisma.appointment.findMany({
      where: { 
        companyId: req.user!.companyId,
        clientId,
        status: 'COMPLETED'
      },
      include: {
        service: {
          include: {
            serviceType: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    res.json({ serviceHistory });
  } catch (error) {
    console.error('Erro ao buscar histórico de serviços:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// EMISSÃO DE ATESTADOS
app.post('/api/clients/:clientId/medical-certificate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { reason, days, issueDate, doctorName, doctorCrm } = req.body;
    
    if (!reason || !days || !issueDate) {
      return res.status(400).json({ error: 'Dados obrigatórios: motivo, dias e data de emissão' });
    }
    
    // Verificar se cliente existe e pertence à empresa
    const client = await prisma.client.findFirst({ 
      where: { 
        id: clientId,
        companyId: req.user!.companyId
      }
    });
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Buscar ou criar aba de atestados
    const attestTab = await prisma.businessTypeTab.findFirst({
      where: { slug: 'atestados' }
    });
    
    if (!attestTab) {
      return res.status(404).json({ error: 'Aba de atestados não configurada' });
    }
    
    // Gerar o atestado
    const certificateData = {
      id: `attest_${Date.now()}`,
      reason,
      days: parseInt(days),
      issueDate,
      doctorName: doctorName || 'Dr. João da Silva',
      doctorCrm: doctorCrm || 'CRM 123456',
      clientName: client.fullName,
      generatedAt: new Date().toISOString()
    };
    
    // Buscar atestados existentes
    const existingData = await prisma.clientTabData.findUnique({
      where: {
        clientId_tabId: {
          clientId,
          tabId: attestTab.id
        }
      }
    });
    
    let certificates: any[] = [];
    if (existingData) {
      try {
        const parsed = JSON.parse(existingData.data);
        certificates = parsed.certificates || [];
      } catch (e) {
        certificates = [];
      }
    }
    
    certificates.unshift(certificateData);
    
    // Salvar/atualizar dados
    await prisma.clientTabData.upsert({
      where: {
        clientId_tabId: {
          clientId,
          tabId: attestTab.id
        }
      },
      update: {
        data: JSON.stringify({ certificates })
      },
      create: {
        clientId,
        tabId: attestTab.id,
        data: JSON.stringify({ certificates })
      }
    });
    
    res.json({ certificate: certificateData });
  } catch (error) {
    console.error('Erro ao emitir atestado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// EMISSÃO DE RECEITAS
app.post('/api/clients/:clientId/prescription', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { medications, instructions, issueDate, doctorName, doctorCrm } = req.body;
    
    if (!medications || !issueDate) {
      return res.status(400).json({ error: 'Medicamentos e data de emissão são obrigatórios' });
    }
    
    // Verificar se cliente existe e pertence à empresa
    const client = await prisma.client.findFirst({ 
      where: { 
        id: clientId,
        companyId: req.user!.companyId
      }
    });
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Buscar aba de receitas
    const prescriptionTab = await prisma.businessTypeTab.findFirst({
      where: { slug: 'receitas' }
    });
    
    if (!prescriptionTab) {
      return res.status(404).json({ error: 'Aba de receitas não configurada' });
    }
    
    // Gerar a receita
    const prescriptionData = {
      id: `presc_${Date.now()}`,
      medications: typeof medications === 'string' ? medications : JSON.stringify(medications),
      instructions: instructions || '',
      issueDate,
      doctorName: doctorName || 'Dr. João da Silva',
      doctorCrm: doctorCrm || 'CRM 123456',
      clientName: client.fullName,
      generatedAt: new Date().toISOString()
    };
    
    // Buscar receitas existentes
    const existingData = await prisma.clientTabData.findUnique({
      where: {
        clientId_tabId: {
          clientId,
          tabId: prescriptionTab.id
        }
      }
    });
    
    let prescriptions: any[] = [];
    if (existingData) {
      try {
        const parsed = JSON.parse(existingData.data);
        prescriptions = parsed.prescriptions || [];
      } catch (e) {
        prescriptions = [];
      }
    }
    
    prescriptions.unshift(prescriptionData);
    
    // Salvar/atualizar dados
    await prisma.clientTabData.upsert({
      where: {
        clientId_tabId: {
          clientId,
          tabId: prescriptionTab.id
        }
      },
      update: {
        data: JSON.stringify({ prescriptions })
      },
      create: {
        clientId,
        tabId: prescriptionTab.id,
        data: JSON.stringify({ prescriptions })
      }
    });
    
    res.json({ prescription: prescriptionData });
  } catch (error) {
    console.error('Erro ao emitir receita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== CLIENTES =====

// Listar todos os clientes
app.get('/api/clients', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { companyId: req.user!.companyId },
      include: {
        appointments: {
          include: {
            service: {
              include: {
                serviceType: true
              }
            }
          },
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { fullName: 'asc' }
    });
    
    res.json({ clients });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar cliente por CPF
app.get('/api/clients/search/:cpf', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { cpf } = req.params;
    
    const client = await prisma.client.findFirst({
      where: { 
        companyId: req.user!.companyId,
        cpf: cpf.replace(/\D/g, '')
      },
      include: {
        appointments: {
          include: {
            service: {
              include: {
                serviceType: true
              }
            }
          },
          orderBy: { date: 'desc' }
        }
      }
    });
    
    res.json({ client });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar cliente por ID
app.get('/api/clients/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const client = await prisma.client.findFirst({
      where: { 
        id,
        companyId: req.user!.companyId
      },
      include: {
        appointments: {
          include: {
            service: {
              include: {
                serviceType: true
              }
            }
          },
          orderBy: { date: 'desc' }
        },
        tabData: {
          include: {
            tab: {
              include: {
                businessType: true
              }
            }
          }
        }
      }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    res.json({ client });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo cliente
app.post('/api/clients', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, cpf, phone, email, birthDate, notes, cep, street, number, complement, neighborhood, city, state } = req.body;
    
    if (!fullName || !cpf || !phone) {
      return res.status(400).json({ error: 'Nome, CPF e telefone são obrigatórios' });
    }
    
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Validar CPF (deve ter 11 dígitos)
    if (cleanCpf.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido. Deve conter 11 dígitos' });
    }
    
    // Verificar se CPF já existe na empresa
    const existingClient = await prisma.client.findFirst({
      where: { 
        companyId: req.user!.companyId,
        cpf: cleanCpf
      }
    });
    
    if (existingClient) {
      return res.status(400).json({ error: 'Cliente com este CPF já existe' });
    }
    
    // Buscar configuração da empresa para obter o tipo de negócio
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      include: {
        businessType: {
          include: {
            tabs: {
              where: { 
                active: true,
                isRequired: true // Apenas abas obrigatórias
              },
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });
    
    // Criar o cliente
    const client = await prisma.client.create({
      data: {
        companyId: req.user!.companyId,
        fullName,
        cpf: cleanCpf,
        phone,
        email,
        birthDate: birthDate ? new Date(birthDate) : null,
        notes,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state
      }
    });
    
    // Criar automaticamente as abas obrigatórias se houver businessType configurado
    if (company?.businessType?.tabs && company.businessType.tabs.length > 0) {
      const initialHistoryEntry = {
        timestamp: new Date().toISOString(),
        action: 'created',
        description: 'Aba criada automaticamente na criação do cliente',
        user: 'Sistema',
        changes: []
      };
      
      const tabCreationPromises = company.businessType.tabs.map(tab => 
        prisma.clientTabData.create({
          data: {
            clientId: client.id,
            tabId: tab.id,
            data: '{}', // Dados vazios inicialmente
            history: JSON.stringify([initialHistoryEntry]),
            notes: 'Aba criada automaticamente',
            lastModifiedBy: 'Sistema'
          }
        })
      );
      
      await Promise.all(tabCreationPromises);
    }
    
    res.status(201).json({ client });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar cliente
app.put('/api/clients/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, cpf, phone, email, birthDate, notes, cep, street, number, complement, neighborhood, city, state } = req.body;
    
    if (!fullName || !cpf || !phone) {
      return res.status(400).json({ error: 'Nome, CPF e telefone são obrigatórios' });
    }
    
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Verificar se CPF já existe em outro cliente da mesma empresa
    const existingClient = await prisma.client.findFirst({
      where: { 
        companyId: req.user!.companyId,
        cpf: cleanCpf,
        id: { not: id }
      }
    });
    
    if (existingClient) {
      return res.status(400).json({ error: 'Cliente com este CPF já existe' });
    }
    
    const client = await prisma.client.update({
      where: { 
        id,
        companyId: req.user!.companyId
      },
      data: {
        fullName,
        cpf: cleanCpf,
        phone,
        email,
        birthDate: birthDate ? new Date(birthDate) : null,
        notes,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state
      }
    });
    
    res.json({ client });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== SERVIÇOS =====

// Listar todos os serviços
app.get('/api/services', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      where: { 
        companyId: req.user!.companyId,
        active: true
      },
      include: {
        serviceType: true
      },
      orderBy: { name: 'asc' }
    });
    
    res.json({ services });
  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo serviço
app.post('/api/services', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      name, 
      serviceTypeId, 
      duration, 
      price, 
      description,
      mondayEnabled,
      tuesdayEnabled,
      wednesdayEnabled,
      thursdayEnabled,
      fridayEnabled,
      saturdayEnabled,
      sundayEnabled,
      startTime,
      endTime
    } = req.body;
    
    if (!name || !serviceTypeId || !duration || price === undefined) {
      return res.status(400).json({ error: 'Nome, tipo de serviço, duração e preço são obrigatórios' });
    }
    
    const service = await prisma.service.create({
      data: {
        companyId: req.user!.companyId,
        name,
        serviceTypeId,
        duration: parseInt(duration),
        price: parseFloat(price),
        description,
        mondayEnabled: mondayEnabled ?? true,
        tuesdayEnabled: tuesdayEnabled ?? true,
        wednesdayEnabled: wednesdayEnabled ?? true,
        thursdayEnabled: thursdayEnabled ?? true,
        fridayEnabled: fridayEnabled ?? true,
        saturdayEnabled: saturdayEnabled ?? true,
        sundayEnabled: sundayEnabled ?? false,
        startTime: startTime || '08:00',
        endTime: endTime || '18:00'
      },
      include: {
        serviceType: true
      }
    });
    
    res.status(201).json({ service });
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar serviço
app.put('/api/services/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      serviceTypeId, 
      duration, 
      price, 
      description,
      mondayEnabled,
      tuesdayEnabled,
      wednesdayEnabled,
      thursdayEnabled,
      fridayEnabled,
      saturdayEnabled,
      sundayEnabled,
      startTime,
      endTime,
      active
    } = req.body;
    
    const service = await prisma.service.update({
      where: { 
        id,
        companyId: req.user!.companyId
      },
      data: {
        name,
        serviceTypeId,
        duration: duration !== undefined ? parseInt(duration) : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        description,
        mondayEnabled,
        tuesdayEnabled,
        wednesdayEnabled,
        thursdayEnabled,
        fridayEnabled,
        saturdayEnabled,
        sundayEnabled,
        startTime,
        endTime,
        active
      },
      include: {
        serviceType: true
      }
    });
    
    res.json({ service });
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir serviço
app.delete('/api/services/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.service.delete({
      where: { 
        id,
        companyId: req.user!.companyId
      }
    });
    
    res.json({ message: 'Serviço excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== AGENDAMENTOS =====

// Listar agendamentos por data
app.get('/api/appointments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause: any = {
      companyId: req.user!.companyId
    };
    
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        client: true,
        service: {
          include: {
            serviceType: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });
    
    res.json({ appointments });
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar disponibilidade de horário
app.post('/api/appointments/check-availability', async (req: Request, res: Response) => {
  try {
    const { date, startTime, endTime, excludeAppointmentId } = req.body;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Data, hora de início e fim são obrigatórias' });
    }
    
    const whereClause: any = {
      date: new Date(date),
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } }
          ]
        },
        {
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gte: endTime } }
          ]
        },
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } }
          ]
        }
      ]
    };
    
    if (excludeAppointmentId) {
      whereClause.NOT = { id: excludeAppointmentId };
    }
    
    const conflictingAppointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        client: true,
        service: true
      }
    });
    
    const isAvailable = conflictingAppointments.length === 0;
    
    res.json({ 
      available: isAvailable, 
      conflicts: conflictingAppointments 
    });
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo agendamento
app.post('/api/appointments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, serviceId, date, startTime, endTime, notes } = req.body;
    
    if (!clientId || !serviceId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    
    // Buscar serviço para obter o preço
    const service = await prisma.service.findFirst({
      where: { 
        id: serviceId,
        companyId: req.user!.companyId
      }
    });
    
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    
    // Verificar disponibilidade diretamente no banco (apenas para a empresa)
    // Exclui agendamentos cancelados e reagendados da verificação
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        companyId: req.user!.companyId,
        date: new Date(date),
        status: { notIn: ['CANCELLED', 'RESCHEDULED'] },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      }
    });
    
    if (conflictingAppointments.length > 0) {
      return res.status(400).json({ 
        error: 'Horário não disponível', 
        conflicts: conflictingAppointments 
      });
    }
    
    const appointment = await prisma.appointment.create({
      data: {
        companyId: req.user!.companyId,
        clientId,
        serviceId,
        date: new Date(date),
        startTime,
        endTime,
        totalValue: service.price, // Campo obrigatório: usa o preço do serviço
        notes
      },
      include: {
        client: true,
        service: {
          include: {
            serviceType: true
          }
        }
      }
    });
    
    res.status(201).json({ appointment });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar agendamento
app.put('/api/appointments/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, date, startTime, endTime } = req.body;
    
    const updateData: any = {};
    
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (date) updateData.date = new Date(date);
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    
    const appointment = await prisma.appointment.update({
      where: { 
        id,
        companyId: req.user!.companyId
      },
      data: updateData,
      include: {
        client: true,
        service: {
          include: {
            serviceType: true
          }
        }
      }
    });
    
    res.json({ appointment });
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar agendamento
app.delete('/api/appointments/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.appointment.delete({
      where: { 
        id,
        companyId: req.user!.companyId
      }
    });
    
    res.json({ message: 'Agendamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== GERENCIAMENTO DE STATUS DE AGENDAMENTO =====

// Confirmar agendamento
app.patch('/api/appointments/:id/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const appointment = await prisma.appointment.update({
      where: { 
        id,
        companyId: req.user!.companyId
      },
      data: { 
        status: 'CONFIRMED'
      },
      include: {
        client: true,
        service: {
          include: {
            serviceType: true
          }
        }
      }
    });
    
    res.json({ appointment });
  } catch (error) {
    console.error('Erro ao confirmar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Cancelar agendamento
app.patch('/api/appointments/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const appointment = await prisma.appointment.update({
      where: { 
        id,
        companyId: req.user!.companyId
      },
      data: { 
        status: 'CANCELLED'
      },
      include: {
        client: true,
        service: {
          include: {
            serviceType: true
          }
        }
      }
    });
    
    res.json({ appointment });
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Reagendar agendamento
app.post('/api/appointments/:id/reschedule', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime, notes } = req.body;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Data, hora de início e fim são obrigatórias' });
    }
    
    // Buscar agendamento original
    const originalAppointment = await prisma.appointment.findFirst({
      where: { 
        id,
        companyId: req.user!.companyId
      }
    });
    
    if (!originalAppointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    // Verificar disponibilidade do novo horário (exclui CANCELLED e RESCHEDULED)
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        companyId: req.user!.companyId,
        date: new Date(date),
        status: { notIn: ['CANCELLED', 'RESCHEDULED'] },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      }
    });
    
    if (conflictingAppointments.length > 0) {
      return res.status(400).json({ 
        error: 'Horário não disponível', 
        conflicts: conflictingAppointments 
      });
    }
    
    // Usar transação para garantir atomicidade
    const result = await prisma.$transaction(async (tx) => {
      // Criar novo agendamento com referência ao original
      const newAppointment = await tx.appointment.create({
        data: {
          companyId: req.user!.companyId,
          clientId: originalAppointment.clientId,
          serviceId: originalAppointment.serviceId,
          date: new Date(date),
          startTime,
          endTime,
          totalValue: originalAppointment.totalValue,
          notes: notes || originalAppointment.notes,
          status: 'PENDING',
          rescheduledFromId: id
        },
        include: {
          client: true,
          service: {
            include: {
              serviceType: true
            }
          }
        }
      });
      
      // Atualizar agendamento original para RESCHEDULED
      await tx.appointment.update({
        where: { id },
        data: { status: 'RESCHEDULED' }
      });
      
      return newAppointment;
    });
    
    res.json({ 
      appointment: result,
      message: 'Agendamento reagendado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao reagendar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== TRATAMENTOS ODONTOLÓGICOS =====

// Listar todos os tratamentos odontológicos disponíveis
app.get('/api/dental-treatments', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    
    const treatments = await prisma.dentalTreatment.findMany({
      where: {
        active: true,
        ...(search && {
          name: {
            contains: search as string
          }
        })
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    
    res.json({ treatments });
  } catch (error) {
    console.error('Erro ao buscar tratamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo tratamento odontológico
app.post('/api/dental-treatments', async (req: Request, res: Response) => {
  try {
    const { name, category, description, estimatedDuration, averagePrice, color } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
    }
    
    const treatment = await prisma.dentalTreatment.create({
      data: {
        name,
        category,
        description,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
        averagePrice: averagePrice ? parseFloat(averagePrice) : null,
        color: color || '#3b82f6',
        isCustom: true
      }
    });
    
    res.status(201).json({ treatment });
  } catch (error: any) {
    console.error('Erro ao criar tratamento:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Tratamento com este nome já existe' });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
});

// Buscar tratamentos em dentes de um cliente específico
app.get('/api/clients/:clientId/tooth-treatments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    
    // Verificar se cliente pertence à empresa
    const client = await prisma.client.findFirst({
      where: { 
        id: clientId,
        companyId: req.user!.companyId
      }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    const toothTreatments = await prisma.toothTreatment.findMany({
      where: { clientId },
      include: {
        treatment: true
      },
      orderBy: [
        { toothId: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    
    res.json({ toothTreatments });
  } catch (error) {
    console.error('Erro ao buscar tratamentos do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar/atualizar tratamento em dente específico
app.post('/api/clients/:clientId/tooth-treatments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { toothId, treatmentId, status, notes, datePerformed, datePlanned, price } = req.body;
    
    if (!toothId || !treatmentId) {
      return res.status(400).json({ error: 'ID do dente e tratamento são obrigatórios' });
    }
    
    // Verificar se cliente existe e pertence à empresa
    const client = await prisma.client.findFirst({ 
      where: { 
        id: clientId,
        companyId: req.user!.companyId
      }
    });
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Verificar se tratamento existe
    const treatment = await prisma.dentalTreatment.findUnique({ where: { id: treatmentId } });
    if (!treatment) {
      return res.status(404).json({ error: 'Tratamento não encontrado' });
    }
    
    const toothTreatment = await prisma.toothTreatment.create({
      data: {
        clientId,
        toothId: parseInt(toothId),
        treatmentId,
        status: status || 'PLANNED',
        notes,
        datePerformed: datePerformed ? new Date(datePerformed) : null,
        datePlanned: datePlanned ? new Date(datePlanned) : null,
        price: price ? parseFloat(price) : null
      },
      include: {
        treatment: true
      }
    });
    
    res.status(201).json({ toothTreatment });
  } catch (error) {
    console.error('Erro ao adicionar tratamento ao dente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar status de um tratamento
app.put('/api/tooth-treatments/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, datePerformed, price } = req.body;
    
    // Verificar se o tratamento pertence a um cliente da empresa
    const existingTreatment = await prisma.toothTreatment.findFirst({
      where: { 
        id,
        client: {
          companyId: req.user!.companyId
        }
      }
    });
    
    if (!existingTreatment) {
      return res.status(404).json({ error: 'Tratamento não encontrado' });
    }
    
    const toothTreatment = await prisma.toothTreatment.update({
      where: { id },
      data: {
        status,
        notes,
        datePerformed: datePerformed ? new Date(datePerformed) : undefined,
        price: price ? parseFloat(price) : undefined
      },
      include: {
        treatment: true
      }
    });
    
    res.json({ toothTreatment });
  } catch (error) {
    console.error('Erro ao atualizar tratamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover tratamento de um dente
app.delete('/api/tooth-treatments/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar se o tratamento pertence a um cliente da empresa
    const existingTreatment = await prisma.toothTreatment.findFirst({
      where: { 
        id,
        client: {
          companyId: req.user!.companyId
        }
      }
    });
    
    if (!existingTreatment) {
      return res.status(404).json({ error: 'Tratamento não encontrado' });
    }
    
    await prisma.toothTreatment.delete({
      where: { id }
    });
    
    res.json({ message: 'Tratamento removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover tratamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ENDPOINTS FINANCEIROS =====

// Visão geral financeira
app.get('/api/financial/overview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Define período padrão (mês atual se não especificado)
    const now = new Date();
    const start = startDate ? new Date(startDate as string) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Buscar agendamentos do período
    const appointments = await prisma.appointment.findMany({
      where: {
        companyId: req.user!.companyId,
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        client: true,
        service: {
          include: {
            serviceType: true
          }
        }
      }
    });
    
    // Calcular métricas
    let faturamentoRecebido = 0;
    let faturamentoEstimado = 0;
    let valorAReceber = 0;
    const formasPagamento = { dinheiro: 0, cartao: 0, pix: 0, transferencia: 0 };
    
    appointments.forEach(appointment => {
      const valor = appointment.service.price;
      
      if (appointment.status === 'COMPLETED') {
        faturamentoRecebido += valor;
        // Simular distribuição de formas de pagamento para agendamentos concluídos
        const random = Math.random();
        if (random < 0.4) formasPagamento.cartao += valor;
        else if (random < 0.7) formasPagamento.pix += valor;
        else if (random < 0.9) formasPagamento.dinheiro += valor;
        else formasPagamento.transferencia += valor;
      } else if (appointment.status === 'CONFIRMED' || appointment.status === 'PENDING') {
        faturamentoEstimado += valor;
        valorAReceber += valor;
      }
    });
    
    // Calcular lucro (assumindo margem de 70%)
    const despesas = faturamentoRecebido * 0.3;
    const lucroLiquido = faturamentoRecebido - despesas;
    
    // Crescimento mensal (mock - em implementação real seria comparação com mês anterior)
    const crescimentoMensal = 12.5;
    
    res.json({
      periodo: { inicio: start, fim: end },
      metricas: {
        faturamentoRecebido,
        faturamentoEstimado,
        valorAReceber,
        despesas,
        lucroLiquido,
        crescimentoMensal
      },
      formasPagamento,
      totalAgendamentos: appointments.length,
      agendamentosCompletados: appointments.filter(a => a.status === 'COMPLETED').length
    });
  } catch (error) {
    console.error('Erro ao buscar visão geral financeira:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Transações financeiras reais do novo sistema
app.get('/api/financial/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, status, type } = req.query;
    
    const whereClause: any = {
      companyId: req.user!.companyId
    };
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }
    
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        client: true,
        product: true,
        appointment: {
          include: {
            service: {
              include: {
                serviceType: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Transformar transações para o formato esperado pelo frontend
    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      data: t.createdAt,
      cliente: t.client.fullName,
      servico: t.type === 'PRODUCT' ? t.description || t.product?.name || 'Produto' : 
               t.description || t.appointment?.service.name || 'Serviço',
      categoria: t.type === 'PRODUCT' ? (t.product?.category || 'Produto') :
                 (t.appointment?.service.serviceType.name || 'Serviço'),
      valor: t.amount,
      status: t.status,
      tipo: t.type === 'SERVICE' || t.type === 'PRODUCT' ? 'receita' : 'despesa',
      formaPagamento: t.paymentMethod
    }));
    
    res.json({ transactions: formattedTransactions });
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Performance por serviço
app.get('/api/financial/services-performance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause: any = {
      companyId: req.user!.companyId,
      status: 'COMPLETED' // Apenas agendamentos concluídos
    };
    
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        service: {
          include: {
            serviceType: true
          }
        }
      }
    });
    
    // Agrupar por serviço
    const servicePerformance: { [key: string]: any } = {};
    
    appointments.forEach(appointment => {
      const serviceId = appointment.service.id;
      const serviceName = appointment.service.name;
      const serviceType = appointment.service.serviceType.name;
      const price = appointment.service.price;
      
      if (!servicePerformance[serviceId]) {
        servicePerformance[serviceId] = {
          id: serviceId,
          nome: serviceName,
          categoria: serviceType,
          totalAtendimentos: 0,
          receitaTotal: 0,
          precoMedio: price
        };
      }
      
      servicePerformance[serviceId].totalAtendimentos++;
      servicePerformance[serviceId].receitaTotal += price;
    });
    
    // Converter para array e ordenar por receita
    const performanceArray = Object.values(servicePerformance)
      .sort((a: any, b: any) => b.receitaTotal - a.receitaTotal);
    
    res.json({ 
      services: performanceArray,
      totalServices: performanceArray.length,
      topService: performanceArray[0] || null
    });
  } catch (error) {
    console.error('Erro ao buscar performance dos serviços:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Fluxo de caixa semanal
app.get('/api/financial/cash-flow', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Define período padrão (últimas 4 semanas se não especificado)
    const now = new Date();
    const start = startDate ? new Date(startDate as string) : new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : now;
    
    const appointments = await prisma.appointment.findMany({
      where: {
        companyId: req.user!.companyId,
        date: { gte: start, lte: end },
        status: 'COMPLETED'
      },
      include: {
        service: true
      },
      orderBy: { date: 'asc' }
    });
    
    // Agrupar por semana
    const weeklyFlow: { [key: string]: number } = {};
    
    appointments.forEach(appointment => {
      const date = new Date(appointment.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyFlow[weekKey]) {
        weeklyFlow[weekKey] = 0;
      }
      
      weeklyFlow[weekKey] += appointment.service.price;
    });
    
    // Converter para formato de array
    const flowData = Object.entries(weeklyFlow).map(([week, value]) => ({
      semana: week,
      receita: value
    }));
    
    res.json({ cashFlow: flowData });
  } catch (error) {
    console.error('Erro ao buscar fluxo de caixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ENDPOINTS DE PRODUTOS E TRANSAÇÕES =====

// Buscar dados do agendamento para finalização
app.get('/api/appointments/:id/details', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        companyId: req.user!.companyId
      },
      include: {
        client: true,
        service: true
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json({
      appointment: {
        id: appointment.id,
        client: {
          id: appointment.client.id,
          name: appointment.client.fullName
        },
        service: {
          id: appointment.service.id,
          name: appointment.service.name,
          price: appointment.service.price
        },
        date: appointment.date,
        status: appointment.status
      }
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Finalizar atendimento
app.post('/api/appointments/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { appointmentId, services, products, paymentMethod, notes, paymentStatus = 'PAID', paidAmount, dueDate } = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        companyId: req.user!.companyId
      },
      include: { client: true, service: true }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Cálculo de valores
    const totalService = services.reduce((sum: number, s: any) => sum + s.price, 0);
    const totalProducts = products?.reduce((sum: number, p: any) => sum + (p.salePrice * p.qty), 0) || 0;
    const total = totalService + totalProducts;

    // Validação de pagamento parcial
    if (paymentStatus === 'PARTIAL' && (!paidAmount || paidAmount >= total)) {
      return res.status(400).json({ error: 'Para pagamento parcial, informe o valor pago (menor que o total)' });
    }

    // Executar todas as operações em uma transação atômica
    await prisma.$transaction(async (tx) => {
      // Validar produtos dentro da transação: verificar empresa e estoque
      if (products && products.length > 0) {
        for (const p of products) {
          const product = await tx.product.findFirst({
            where: {
              id: p.id,
              companyId: req.user!.companyId
            }
          });

          if (!product) {
            throw new Error(`Produto ${p.name} não encontrado ou não pertence à empresa`);
          }

          if (product.stock < p.qty) {
            throw new Error(`Estoque insuficiente para o produto ${p.name}. Disponível: ${product.stock}`);
          }
        }
      }

      // Atualiza o agendamento
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'COMPLETED' }
      });

      // Registra transação(ões) baseado no status de pagamento
      if (paymentStatus === 'PAID') {
        // Pagamento completo - cria transação PAID
        await tx.transaction.create({
          data: {
            companyId: req.user!.companyId,
            appointmentId,
            clientId: appointment.clientId,
            amount: total,
            paymentMethod,
            status: 'PAID',
            type: 'SERVICE',
            description: services.map((s: any) => s.name).join(', '),
            paymentDate: new Date()
          }
        });
      } else if (paymentStatus === 'PENDING') {
        // Pagamento pendente - cria transação PENDING
        await tx.transaction.create({
          data: {
            companyId: req.user!.companyId,
            appointmentId,
            clientId: appointment.clientId,
            amount: total,
            paymentMethod,
            status: 'PENDING',
            type: 'SERVICE',
            description: services.map((s: any) => s.name).join(', '),
            dueDate: dueDate ? new Date(dueDate) : null
          }
        });
      } else if (paymentStatus === 'PARTIAL') {
        // Pagamento parcial - cria duas transações
        // 1. PAID para o valor pago (amount = apenas o que foi pago)
        await tx.transaction.create({
          data: {
            companyId: req.user!.companyId,
            appointmentId,
            clientId: appointment.clientId,
            amount: paidAmount,
            paymentMethod,
            status: 'PAID',
            type: 'SERVICE',
            description: `${services.map((s: any) => s.name).join(', ')} (Pagamento Parcial)`,
            paymentDate: new Date()
          }
        });
        
        // 2. PENDING para o valor restante
        await tx.transaction.create({
          data: {
            companyId: req.user!.companyId,
            appointmentId,
            clientId: appointment.clientId,
            amount: total - paidAmount,
            paymentMethod,
            status: 'PENDING',
            type: 'SERVICE',
            description: `${services.map((s: any) => s.name).join(', ')} (Saldo Pendente)`,
            dueDate: dueDate ? new Date(dueDate) : null
          }
        });
      }

      // Atualiza estoque e gera transações de produto
      for (const p of products || []) {
        // Atualização atômica com condição de estoque no where
        const updateResult = await tx.product.updateMany({
          where: { 
            id: p.id,
            companyId: req.user!.companyId,
            stock: { gte: p.qty }
          },
          data: { stock: { decrement: p.qty } }
        });

        // Se não atualizou nenhum registro, é porque estoque insuficiente
        if (updateResult.count === 0) {
          throw new Error(`Estoque insuficiente para o produto ${p.name}`);
        }

        await tx.transaction.create({
          data: {
            companyId: req.user!.companyId,
            productId: p.id,
            clientId: appointment.clientId,
            amount: p.salePrice * p.qty,
            paymentMethod,
            status: paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
            type: 'PRODUCT',
            description: `${p.name} (${p.qty}x)`,
            paymentDate: paymentStatus === 'PAID' ? new Date() : null,
            dueDate: paymentStatus !== 'PAID' && dueDate ? new Date(dueDate) : null
          }
        });
      }

      // Registra histórico
      await tx.record.create({
        data: {
          companyId: req.user!.companyId,
          appointmentId,
          clientId: appointment.clientId,
          services: JSON.stringify(services),
          products: products ? JSON.stringify(products) : null,
          notes
        }
      });

      // Registra histórico no AppointmentHistory para histórico do cliente
      await tx.appointmentHistory.create({
        data: {
          appointmentId,
          clientId: appointment.clientId,
          companyId: req.user!.companyId,
          date: appointment.date,
          servicesData: JSON.stringify(services),
          productsData: products ? JSON.stringify(products) : JSON.stringify([]),
          paymentMethod,
          totalValue: total,
          status: paymentStatus,
          notes
        }
      });
    });

    res.json({ success: true, message: 'Atendimento finalizado com sucesso' });
  } catch (error) {
    console.error('Erro ao finalizar atendimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar histórico de atendimentos de um cliente
app.get('/api/clients/:clientId/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;

    // Verificar se o cliente pertence à empresa do usuário
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId: req.user!.companyId
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Buscar histórico de atendimentos
    const history = await prisma.appointmentHistory.findMany({
      where: {
        clientId,
        companyId: req.user!.companyId
      },
      orderBy: { date: 'desc' }
    });

    // Parsear os dados JSON
    const formattedHistory = history.map(h => ({
      ...h,
      servicesData: JSON.parse(h.servicesData),
      productsData: JSON.parse(h.productsData)
    }));

    res.json({ history: formattedHistory });
  } catch (error) {
    console.error('Erro ao buscar histórico do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// CRUD de Produtos

// Listar produtos
app.get('/api/products', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { 
        companyId: req.user!.companyId,
        active: true 
      },
      orderBy: { name: 'asc' }
    });
    res.json({ products });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar produto
app.post('/api/products', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, costPrice, salePrice, stock } = req.body;
    
    if (!name || costPrice === undefined || salePrice === undefined) {
      return res.status(400).json({ error: 'Nome, preço de custo e preço de venda são obrigatórios' });
    }

    const product = await prisma.product.create({
      data: {
        companyId: req.user!.companyId,
        name,
        category: category || null,
        costPrice: parseFloat(costPrice),
        salePrice: parseFloat(salePrice),
        stock: parseInt(stock) || 0
      }
    });

    res.json({ product });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar produto
app.put('/api/products/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, costPrice, salePrice, stock } = req.body;

    // Verificar se produto pertence à empresa
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id,
        companyId: req.user!.companyId 
      }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        category,
        costPrice: parseFloat(costPrice),
        salePrice: parseFloat(salePrice),
        stock: parseInt(stock)
      }
    });

    res.json({ product });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar produto
app.delete('/api/products/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se produto pertence à empresa
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id,
        companyId: req.user!.companyId 
      }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Soft delete
    await prisma.product.update({
      where: { id },
      data: { active: false }
    });

    res.json({ success: true, message: 'Produto removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Análise financeira de produtos
app.get('/api/products/financial-analysis', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause: any = {
      companyId: req.user!.companyId,
      type: 'PRODUCT',
      status: 'PAID'
    };

    // Filtro de datas independentes
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate as string);
      }
    }

    // Buscar todas as transações de produtos
    const productTransactions = await prisma.transaction.findMany({
      where: whereClause,
      include: { product: true }
    });

    // Agrupar por produto
    const productAnalysis: any = {};
    let totalRevenue = 0;
    let totalCost = 0;

    productTransactions.forEach(t => {
      if (!t.product) return;

      const productId = t.product.id;
      // Converter Prisma Decimal para número
      const amount = Number(t.amount);
      const salePrice = Number(t.product.salePrice);
      const costPrice = Number(t.product.costPrice);
      
      const qty = amount / salePrice;
      const cost = costPrice * qty;

      if (!productAnalysis[productId]) {
        productAnalysis[productId] = {
          id: productId,
          name: t.product.name,
          category: t.product.category,
          quantitySold: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        };
      }

      productAnalysis[productId].quantitySold += qty;
      productAnalysis[productId].revenue += amount;
      productAnalysis[productId].cost += cost;
      productAnalysis[productId].profit = productAnalysis[productId].revenue - productAnalysis[productId].cost;

      totalRevenue += amount;
      totalCost += cost;
    });

    const products = Object.values(productAnalysis).sort((a: any, b: any) => b.profit - a.profit);
    const totalProfit = totalRevenue - totalCost;

    res.json({
      products,
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Erro ao buscar análise financeira de produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório Financeiro - Visão por tipo
app.get('/api/financial/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const now = new Date();

    const transactionWhereClause: any = {
      companyId: req.user!.companyId,
      status: 'PAID'
    };

    if (startDate && endDate) {
      transactionWhereClause.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // === RECEITAS REALIZADAS (Transações pagas) ===
    const services = await prisma.transaction.aggregate({
      where: { ...transactionWhereClause, type: 'SERVICE' },
      _sum: { amount: true }
    });

    const products = await prisma.transaction.aggregate({
      where: { ...transactionWhereClause, type: 'PRODUCT' },
      _sum: { amount: true }
    });

    const productTransactions = await prisma.transaction.findMany({
      where: { ...transactionWhereClause, type: 'PRODUCT' },
      include: { product: true }
    });

    let custoProdutos = 0;
    productTransactions.forEach(t => {
      if (t.product) {
        const qty = t.amount / t.product.salePrice;
        custoProdutos += t.product.costPrice * qty;
      }
    });

    const totalServicos = services._sum.amount || 0;
    const totalProdutos = products._sum.amount || 0;
    const lucroProdutos = totalProdutos - custoProdutos;
    const receitasRealizadas = totalServicos + totalProdutos;
    const lucroTotal = totalServicos + lucroProdutos;

    // === RECEITAS FUTURAS (Agendamentos pendentes/confirmados FUTUROS) ===
    const appointmentsWhereClause: any = {
      companyId: req.user!.companyId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: { gte: now } // Apenas agendamentos futuros
    };

    // Se houver filtro de datas, aplicar também
    if (startDate && endDate) {
      appointmentsWhereClause.date = {
        gte: new Date(Math.max(now.getTime(), new Date(startDate as string).getTime())),
        lte: new Date(endDate as string)
      };
    }

    const futureAppointments = await prisma.appointment.aggregate({
      where: appointmentsWhereClause,
      _sum: { totalValue: true }
    });

    const receitasFuturas = futureAppointments._sum.totalValue || 0;

    // === ATRASADOS (Agendamentos vencidos sem finalização) ===
    const overdueWhereClause: any = {
      companyId: req.user!.companyId,
      date: { lt: now },
      status: { notIn: ['COMPLETED', 'CANCELLED', 'RESCHEDULED'] }
    };

    // Aplicar filtro de datas se especificado
    if (startDate && endDate) {
      overdueWhereClause.date = {
        gte: new Date(startDate as string),
        lt: new Date(Math.min(now.getTime(), new Date(endDate as string).getTime()))
      };
    }

    const overdueAppointments = await prisma.appointment.aggregate({
      where: overdueWhereClause,
      _sum: { totalValue: true }
    });

    const atrasados = overdueAppointments._sum.totalValue || 0;

    res.json({
      // Receitas Realizadas
      totalServicos,
      totalProdutos,
      custoProdutos,
      lucroProdutos,
      receitasRealizadas,
      lucroTotal,
      margemLucro: receitasRealizadas > 0 ? ((lucroTotal / receitasRealizadas) * 100).toFixed(2) : 0,
      
      // Receitas Futuras
      receitasFuturas,
      
      // Atrasados
      atrasados,
      
      // Total Geral (realizadas + futuras)
      totalGeral: receitasRealizadas + receitasFuturas
    });
  } catch (error) {
    console.error('Erro ao buscar resumo financeiro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar transações financeiras
app.get('/api/financial/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, type, status } = req.query;

    const whereClause: any = {
      companyId: req.user!.companyId
    };

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (type) {
      whereClause.type = type;
    }

    if (status) {
      whereClause.status = status;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            fullName: true
          }
        },
        appointment: {
          include: {
            service: {
              include: {
                serviceType: true
              }
            }
          }
        },
        product: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      data: t.createdAt.toISOString(),
      cliente: t.client.fullName,
      servico: t.description || (t.appointment?.service?.name) || (t.product?.name) || 'N/A',
      categoria: t.appointment?.service?.serviceType?.name || t.type,
      valor: t.amount,
      status: t.status,
      tipo: t.type === 'SERVICE' || t.type === 'PRODUCT' ? 'receita' : 'despesa',
      formaPagamento: t.paymentMethod
    }));

    res.json({ transactions: formattedTransactions });
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registrar pagamento de transação pendente
app.post('/api/transactions/:id/pay', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar transação e verificar se pertence à empresa
    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        companyId: req.user!.companyId
      },
      include: {
        client: true,
        appointment: true
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    // Verificar se já está paga
    if (transaction.status === 'PAID') {
      return res.status(400).json({ error: 'Transação já está paga' });
    }

    // Atualizar transação para PAID
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'PAID',
        paymentDate: new Date()
      },
      include: {
        client: true,
        appointment: true
      }
    });

    res.json({ 
      success: true, 
      message: 'Pagamento registrado com sucesso',
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DEBUG: Endpoint temporário para verificar agendamentos e transações
app.get('/api/debug/samuel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        companyId: req.user!.companyId,
        client: {
          fullName: {
            contains: 'Samuel'
          }
        }
      },
      include: {
        client: true,
        service: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const transactions = await prisma.transaction.findMany({
      where: {
        companyId: req.user!.companyId,
        client: {
          fullName: {
            contains: 'Samuel'
          }
        }
      },
      include: {
        client: true,
        appointment: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      message: 'Debug do Samuel',
      appointments: appointments.map(a => ({
        id: a.id,
        status: a.status,
        date: a.date,
        startTime: a.startTime,
        cliente: a.client.fullName,
        servico: a.service.name,
        valor: a.service.price
      })),
      transactions: transactions.map(t => ({
        id: t.id,
        status: t.status,
        amount: t.amount,
        type: t.type,
        paymentMethod: t.paymentMethod,
        appointmentId: t.appointmentId,
        cliente: t.client.fullName
      })),
      problema: appointments.length > 0 && transactions.length === 0 
        ? '⚠️ PROBLEMA: Existe agendamento mas NÃO existe transação!'
        : appointments.length === 0
        ? 'Nenhum agendamento encontrado para Samuel'
        : '✅ OK: Agendamento tem transação correspondente'
    });
  } catch (error) {
    console.error('Erro no debug:', error);
    res.status(500).json({ error: 'Erro no debug', details: error });
  }
});

// Rotas de autenticação
app.use('/api/auth', authRoutes);

// Rotas do WhatsApp (webhook Twilio - sem autenticação) - DEVE vir antes das rotas com wildcard /api
app.use('/api/whatsapp', whatsappRoutes);

// Rotas de disponibilidade (calendário dinâmico)
app.use('/api/availability', availabilityRoutes);

// Rotas de documentos
app.use('/api', documentRoutes);

// Rotas de notas clínicas (com autenticação)
app.use('/api', authMiddleware, clinicalNotesRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor Agendoor rodando na porta ${PORT}`);
  
  // Executa schedulers a cada 1 hora
  console.log('⏰ Iniciando sistema de lembretes automáticos...');
  
  // Executa imediatamente na inicialização
  runSchedulers().catch(err => console.error('❌ Erro no scheduler inicial:', err));
  
  // Depois executa a cada 1 hora (3600000ms)
  setInterval(() => {
    runSchedulers().catch(err => console.error('❌ Erro no scheduler:', err));
  }, 3600000);
  
  console.log('✅ Sistema de lembretes configurado (executa a cada 1h)');
});