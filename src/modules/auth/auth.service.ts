import prisma from '../../config/prisma';
import bcrypt from 'bcrypt'; // Manter para hashing de senhas existentes se houver migração, ou remover se todas as senhas forem gerenciadas pelo Firebase
// import jwt from 'jsonwebtoken'; // Remover se a autenticação for totalmente baseada em Firebase ID Token

interface RegisterDTO {
  fullName: string;
  email: string;
  phone: string;
  password?: string; // Senha é opcional, pois o Firebase a gerencia
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  companyName: string;
  companyPhone: string;
  companyCep: string;
  companyStreet: string;
  companyNumber: string;
  companyComplement?: string;
  companyNeighborhood: string;
  companyCity: string;
  companyState: string;
  businessTypeId?: string;
  businessDays: number[];
  plan: string;
  firebaseUid: string; // Adiciona o UID do Firebase
}

interface LoginDTO {
  idToken: string; // O token do Firebase é recebido aqui
}

export class AuthService {
  async register(dto: RegisterDTO) {
    // A senha é gerenciada pelo Firebase, não precisamos fazer hash aqui.
    // No entanto, se o campo passwordHash ainda existir no modelo User do Prisma,
    // podemos armazenar um valor placeholder ou remover completamente o campo.
    // Por enquanto, vamos usar um hash vazio ou remover o passwordHash do User model se não for mais necessário.
    // Para simplificar, vou remover o hashing aqui e assumir que o Firebase gerencia a senha.
    // const passwordHash = await bcrypt.hash(dto.password, 10);
    const normalizedEmail = dto.email.toLowerCase().trim();

    return prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: normalizedEmail }
      });

      if (existingUser) {
        throw new Error('Email já cadastrado');
      }

      const user = await tx.user.create({
        data: {
          fullName: dto.fullName,
          email: normalizedEmail,
          phone: dto.phone,
          // passwordHash: passwordHash, // Remover ou ajustar conforme o modelo User
          firebaseUid: dto.firebaseUid, // Salva o UID do Firebase
          cep: dto.cep,
          street: dto.street,
          number: dto.number,
          complement: dto.complement,
          neighborhood: dto.neighborhood,
          city: dto.city,
          state: dto.state
        }
      });
      
      console.log('Usuário criado com sucesso:', { id: user.id, email: user.email, firebaseUid: user.firebaseUid });

      const company = await tx.company.create({
        data: {
          ownerId: user.id,
          name: dto.companyName,
          phone: dto.companyPhone,
          businessTypeId: dto.businessTypeId,
          cep: dto.companyCep,
          street: dto.companyStreet,
          number: dto.companyNumber,
          complement: dto.companyComplement,
          neighborhood: dto.companyNeighborhood,
          city: dto.companyCity,
          state: dto.companyState
        }
      });

      let planId = dto.plan || 'basic';
      
      const planExists = await tx.plan.findUnique({
        where: { id: planId }
      });
      
      if (!planExists) {
        const defaultPlan = await tx.plan.findFirst({
          where: { active: true },
          orderBy: { sortOrder: 'asc' }
        });
        
        if (!defaultPlan) {
          throw new Error('Nenhum plano disponível no sistema');
        }
        
        planId = defaultPlan.id;
      }

      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          companyId: company.id,
          planId: planId,
          status: 'ACTIVE'
        }
      });

      if (dto.businessDays && dto.businessDays.length > 0) {
        const weekDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
        
        await Promise.all(
          dto.businessDays.map((dayIndex) => 
            tx.companyBusinessDay.create({
              data: {
                companyId: company.id,
                day: weekDays[dayIndex],
                enabled: true
              }
            })
          )
        );
      }

      return { user, company, subscription };
    });
  }

  async getUserByFirebaseUid(firebaseUid: string) {
    return prisma.user.findUnique({
      where: { firebaseUid: firebaseUid },
      include: {
        company: {
          include: {
            businessType: true
          }
        }
      }
    });
  }

  // A função login não é mais necessária, pois o Firebase lida com a autenticação de senha.
  // O backend apenas precisa validar o idToken e buscar o usuário no banco de dados local.
  async login(dto: LoginDTO) {
    // Esta função não será mais chamada diretamente, mas mantida para evitar erros de compilação por enquanto.
    // A lógica de login agora está no authController que usa getUserByFirebaseUid.
    throw new Error('Função de login do serviço não deve ser chamada diretamente após integração Firebase.');
  }

  // validateToken e logout não são mais necessários aqui, pois o Firebase e o middleware lidam com isso.
  async validateToken(token: string) {
    throw new Error('validateToken do serviço não deve ser chamado diretamente após integração Firebase.');
  }
}

export const authService = new AuthService();

