import { Router, Request, Response } from 'express';
import prisma from '../config/prisma'; // Usar a instância global do Prisma
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { AuthRequest, authMiddleware } from '../middleware/auth'; // Importar AuthRequest e authMiddleware

const router = Router();

// Aplicar authMiddleware a todas as rotas neste router
router.use(authMiddleware);

// Configurar multer para upload de arquivos
const uploadDir = path.join(__dirname, '../../uploads/documents');
const thumbnailDir = path.join(__dirname, '../../uploads/thumbnails');

// Garante que os diretórios de upload existam
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${fileExtension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido.'), false);
    }
  }
});

// Função para criar thumbnail de imagens
const createThumbnail = async (filePath: string, originalName: string): Promise<string | null> => {
  try {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(originalName);
    if (!isImage) return null;

    const thumbnailName = `thumb-${path.basename(filePath, path.extname(filePath))}.webp`;
    const thumbnailFullPath = path.join(thumbnailDir, thumbnailName);

    await sharp(filePath)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbnailFullPath);

    return `/uploads/thumbnails/${thumbnailName}`;
  } catch (error) {
    console.error('Erro ao criar thumbnail:', error);
    return null;
  }
};

// GET /api/clients/:clientId/documents - Listar documentos de um cliente
router.get('/clients/:clientId/documents', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { category, search } = req.query;
    const companyId = req.user!.companyId; // Obter companyId do usuário autenticado

    // Verificar se o cliente pertence à empresa do usuário autenticado
    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado ou não pertence à sua empresa' });
    }

    // Construir filtros
    const where: any = { clientId, companyId }; // Adicionar companyId ao filtro
    
    if (category && category !== 'all') {
      where.category = category as string;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { originalName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const documents = await prisma.clientDocument.findMany({
      where,
      orderBy: { uploadDate: 'desc' },
      include: {
        client: {
          select: { id: true, fullName: true }
        }
      }
    });

    // Processar documentos para incluir URLs
    const documentsWithUrls = documents.map(doc => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      size: doc.size,
      category: doc.category,
      description: doc.description,
      tags: JSON.parse(doc.tags || '[]'),
      uploadDate: doc.uploadDate.toISOString(),
      url: `/uploads/documents/${path.basename(doc.filePath)}`,
      thumbnailUrl: doc.thumbnailPath ? doc.thumbnailPath : null
    }));

    res.json({ documents: documentsWithUrls });

  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/clients/:clientId/documents - Upload de documentos
router.post('/clients/:clientId/documents', upload.array('files', 10), async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { category, description } = req.body;
    const files = req.files as Express.Multer.File[];
    const companyId = req.user!.companyId; // Obter companyId do usuário autenticado

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Categoria é obrigatória' });
    }

    // Verificar se o cliente pertence à empresa do usuário autenticado
    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado ou não pertence à sua empresa' });
    }

    const uploadedDocuments = [];

    for (const file of files) {
      try {
        // Criar thumbnail se for imagem
        const thumbnailPath = await createThumbnail(file.path, file.originalname);

        // Salvar documento no banco de dados
        const document = await prisma.clientDocument.create({
          data: {
            clientId,
            companyId, // Adicionar companyId ao criar o documento
            name: file.originalname.replace(/\.[^/.]+$/, ''), // Nome sem extensão
            originalName: file.originalname,
            type: file.mimetype,
            size: file.size,
            category,
            description: description || null,
            filePath: file.path,
            thumbnailPath,
            tags: '[]'
          }
        });

        uploadedDocuments.push({
          id: document.id,
          name: document.name,
          type: document.type,
          size: document.size,
          category: document.category,
          description: document.description,
          tags: JSON.parse(document.tags),
          uploadDate: document.uploadDate.toISOString(),
          url: `/uploads/documents/${file.filename}`,
          thumbnailUrl: thumbnailPath
        });

      } catch (error) {
        console.error(`Erro ao processar arquivo ${file.originalname}:`, error);
        // Remover arquivo se houve erro
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        continue;
      }
    }

    if (uploadedDocuments.length === 0) {
      return res.status(500).json({ error: 'Nenhum arquivo foi processado com sucesso' });
    }

    res.status(201).json({ 
      message: `${uploadedDocuments.length} documento(s) enviado(s) com sucesso`,
      documents: uploadedDocuments 
    });

  } catch (error) {
    console.error('Erro no upload de documentos:', error);
    
    // Limpar arquivos em caso de erro
    const files = req.files as Express.Multer.File[];
    if (files) {
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/documents/:documentId - Atualizar documento
router.put('/documents/:documentId', async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const { name, description, category, tags } = req.body;
    const companyId = req.user!.companyId; // Obter companyId do usuário autenticado

    // Verificar se o documento existe e pertence à empresa do usuário autenticado
    const document = await prisma.clientDocument.findFirst({
      where: { id: documentId, companyId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado ou não pertence à sua empresa' });
    }

    const updatedDocument = await prisma.clientDocument.update({
      where: { id: documentId },
      data: {
        name: name || document.name,
        description: description !== undefined ? description : document.description,
        category: category || document.category,
        tags: tags ? JSON.stringify(tags) : document.tags
      }
    });

    res.json({
      id: updatedDocument.id,
      name: updatedDocument.name,
      type: updatedDocument.type,
      size: updatedDocument.size,
      category: updatedDocument.category,
      description: updatedDocument.description,
      tags: JSON.parse(updatedDocument.tags),
      uploadDate: updatedDocument.uploadDate.toISOString(),
      url: `/uploads/documents/${path.basename(updatedDocument.filePath)}`,
      thumbnailUrl: updatedDocument.thumbnailPath
    });

  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/documents/:documentId - Excluir documento
router.delete('/documents/:documentId', async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const companyId = req.user!.companyId; // Obter companyId do usuário autenticado

    // Verificar se o documento existe e pertence à empresa do usuário autenticado
    const document = await prisma.clientDocument.findFirst({
      where: { id: documentId, companyId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado ou não pertence à sua empresa' });
    }

    // Remover arquivos do sistema de arquivos
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    if (document.thumbnailPath) {
      const thumbnailFullPath = path.join(__dirname, '../..', document.thumbnailPath);
      if (fs.existsSync(thumbnailFullPath)) {
        fs.unlinkSync(thumbnailFullPath);
      }
    }

    // Remover do banco de dados
    await prisma.clientDocument.delete({
      where: { id: documentId }
    });

    res.json({ message: 'Documento excluído com sucesso' });

  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/documents/:documentId/download - Download de documento
router.get('/documents/:documentId/download', async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const companyId = req.user!.companyId; // Obter companyId do usuário autenticado

    // Verificar se o documento existe e pertence à empresa do usuário autenticado
    const document = await prisma.clientDocument.findFirst({
      where: { id: documentId, companyId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado ou não pertence à sua empresa' });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no sistema' });
    }

    res.download(document.filePath, document.originalName);

  } catch (error) {
    console.error('Erro ao baixar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;

