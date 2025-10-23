import * as admin from 'firebase-admin';
import path from 'path';

// Configuração a partir de variáveis de ambiente do Render/Vercel
// Em produção, é melhor usar variáveis de ambiente para as credenciais
// Para desenvolvimento local, o arquivo JSON pode ser referenciado diretamente
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Inicializa o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export { admin };

