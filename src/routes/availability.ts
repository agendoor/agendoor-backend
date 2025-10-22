import express from "express";
import { getCalendarAvailability, getAvailableSlots } from "../utils/calendar";
import prisma from "../config/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = express.Router();

// Aplicar authMiddleware a todas as rotas neste router
router.use(authMiddleware);

/**
 * GET /api/availability/calendar
 * Retorna calendário com disponibilidade
 */
router.get("/calendar", async (req: AuthRequest, res) => {
  try {
    const { serviceId, daysAhead } = req.query;
    const companyId = req.user?.companyId; // Obter companyId do usuário autenticado

    if (!companyId) {
      return res.status(401).json({ error: "companyId não encontrado no usuário autenticado." });
    }

    if (!serviceId) {
      return res.status(400).json({ 
        error: "serviceId é obrigatório" 
      });
    }

    const days = parseInt(daysAhead as string) || 30;
    const calendar = await getCalendarAvailability(
      companyId,
      serviceId as string,
      days
    );

    res.json({ calendar });
  } catch (error: any) {
    console.error("❌ Erro ao buscar calendário:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/availability/slots
 * Retorna horários disponíveis para uma data específica
 */
router.get("/slots", async (req: AuthRequest, res) => {
  try {
    const { serviceId, date } = req.query;
    const companyId = req.user?.companyId; // Obter companyId do usuário autenticado

    if (!companyId) {
      return res.status(401).json({ error: "companyId não encontrado no usuário autenticado." });
    }

    if (!serviceId || !date) {
      return res.status(400).json({ 
        error: "serviceId e date são obrigatórios" 
      });
    }

    const slots = await getAvailableSlots(
      companyId,
      serviceId as string,
      new Date(date as string)
    );

    res.json({ slots });
  } catch (error: any) {
    console.error("❌ Erro ao buscar slots:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/availability/services
 * Lista serviços ativos da empresa
 */
router.get("/services", async (req: AuthRequest, res) => {
  try {
    const companyId = req.user?.companyId; // Obter companyId do usuário autenticado

    if (!companyId) {
      return res.status(401).json({ error: "companyId não encontrado no usuário autenticado." });
    }

    const services = await prisma.service.findMany({
      where: {
        companyId: companyId,
        active: true
      },
      select: {
        id: true,
        name: true,
        duration: true,
        price: true,
        description: true
      }
    });

    res.json({ services });
  } catch (error: any) {
    console.error("❌ Erro ao buscar serviços:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

