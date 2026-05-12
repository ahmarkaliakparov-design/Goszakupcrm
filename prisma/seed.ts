import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const company = await prisma.company.upsert({
    where: { id: "seed-company-1" },
    update: {},
    create: {
      id: "seed-company-1",
      name: "ТОО TenderPro KZ",
    },
  });

  const passwordHash = await hash("password123", 12);

  await prisma.user.upsert({
    where: { email: "admin@tendercrm.kz" },
    update: {},
    create: {
      email: "admin@tendercrm.kz",
      name: "Администратор",
      passwordHash,
      role: "OWNER",
      companyId: company.id,
    },
  });

  await prisma.keyword.createMany({
    data: [
      { companyId: company.id, word: "офисная мебель" },
      { companyId: company.id, word: "компьютеры" },
      { companyId: company.id, word: "оргтехника" },
      { companyId: company.id, word: "канцелярия" },
      { companyId: company.id, word: "расходные материалы" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed завершён. Логин: admin@tendercrm.kz / password123");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
