export const defaultServicesByBusinessType: Record<string, any[]> = {
  // ODONTOLOGIA
  'Odontologia': [
    { name: 'Limpeza Dental (Profilaxia)', duration: 45, price: 150.00, description: 'Remoção de tártaro e placa bacteriana' },
    { name: 'Restauração/Obturação', duration: 60, price: 200.00, description: 'Tratamento de cárie com resina' },
    { name: 'Tratamento de Canal', duration: 90, price: 800.00, description: 'Endodontia - tratamento de canal radicular' },
    { name: 'Extração Dentária', duration: 45, price: 250.00, description: 'Remoção de dente' },
    { name: 'Clareamento Dental', duration: 60, price: 600.00, description: 'Branqueamento dos dentes' },
    { name: 'Faceta/Lente de Contato Dental', duration: 90, price: 1500.00, description: 'Laminado estético para dentes' },
    { name: 'Implante Dentário', duration: 120, price: 3000.00, description: 'Implante de pino e coroa' },
    { name: 'Aparelho Ortodôntico', duration: 60, price: 300.00, description: 'Manutenção mensal do aparelho' },
    { name: 'Prótese Dentária', duration: 90, price: 2000.00, description: 'Confecção de prótese' },
    { name: 'Raspagem Periodontal', duration: 60, price: 300.00, description: 'Limpeza profunda das gengivas' },
    { name: 'Aplicação de Flúor', duration: 20, price: 80.00, description: 'Fortalecimento do esmalte' },
    { name: 'Cirurgia Oral', duration: 90, price: 500.00, description: 'Pequenas cirurgias bucais' },
  ],

  // BARBEARIA
  'Barbearia': [
    { name: 'Corte de Cabelo', duration: 30, price: 50.00, description: 'Corte masculino tradicional' },
    { name: 'Corte de Barba', duration: 20, price: 35.00, description: 'Aparar e modelar barba' },
    { name: 'Barba com Navalha', duration: 30, price: 45.00, description: 'Barbear tradicional com navalha' },
    { name: 'Design de Sobrancelha', duration: 15, price: 25.00, description: 'Modelagem de sobrancelhas' },
    { name: 'Pigmentação de Barba', duration: 40, price: 80.00, description: 'Cobertura de fios brancos' },
    { name: 'Hidratação Capilar', duration: 30, price: 60.00, description: 'Tratamento hidratante para cabelos' },
    { name: 'Limpeza de Pele', duration: 45, price: 90.00, description: 'Limpeza facial profunda' },
    { name: 'Massagem Relaxante', duration: 20, price: 40.00, description: 'Massagem de ombros e pescoço' },
    { name: 'Depilação Facial', duration: 20, price: 30.00, description: 'Remoção de pelos do rosto' },
    { name: 'Combo Corte + Barba', duration: 45, price: 75.00, description: 'Corte de cabelo e barba' },
  ],

  // SALÃO DE BELEZA
  'Salão de Beleza': [
    { name: 'Corte Feminino', duration: 45, price: 80.00, description: 'Corte de cabelo feminino' },
    { name: 'Corte Masculino', duration: 30, price: 50.00, description: 'Corte de cabelo masculino' },
    { name: 'Corte Infantil', duration: 30, price: 45.00, description: 'Corte para crianças' },
    { name: 'Coloração/Tintura', duration: 120, price: 200.00, description: 'Pintura completa do cabelo' },
    { name: 'Mechas e Luzes', duration: 180, price: 350.00, description: 'Aplicação de mechas' },
    { name: 'Ombré/Balayage', duration: 180, price: 400.00, description: 'Técnica de coloração gradiente' },
    { name: 'Escova', duration: 45, price: 60.00, description: 'Escova modeladora' },
    { name: 'Chapinha', duration: 45, price: 70.00, description: 'Alisamento com prancha' },
    { name: 'Penteado', duration: 60, price: 120.00, description: 'Penteado para eventos' },
    { name: 'Hidratação', duration: 45, price: 80.00, description: 'Tratamento hidratante capilar' },
    { name: 'Reconstrução Capilar', duration: 60, price: 150.00, description: 'Reposição de massa capilar' },
    { name: 'Botox Capilar', duration: 90, price: 200.00, description: 'Tratamento intensivo anti-frizz' },
    { name: 'Progressiva', duration: 180, price: 300.00, description: 'Alisamento progressivo' },
    { name: 'Manicure', duration: 45, price: 40.00, description: 'Cuidados com as unhas das mãos' },
    { name: 'Pedicure', duration: 45, price: 45.00, description: 'Cuidados com as unhas dos pés' },
    { name: 'Design de Sobrancelha', duration: 20, price: 35.00, description: 'Modelagem de sobrancelhas' },
    { name: 'Depilação', duration: 30, price: 50.00, description: 'Remoção de pelos' },
    { name: 'Maquiagem', duration: 60, price: 100.00, description: 'Maquiagem profissional' },
    { name: 'Limpeza de Pele', duration: 60, price: 120.00, description: 'Limpeza facial profunda' },
    { name: 'Alongamento de Cílios', duration: 90, price: 150.00, description: 'Aplicação de cílios postiços' },
  ],

  // PET SHOP
  'Pet Shop': [
    { name: 'Banho', duration: 45, price: 60.00, description: 'Banho completo para pet' },
    { name: 'Tosa Completa', duration: 90, price: 100.00, description: 'Tosa e acabamento completo' },
    { name: 'Tosa Higiênica', duration: 30, price: 50.00, description: 'Tosa de higiene' },
    { name: 'Hidratação de Pelos', duration: 45, price: 80.00, description: 'Tratamento para pelagem' },
    { name: 'Corte de Unhas', duration: 15, price: 25.00, description: 'Corte e lixamento de unhas' },
    { name: 'Limpeza de Orelhas', duration: 15, price: 25.00, description: 'Higienização auricular' },
    { name: 'Escovação', duration: 30, price: 40.00, description: 'Escovação e remoção de nós' },
    { name: 'Consulta Veterinária', duration: 30, price: 150.00, description: 'Consulta clínica veterinária' },
    { name: 'Vacinação', duration: 20, price: 80.00, description: 'Aplicação de vacinas' },
    { name: 'Castração', duration: 120, price: 500.00, description: 'Cirurgia de castração' },
    { name: 'Banho + Tosa', duration: 120, price: 140.00, description: 'Combo banho e tosa' },
  ],

  // PROFESSOR PARTICULAR
  'Professor Particular': [
    { name: 'Aula de Matemática', duration: 60, price: 80.00, description: 'Aula particular de matemática' },
    { name: 'Aula de Português', duration: 60, price: 75.00, description: 'Aula particular de português' },
    { name: 'Aula de Física', duration: 60, price: 85.00, description: 'Aula particular de física' },
    { name: 'Aula de Química', duration: 60, price: 85.00, description: 'Aula particular de química' },
    { name: 'Aula de Inglês', duration: 60, price: 90.00, description: 'Aula particular de inglês' },
    { name: 'Aula de Espanhol', duration: 60, price: 85.00, description: 'Aula particular de espanhol' },
    { name: 'Reforço Escolar', duration: 90, price: 100.00, description: 'Reforço em matérias escolares' },
    { name: 'Preparação para ENEM', duration: 90, price: 120.00, description: 'Preparatório ENEM' },
    { name: 'Preparação para Vestibular', duration: 90, price: 120.00, description: 'Preparatório vestibular' },
    { name: 'Aula de Redação', duration: 60, price: 80.00, description: 'Desenvolvimento de redação' },
    { name: 'Tutoria Online', duration: 60, price: 70.00, description: 'Aula particular online' },
  ],

  // CLÍNICA DE SAÚDE
  'Clínica de Saúde': [
    { name: 'Consulta Médica', duration: 30, price: 200.00, description: 'Consulta médica geral' },
    { name: 'Consulta Pediátrica', duration: 40, price: 220.00, description: 'Consulta com pediatra' },
    { name: 'Consulta Ginecológica', duration: 40, price: 250.00, description: 'Consulta ginecológica' },
    { name: 'Consulta Cardiológica', duration: 45, price: 300.00, description: 'Consulta com cardiologista' },
    { name: 'Consulta Dermatológica', duration: 30, price: 280.00, description: 'Consulta dermatológica' },
    { name: 'Exame de Sangue', duration: 15, price: 80.00, description: 'Coleta de sangue para exames' },
    { name: 'Ultrassom', duration: 30, price: 200.00, description: 'Exame de ultrassonografia' },
    { name: 'Raio-X', duration: 20, price: 150.00, description: 'Exame radiográfico' },
    { name: 'Eletrocardiograma', duration: 20, price: 100.00, description: 'Exame de ECG' },
    { name: 'Check-up Completo', duration: 60, price: 500.00, description: 'Avaliação médica completa' },
  ]
};
