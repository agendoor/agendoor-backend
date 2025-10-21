import { PrismaClient } from '@prisma/client';
import { defaultServicesByBusinessType } from './src/config/default-services';

const prisma = new PrismaClient();

async function addDefaultServicesToExistingCompanies() {
  try {
    console.log('🚀 Iniciando adição de serviços padrão para empresas existentes...\n');

    const companies = await prisma.company.findMany({
      where: {
        businessTypeId: { not: null }
      },
      include: {
        businessType: true,
        services: true,
        serviceTypes: true
      }
    });

    console.log(`📊 Encontradas ${companies.length} empresas com tipo de negócio definido\n`);

    for (const company of companies) {
      if (!company.businessType) continue;

      const businessTypeName = company.businessType.name;
      const defaultServices = defaultServicesByBusinessType[businessTypeName];

      if (!defaultServices) {
        console.log(`⚠️  Nenhum serviço padrão definido para ${businessTypeName}`);
        continue;
      }

      const existingServiceNames = company.services.map(s => s.name);
      const missingServices = defaultServices.filter(
        ds => !existingServiceNames.includes(ds.name)
      );

      if (missingServices.length === 0) {
        console.log(`ℹ️  Empresa "${company.name}" (${businessTypeName}) já possui todos os ${defaultServices.length} serviços padrão`);
        continue;
      }

      console.log(`\n📝 Adicionando ${missingServices.length} serviços faltantes para "${company.name}" (${businessTypeName})...`);

      let serviceType = company.serviceTypes.find(st => st.name === 'Serviços');

      if (!serviceType) {
        serviceType = await prisma.serviceType.create({
          data: {
            companyId: company.id,
            name: 'Serviços',
            description: 'Serviços oferecidos',
            icon: '⭐',
            color: '#14b8a6',
            active: true,
            sortOrder: 0
          }
        });
        console.log(`  ✅ Tipo de serviço "Serviços" criado`);
      }

      let addedCount = 0;
      for (const service of missingServices) {
        await prisma.service.create({
          data: {
            companyId: company.id,
            serviceTypeId: serviceType.id,
            name: service.name,
            duration: service.duration,
            price: service.price,
            description: service.description,
            active: true
          }
        });
        console.log(`  ✅ ${service.name} - R$ ${service.price.toFixed(2)} (${service.duration} min)`);
        addedCount++;
      }

      console.log(`  ✨ Total: ${addedCount} serviços adicionados! (Empresa agora tem ${company.services.length + addedCount} serviços)`);
    }

    console.log('\n✅ Processo concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao adicionar serviços:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDefaultServicesToExistingCompanies();
