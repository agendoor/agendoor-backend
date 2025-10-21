import express from "express";
import { getCalendarAvailability, getAvailableSlots } from "../utils/calendar";
import prisma from "../prisma";

const router = express.Router();

/**
 * GET /api/availability/calendar
 * Retorna calendário com disponibilidade
 */
router.get("/calendar", async (req, res) => {
  try {
    const { companyId, serviceId, daysAhead } = req.query;

    if (!companyId || !serviceId) {
      return res.status(400).json({ 
        error: "companyId e serviceId são obrigatórios" 
      });
    }

    const days = parseInt(daysAhead as string) || 30;
    const calendar = await getCalendarAvailability(
      companyId as string,
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
router.get("/slots", async (req, res) => {
  try {
    const { companyId, serviceId, date } = req.query;

    if (!companyId || !serviceId || !date) {
      return res.status(400).json({ 
        error: "companyId, serviceId e date são obrigatórios" 
      });
    }

    const slots = await getAvailableSlots(
      companyId as string,
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
router.get("/services", async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: "companyId é obrigatório" });
    }

    const services = await prisma.service.findMany({
      where: {
        companyId: companyId as string,
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
