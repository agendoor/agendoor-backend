"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../config/prisma"));
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const payload = jsonwebtoken_1.default.verify(token, jwtSecret);
        const user = await prisma_1.default.user.findUnique({
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
    }
    catch (error) {
        console.error('Erro de autenticação:', error);
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
};
exports.authMiddleware = authMiddleware;
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        if (token) {
            const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
            const payload = jsonwebtoken_1.default.verify(token, jwtSecret);
            const user = await prisma_1.default.user.findUnique({
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
    }
    catch (error) {
        console.error('Token inválido (opcional):', error);
    }
    next();
};
exports.optionalAuth = optionalAuth;
