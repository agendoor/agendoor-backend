import { Request, Response, NextFunction } from 'express';
import { admin } from '../config/firebaseAdmin'; // Importa o Firebase Admin SDK
import prisma from '../config/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
    companyId: string;
    firebaseUid?: string; // Adiciona o UID do Firebase
  };
  body: any;
  params: any;
  query: any;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const idToken = req.headers.authorization?.split(' ')[1];

    if (!idToken) {
      return res.status(401).json({ error: 'Firebase ID Token não fornecido' });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // Tenta encontrar o usuário no banco de dados local com base no firebaseUid
    let user = await prisma.user.findUnique({
      where: { firebaseUid: firebaseUid },
      include: { company: true }
    });

    // Se o usuário não existe no nosso banco de dados, mas é um usuário Firebase válido,
    // podemos criar um perfil básico para ele aqui ou em uma rota de registro separada.
    // Por enquanto, vamos retornar um erro se não encontrarmos o usuário.
    if (!user || !user.company) {
      // Isso pode acontecer se o usuário se registrou no Firebase, mas não completou o registro no nosso backend
      return res.status(401).json({ error: 'Usuário não encontrado no banco de dados local ou sem empresa associada' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company.id,
      firebaseUid: firebaseUid,
    };

    next();
  } catch (error) {
    console.error('Erro de autenticação Firebase:', error);
    return res.status(401).json({ error: 'Firebase ID Token inválido ou expirado' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const idToken = req.headers.authorization?.split(' ')[1];

    if (idToken) {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const firebaseUid = decodedToken.uid;

      let user = await prisma.user.findUnique({
        where: { firebaseUid: firebaseUid },
        include: { company: true }
      });

      if (user && user.company) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.company.id,
          firebaseUid: firebaseUid,
        };
      }
    }
  } catch (error) {
    console.error('Firebase ID Token inválido (opcional):', error);
  }

  next();
};
