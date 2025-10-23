import * as admin from 'firebase-admin';
import path from 'path';

// Carregar a chave privada do Firebase Admin a partir de uma variável de ambiente
// Em produção, é melhor usar variáveis de ambiente para as credenciais
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON não está configurada nas variáveis de ambiente.");
}

// Inicializa o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
});

export { admin };

