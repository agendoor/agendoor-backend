import { Request, Response } from 'express';
import { authService } from './auth.service';
import { AuthRequest } from '../../middleware/auth';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body);
      
      res.status(201).json({
        message: 'Cadastro realizado com sucesso',
        user: {
          id: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email
        },
        company: {
          id: result.company.id,
          name: result.company.name
        }
      });
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      
      if (error.message === 'Email já cadastrado') {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Erro ao realizar cadastro' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const result = await authService.login({ email, password });
      
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
      res.json({
        message: 'Login realizado com sucesso',
        token: result.token,
        user: result.user
      });
    } catch (error: any) {
      console.error('Erro no login:', error);
      
      if (error.message === 'Credenciais inválidas') {
        return res.status(401).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Erro ao realizar login' });
    }
  }

  async validateToken(req: AuthRequest, res: Response) {
    try {
      const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      const user = await authService.validateToken(token);
      
      res.json({ user });
    } catch (error: any) {
      console.error('Erro ao validar token:', error);
      res.status(401).json({ error: 'Token inválido' });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      res.clearCookie('token');
      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      console.error('Erro no logout:', error);
      res.status(500).json({ error: 'Erro ao realizar logout' });
    }
  }

  async me(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      const user = await authService.validateToken(token);
      res.json({ user });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
  }
}

export const authController = new AuthController();
