import prisma from '../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

interface RegisterDTO {
  fullName: string;
  email: string;
  phone: string;
  password: string;
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
}

interface LoginDTO {
  email: string;
  password: string;
}

export class AuthService {
  async register(dto: RegisterDTO) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
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
          passwordHash,
          cep: dto.cep,
          street: dto.street,
          number: dto.number,
          complement: dto.complement,
          neighborhood: dto.neighborhood,
          city: dto.city,
          state: dto.state
        }
      });
      
      console.log('Usuário criado com sucesso:', { id: user.id, email: user.email });

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

  async login(dto: LoginDTO) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    
    console.log('Tentativa de login:', normalizedEmail);
    
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        company: {
          include: {
            businessType: true
          }
        }
      }
    });

    if (!user) {
      console.log('Usuário não encontrado:', normalizedEmail);
      throw new Error('Credenciais inválidas');
    }

    console.log('Usuário encontrado:', { id: user.id, email: user.email });
    
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      console.log('Senha inválida para o usuário:', normalizedEmail);
      throw new Error('Credenciais inválidas');
    }
    
    console.log('Login bem-sucedido:', normalizedEmail);

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        company: user.company
      }
    };
  }

  async validateToken(token: string) {
    try {
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      const payload = jwt.verify(token, jwtSecret) as any;
      
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        include: {
          company: {
            include: {
              businessType: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        company: user.company
      };
    } catch (error) {
      throw new Error('Token inválido');
    }
  }
}

export const authService = new AuthService();
