"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Validar dentes FDI (11-18, 21-28, 31-38, 41-48)
const validFDITeeth = [
    11, 12, 13, 14, 15, 16, 17, 18,
    21, 22, 23, 24, 25, 26, 27, 28,
    31, 32, 33, 34, 35, 36, 37, 38,
    41, 42, 43, 44, 45, 46, 47, 48
];
function isValidTooth(tooth) {
    return validFDITeeth.includes(tooth);
}
// GET /api/clients/:clientId/notes - Listar notas de um cliente
router.get('/clients/:clientId/notes', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type } = req.query;
        const companyId = req.user.companyId;
        // Verificar se o cliente pertence à empresa
        const client = await prisma_1.default.client.findFirst({
            where: { id: clientId, companyId }
        });
        if (!client) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        // Buscar notas
        const notes = await prisma_1.default.clinicalNote.findMany({
            where: {
                clientId,
                companyId,
                ...(type && { type: type })
            },
            orderBy: { createdAt: 'desc' },
            include: {
                appointment: {
                    select: {
                        id: true,
                        date: true,
                        startTime: true,
                        service: { select: { name: true } }
                    }
                }
            }
        });
        res.json({ notes });
    }
    catch (error) {
        console.error('Erro ao buscar notas clínicas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
// POST /api/clients/:clientId/notes - Criar nota clínica
router.post('/clients/:clientId/notes', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { type, title, content, meta, appointmentId } = req.body;
        const companyId = req.user.companyId;
        const userId = req.user.id;
        // Validações
        if (!type || !content) {
            return res.status(400).json({ error: 'Tipo e conteúdo são obrigatórios' });
        }
        // Verificar se o cliente pertence à empresa
        const client = await prisma_1.default.client.findFirst({
            where: { id: clientId, companyId }
        });
        if (!client) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        // Se houver meta com tooth, validar
        if (meta) {
            const parsedMeta = typeof meta === 'string' ? JSON.parse(meta) : meta;
            if (parsedMeta.tooth && !isValidTooth(parsedMeta.tooth)) {
                return res.status(400).json({ error: 'Número do dente inválido (FDI: 11-48)' });
            }
        }
        // Se houver appointmentId, verificar se pertence à empresa
        if (appointmentId) {
            const appointment = await prisma_1.default.appointment.findFirst({
                where: { id: appointmentId, companyId }
            });
            if (!appointment) {
                return res.status(404).json({ error: 'Agendamento não encontrado' });
            }
        }
        // Criar nota
        const note = await prisma_1.default.clinicalNote.create({
            data: {
                companyId,
                clientId,
                appointmentId: appointmentId || null,
                type,
                title,
                content,
                meta: meta ? JSON.stringify(meta) : null,
                createdBy: userId
            },
            include: {
                appointment: {
                    select: {
                        id: true,
                        date: true,
                        startTime: true,
                        service: { select: { name: true } }
                    }
                }
            }
        });
        res.status(201).json({ note });
    }
    catch (error) {
        console.error('Erro ao criar nota clínica:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
// PUT /api/clients/:clientId/notes/:noteId - Atualizar nota clínica
router.put('/clients/:clientId/notes/:noteId', async (req, res) => {
    try {
        const { clientId, noteId } = req.params;
        const { title, content, meta } = req.body;
        const companyId = req.user.companyId;
        // Verificar se a nota existe e pertence à empresa
        const existingNote = await prisma_1.default.clinicalNote.findFirst({
            where: { id: noteId, clientId, companyId }
        });
        if (!existingNote) {
            return res.status(404).json({ error: 'Nota não encontrada' });
        }
        // Se houver meta com tooth, validar
        if (meta) {
            const parsedMeta = typeof meta === 'string' ? JSON.parse(meta) : meta;
            if (parsedMeta.tooth && !isValidTooth(parsedMeta.tooth)) {
                return res.status(400).json({ error: 'Número do dente inválido (FDI: 11-48)' });
            }
        }
        // Atualizar nota
        const note = await prisma_1.default.clinicalNote.update({
            where: { id: noteId },
            data: {
                title,
                content,
                meta: meta ? JSON.stringify(meta) : existingNote.meta
            },
            include: {
                appointment: {
                    select: {
                        id: true,
                        date: true,
                        startTime: true,
                        service: { select: { name: true } }
                    }
                }
            }
        });
        res.json({ note });
    }
    catch (error) {
        console.error('Erro ao atualizar nota clínica:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
// DELETE /api/clients/:clientId/notes/:noteId - Deletar nota clínica
router.delete('/clients/:clientId/notes/:noteId', async (req, res) => {
    try {
        const { clientId, noteId } = req.params;
        const companyId = req.user.companyId;
        // Verificar se a nota existe e pertence à empresa
        const existingNote = await prisma_1.default.clinicalNote.findFirst({
            where: { id: noteId, clientId, companyId }
        });
        if (!existingNote) {
            return res.status(404).json({ error: 'Nota não encontrada' });
        }
        // Deletar nota
        await prisma_1.default.clinicalNote.delete({
            where: { id: noteId }
        });
        res.json({ message: 'Nota excluída com sucesso' });
    }
    catch (error) {
        console.error('Erro ao excluir nota clínica:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
// GET /api/clients/:clientId/odontograma - Agregação por dente
router.get('/clients/:clientId/odontograma', async (req, res) => {
    try {
        const { clientId } = req.params;
        const companyId = req.user.companyId;
        // Verificar se o cliente pertence à empresa
        const client = await prisma_1.default.client.findFirst({
            where: { id: clientId, companyId }
        });
        if (!client) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        // Buscar todas as notas do tipo ODONTOGRAM_ENTRY
        const odontogramNotes = await prisma_1.default.clinicalNote.findMany({
            where: {
                clientId,
                companyId,
                type: 'ODONTOGRAM_ENTRY'
            },
            orderBy: { createdAt: 'desc' }
        });
        // Agrupar por dente
        const teethData = {};
        for (const note of odontogramNotes) {
            if (note.meta) {
                const meta = JSON.parse(note.meta);
                if (meta.tooth) {
                    if (!teethData[meta.tooth]) {
                        teethData[meta.tooth] = {
                            tooth: meta.tooth,
                            lastProcedure: {
                                type: meta.procedureType || 'Não especificado',
                                title: note.title,
                                content: note.content,
                                date: note.createdAt
                            },
                            count: 1,
                            procedures: [note]
                        };
                    }
                    else {
                        teethData[meta.tooth].count++;
                        teethData[meta.tooth].procedures.push(note);
                    }
                }
            }
        }
        res.json({ teeth: Object.values(teethData) });
    }
    catch (error) {
        console.error('Erro ao buscar odontograma:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
// POST /api/appointments/:id/notes - Criar nota vinculada ao appointment
router.post('/appointments/:id/notes', async (req, res) => {
    try {
        const { id: appointmentId } = req.params;
        const { type, title, content, meta } = req.body;
        const companyId = req.user.companyId;
        const userId = req.user.id;
        // Verificar se o appointment existe e pertence à empresa
        const appointment = await prisma_1.default.appointment.findFirst({
            where: { id: appointmentId, companyId }
        });
        if (!appointment) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }
        // Validações
        if (!type || !content) {
            return res.status(400).json({ error: 'Tipo e conteúdo são obrigatórios' });
        }
        // Se houver meta com tooth, validar
        if (meta) {
            const parsedMeta = typeof meta === 'string' ? JSON.parse(meta) : meta;
            if (parsedMeta.tooth && !isValidTooth(parsedMeta.tooth)) {
                return res.status(400).json({ error: 'Número do dente inválido (FDI: 11-48)' });
            }
        }
        // Criar nota
        const note = await prisma_1.default.clinicalNote.create({
            data: {
                companyId,
                clientId: appointment.clientId,
                appointmentId,
                type,
                title,
                content,
                meta: meta ? JSON.stringify(meta) : null,
                createdBy: userId
            },
            include: {
                appointment: {
                    select: {
                        id: true,
                        date: true,
                        startTime: true,
                        service: { select: { name: true } }
                    }
                }
            }
        });
        res.status(201).json({ note });
    }
    catch (error) {
        console.error('Erro ao criar nota vinculada ao appointment:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
// GET /api/clients/:clientId/history - Histórico agregado
router.get('/clients/:clientId/history', async (req, res) => {
    try {
        const { clientId } = req.params;
        const companyId = req.user.companyId;
        // Verificar se o cliente pertence à empresa
        const client = await prisma_1.default.client.findFirst({
            where: { id: clientId, companyId }
        });
        if (!client) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        // Buscar notas clínicas
        const clinicalNotes = await prisma_1.default.clinicalNote.findMany({
            where: { clientId, companyId },
            include: {
                appointment: {
                    select: {
                        id: true,
                        date: true,
                        startTime: true,
                        service: { select: { name: true } }
                    }
                }
            }
        });
        // Buscar histórico de appointments
        const appointmentHistory = await prisma_1.default.appointmentHistory.findMany({
            where: { clientId, companyId },
            include: {
                appointment: {
                    select: {
                        id: true,
                        date: true,
                        startTime: true,
                        service: { select: { name: true } }
                    }
                }
            }
        });
        // Buscar records
        const records = await prisma_1.default.record.findMany({
            where: { clientId, companyId },
            include: {
                appointment: {
                    select: {
                        id: true,
                        date: true,
                        startTime: true,
                        service: { select: { name: true } }
                    }
                }
            }
        });
        // Combinar e ordenar todos os eventos
        const history = [
            ...clinicalNotes.map(note => ({
                type: 'clinical_note',
                date: note.createdAt,
                data: note
            })),
            ...appointmentHistory.map(h => ({
                type: 'appointment_history',
                date: h.createdAt,
                data: h
            })),
            ...records.map(r => ({
                type: 'record',
                date: r.createdAt,
                data: r
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.json({ history });
    }
    catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.default = router;
