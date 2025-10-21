import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
    companyId: string;
  };
  body: any;
  params: any;
  query: any;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const payload = jwt.verify(token, jwtSecret) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: payload.id || payload.userId },
      include: { company: true }
    });
    
    if (!user || !user.company) {
      return res.status(401).json({ error: 'Usuário ou empresa não encontrados' });
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company.id
    };
    
    next();
  } catch (error) {
    console.error('Erro de autenticação:', error);
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (token) {
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      const payload = jwt.verify(token, jwtSecret) as any;
      
      const user = await prisma.user.findUnique({
        where: { id: payload.id || payload.userId },
        include: { company: true }
      });
      
      if (user && user.company) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.company.id
        };
      }
    }
  } catch (error) {
    console.error('Token inválido (opcional):', error);
  }
  
  next();
};
