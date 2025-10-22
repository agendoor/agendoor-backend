import * as admin from 'firebase-admin';
import path from 'path';

// Caminho para o arquivo JSON da conta de serviço
// Em produção, é melhor usar variáveis de ambiente para as credenciais
// Para desenvolvimento local, o arquivo JSON pode ser referenciado diretamente
const serviceAccountPath = path.resolve(__dirname, '../../agendoor-firebase-admin.json');

// Inicializa o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

export { admin };

