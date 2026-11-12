// Seed de DESENVOLVIMENTO. Somente dados fictícios (AGENTS.md / TESTING.md).
// Uso: SEED_PASSWORD='<senha-local>' npm run db:seed
// Sem SEED_PASSWORD, uma senha aleatória é gerada e exibida uma única vez.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  if (/prod/i.test(url)) throw new Error('Seed recusado em banco de produção');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const generated = !process.env.SEED_PASSWORD;
  const password =
    process.env.SEED_PASSWORD ?? randomBytes(9).toString('base64url');
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.upsert({
      where: { email: 'admin@mov.local' },
      update: {},
      create: {
        name: 'Admin Fictício',
        email: 'admin@mov.local',
        passwordHash,
        role: 'ADMIN',
      },
    });
    for (const n of ['1', '2']) {
      const user = await prisma.user.upsert({
        where: { email: `motorista${n}@mov.local` },
        update: {},
        create: {
          name: `Motorista Fictício ${n}`,
          email: `motorista${n}@mov.local`,
          passwordHash,
          role: 'MOTORISTA',
        },
      });
      await prisma.driver.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
    }
    const vehicles = [
      {
        plate: 'FIC0001',
        description: 'Van fictícia',
        capacity: 8,
        status: 'ACTIVE' as const,
      },
      {
        plate: 'FIC0002',
        description: 'Micro-ônibus fictício',
        capacity: 15,
        status: 'ACTIVE' as const,
      },
      {
        plate: 'FIC0003',
        description: 'Van em manutenção (fictícia)',
        capacity: 8,
        status: 'IN_MAINTENANCE' as const,
      },
    ];
    for (const v of vehicles) {
      await prisma.vehicle.upsert({
        where: { plate: v.plate },
        update: {},
        create: v,
      });
    }
    if ((await prisma.patient.count()) === 0) {
      await prisma.patient.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          name: `Paciente Fictício ${i + 1}`,
          birthDate: new Date(`19${50 + i}-01-15`),
          phone: `(00) 90000-000${i}`,
          usesWheelchair: i === 0,
          hasReducedMobility: i === 1,
        })),
      });
    }
    console.log('Seed concluído (dados fictícios).');
    if (generated)
      console.log(`Senha gerada para as contas de seed: ${password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
