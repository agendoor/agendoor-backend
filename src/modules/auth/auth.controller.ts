import { Request, Response } from 'express';
import { authService } from './auth.service';
import { AuthRequest } from '../../middleware/auth';
import { admin } from '../../config/firebaseAdmin'; // Importa o Firebase Admin SDK

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { idToken, ...userData } = req.body; // Recebe o idToken do Firebase e outros dados do usuário

      if (!idToken) {
        return res.status(400).json({ error: 'Firebase ID Token não fornecido para registro' });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const firebaseUid = decodedToken.uid;

      const result = await authService.register({ ...userData, firebaseUid });
      
      res.status(201).json({
        message: 'Cadastro realizado com sucesso',
        user: {
          id: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          firebaseUid: result.user.firebaseUid, // Inclui o firebaseUid no retorno
        },
        company: {
          id: result.company.id,
          name: result.company.name,
        },
        token: idToken, // Retorna o idToken do Firebase para o frontend
      });
    } catch (error: any) {
      console.error('Erro no cadastro com Firebase:', error);
      
      if (error.message === 'Email já cadastrado') {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Erro ao realizar cadastro com Firebase' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { idToken } = req.body; // Recebe o idToken do Firebase

      if (!idToken) {
        return res.status(400).json({ error: 'Firebase ID Token não fornecido para login' });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const firebaseUid = decodedToken.uid;

      const user = await authService.getUserByFirebaseUid(firebaseUid); // Busca o usuário no DB local

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado no banco de dados local' });
      }

      res.json({
        message: 'Login realizado com sucesso',
        token: idToken, // Retorna o idToken do Firebase
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          firebaseUid: user.firebaseUid,
          company: user.company ? { id: user.company.id, name: user.company.name } : undefined,
        }
      });
    } catch (error: any) {
      console.error('Erro no login com Firebase:', error);
      res.status(401).json({ error: 'Firebase ID Token inválido ou expirado' });
    }
  }

  // A rota de logout não é mais necessária no backend, pois o Firebase gerencia a sessão no frontend.
  async logout(req: Request, res: Response) {
    res.status(200).json({ message: 'Logout handled by Firebase on frontend' });
  }

  // A rota validateToken não é mais necessária, a validação é feita pelo middleware authMiddleware
  async validateToken(req: AuthRequest, res: Response) {
    // O middleware authMiddleware já validou o token e populou req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    res.json({ user: req.user });
  }

  async me(req: AuthRequest, res: Response) {
    // O middleware authMiddleware já validou o token e populou req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    res.json({ user: req.user });
  }
}

export const authController = new AuthController();

