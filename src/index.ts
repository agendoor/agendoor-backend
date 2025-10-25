
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import * as admin from 'firebase-admin';

dotenv.config();

// Inicializar Firebase Admin
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string, 'base64').toString('ascii'));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
}

export const db = admin.firestore();
export const auth = admin.auth();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rotas básicas
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Agendoor API (Firebase) está funcionando!' });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Agendoor Backend',
    database: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 'firebase-connected' : 'firebase-disconnected'
  });
});

// ===== TIPOS DE NEGÓCIO (Firestore) =====

app.get('/api/business-types', async (req: Request, res: Response) => {
  try {
    const businessTypesSnapshot = await db.collection('businessTypes').orderBy('sortOrder', 'asc').get();
    const businessTypes = await Promise.all(businessTypesSnapshot.docs.map(async (doc) => {
      const typeData = doc.data();
      const tabsSnapshot = await doc.ref.collection('tabs').orderBy('sortOrder', 'asc').get();
      const tabs = tabsSnapshot.docs.map(tabDoc => ({ id: tabDoc.id, ...tabDoc.data() }));
      return {
        id: doc.id,
        ...typeData,
        tabs,
      };
    }));
    
    res.json({ businessTypes });
  } catch (error) {
    console.error('Erro ao buscar tipos de negócio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE AUTENTICAÇÃO (Firebase Auth e Firestore) =====

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone, cep, street, number, complement, neighborhood, city, state, businessTypeId, companyName } = req.body;

    if (!email || !password || !fullName || !companyName) {
        return res.status(400).json({ error: "Campos essenciais (email, password, fullName, companyName) são obrigatórios." });
    }

    // 1. Criar usuário no Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
      phoneNumber: phone,
    });

    // 2. Criar a Company no Firestore
    const companyRef = db.collection('companies').doc();
    await companyRef.set({
      ownerId: userRecord.uid,
      name: companyName,
      phone,
      businessTypeId,
      address: {
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Criar o User no Firestore (com referência à Company)
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      fullName,
      email,
      phone,
      companyId: companyRef.id,
      role: 'OWNER', // O primeiro usuário é o dono
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ message: 'Usuário registrado com sucesso', uid: userRecord.uid, companyId: companyRef.id });
  } catch (error: any) {
    console.error('Erro ao registrar usuário:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'O email fornecido já está em uso.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor durante o registro.', details: error.message });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  res.status(200).json({ message: 'A autenticação deve ser feita pelo Firebase Client SDK no frontend. Este endpoint não é funcional.' });
});


// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

