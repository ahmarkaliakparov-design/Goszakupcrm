import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const KTRU_CATEGORIES = [
  { ktru: "27.31.11.000.000.00.0006.000000000000", name: "Кабель оптоволоконный", unit: "м", basePrice: 320 },
  { ktru: "31.01.11.000.000.00.0796.000000000000", name: "Стол офисный", unit: "шт", basePrice: 45000 },
  { ktru: "31.01.12.000.000.00.0796.000000000000", name: "Стул офисный эргономичный", unit: "шт", basePrice: 28000 },
  { ktru: "26.20.11.000.000.00.0796.000000000000", name: "Ноутбук Core i5", unit: "шт", basePrice: 450000 },
  { ktru: "26.20.13.000.000.00.0796.000000000000", name: "Монитор 24\"", unit: "шт", basePrice: 95000 },
  { ktru: "26.20.18.000.000.00.0796.000000000000", name: "МФУ лазерное", unit: "шт", basePrice: 180000 },
  { ktru: "17.23.13.000.000.00.0796.000000000000", name: "Бумага А4 80г/м²", unit: "пач.", basePrice: 1850 },
];

const CUSTOMERS = [
  { bin: "010140005555", name: "ГУ Управление образования г. Алматы", region: "Алматы", paymentDays: 30, rating: 4 },
  { bin: "020240006666", name: "ГУ Управление здравоохранения Астаны", region: "Астана", paymentDays: 45, rating: 4 },
  { bin: "030340007777", name: "ГУ Аппарат акима Алматинской области", region: "Алматинская обл.", paymentDays: 60, rating: 3 },
  { bin: "040440008888", name: "ГУ Министерство цифрового развития", region: "Астана", paymentDays: 30, rating: 5 },
  { bin: "050540009999", name: "ГККП Поликлиника №7 г. Шымкент", region: "Шымкент", paymentDays: 90, rating: 2 },
];

const SUPPLIERS = [
  { name: "ТОО ОфисМаркет KZ", bin: "111111111111", category: "Офисная мебель", contactName: "Айбек Сериков", phone: "+7 727 311 22 33", paymentTerms: "Предоплата 50%", deliveryDays: 7 },
  { name: "ТОО KazTech Distribution", bin: "222222222222", category: "Компьютерная техника", contactName: "Дмитрий Петров", phone: "+7 717 555 66 77", paymentTerms: "Постоплата 30 дней", deliveryDays: 14 },
  { name: "ИП Каримов А.С.", bin: "333333333333", category: "Канцелярия", contactName: "Алмат Каримов", phone: "+7 700 123 45 67", paymentTerms: "По факту", deliveryDays: 3 },
];

const COMPETITORS = [
  { name: "ТОО Алатау Снаб", bin: "555111222333" },
  { name: "ТОО Тендер Лидер KZ", bin: "555444555666" },
  { name: "ТОО Поставка-Сервис", bin: "555777888999" },
  { name: "ИП Жумабаев Е.Б.", bin: "555000111222" },
];

async function main() {
  console.log("🌱 Seeding database...");

  const company = await prisma.company.upsert({
    where: { id: "seed-company-1" },
    update: {},
    create: {
      id: "seed-company-1",
      name: "ТОО TenderPro KZ",
      bin: "999888777666",
    },
  });

  const passwordHash = await hash("password123", 12);

  await prisma.user.upsert({
    where: { email: "admin@tendercrm.kz" },
    update: { passwordHash },
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

  // Customers
  for (const c of CUSTOMERS) {
    await prisma.customer.upsert({
      where: { companyId_bin: { companyId: company.id, bin: c.bin } },
      update: {},
      create: { ...c, companyId: company.id, category: "Госорган" },
    });
  }

  // Suppliers + prices
  for (const s of SUPPLIERS) {
    const supplier = await prisma.supplier.upsert({
      where: { id: `seed-sup-${s.bin}` },
      update: {},
      create: { id: `seed-sup-${s.bin}`, ...s, companyId: company.id, email: `${s.bin}@example.kz` },
    });
    const relevantKtrus = KTRU_CATEGORIES.filter((k) => {
      if (s.category === "Офисная мебель") return k.name.includes("Стол") || k.name.includes("Стул");
      if (s.category === "Компьютерная техника") return k.name.includes("Ноутбук") || k.name.includes("Монитор") || k.name.includes("МФУ");
      return k.name.includes("Бумага") || k.name.includes("Кабель");
    });
    for (const k of relevantKtrus) {
      await prisma.supplierPrice.upsert({
        where: { id: `seed-price-${supplier.id}-${k.ktru}` },
        update: {},
        create: {
          id: `seed-price-${supplier.id}-${k.ktru}`,
          supplierId: supplier.id,
          itemName: k.name,
          ktru: k.ktru,
          unit: k.unit,
          price: k.basePrice * (0.7 + Math.random() * 0.15),
        },
      });
    }
  }

  // Competitors
  for (const comp of COMPETITORS) {
    await prisma.competitor.upsert({
      where: { companyId_name: { companyId: company.id, name: comp.name } },
      update: {},
      create: { ...comp, companyId: company.id },
    });
  }

  // Tenders + lots + pipeline + history (90 days of data)
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const stages = ["FOUND", "ANALYSIS", "CALCULATION", "SUBMITTED", "WON", "LOST", "CONTRACT"] as const;

  for (let i = 0; i < 35; i++) {
    const ktru = KTRU_CATEGORIES[i % KTRU_CATEGORIES.length];
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const createdDaysAgo = Math.floor(Math.random() * 90);
    const createdAt = new Date(now - createdDaysAgo * day);
    const deadlineDaysOffset = Math.floor(Math.random() * 14) - 5;
    const deadline = new Date(now + deadlineDaysOffset * day);

    const quantity = 10 + Math.floor(Math.random() * 200);
    const totalAmount = ktru.basePrice * quantity;
    const externalId = `seed-${i + 1}`;

    const tender = await prisma.tender.upsert({
      where: { externalId_source_companyId: { externalId, source: "GOSZAKUP", companyId: company.id } },
      update: {},
      create: {
        externalId,
        source: "GOSZAKUP",
        companyId: company.id,
        name: `Поставка: ${ktru.name} для ${customer.name}`,
        customerName: customer.name,
        customerBin: customer.bin,
        method: i % 3 === 0 ? "Открытый конкурс" : i % 3 === 1 ? "Запрос ценовых предложений" : "Электронный магазин",
        deadline,
        totalAmount,
        publishedAt: createdAt,
        createdAt,
        lots: {
          create: {
            externalId: `lot-${i + 1}`,
            name: `${ktru.name} — ${quantity} ${ktru.unit}`,
            ktru: ktru.ktru,
            unit: ktru.unit,
            quantity,
            unitPrice: ktru.basePrice,
            totalPrice: totalAmount,
            description: `${ktru.name}. Поставка по адресу заказчика. Срок ${createdDaysAgo > 50 ? "30" : "14"} дней с даты подписания договора.`,
          },
        },
      },
      include: { lots: true },
    });

    if (i % 4 === 0) continue; // 25% in tenders but not in pipeline

    const stage = stages[Math.min(Math.floor(createdDaysAgo / 12), stages.length - 1)];
    const lot = tender.lots[0];

    const existingPipeline = await prisma.lotPipeline.findUnique({ where: { lotId: lot.id } });
    if (existingPipeline) continue;

    const pipeline = await prisma.lotPipeline.create({
      data: {
        lotId: lot.id,
        companyId: company.id,
        stage,
        priority: i % 5 === 0 ? "HIGH" : i % 3 === 0 ? "LOW" : "MEDIUM",
        submittedAt: ["SUBMITTED", "WON", "LOST", "CONTRACT"].includes(stage) ? new Date(now - (createdDaysAgo - 5) * day) : null,
        submittedPrice: ["SUBMITTED", "WON", "LOST", "CONTRACT"].includes(stage)
          ? totalAmount * (0.82 + Math.random() * 0.12)
          : null,
        wonAt: ["WON", "CONTRACT"].includes(stage) ? new Date(now - (createdDaysAgo - 8) * day) : null,
        lostAt: stage === "LOST" ? new Date(now - (createdDaysAgo - 8) * day) : null,
        contractAt: stage === "CONTRACT" ? new Date(now - (createdDaysAgo - 12) * day) : null,
      },
    });

    await prisma.pipelineHistory.create({
      data: { pipelineId: pipeline.id, toStage: "FOUND", changedAt: createdAt },
    });
    const stageIdx = stages.indexOf(stage);
    for (let j = 1; j <= stageIdx; j++) {
      await prisma.pipelineHistory.create({
        data: {
          pipelineId: pipeline.id,
          fromStage: stages[j - 1],
          toStage: stages[j],
          changedAt: new Date(createdAt.getTime() + j * 2 * day),
        },
      });
    }

    // Cost calculations for some
    if (["CALCULATION", "SUBMITTED", "WON", "LOST", "CONTRACT"].includes(stage)) {
      const purchase = ktru.basePrice * 0.7 * quantity;
      const delivery = purchase * 0.03;
      const vat = (purchase + delivery) * 0.12;
      const deposit = totalAmount * 0.03;
      const fin = totalAmount * 0.02;
      const cost = purchase + delivery + vat + deposit + fin;
      const margin = 12 + Math.random() * 18;
      await prisma.costCalculation.create({
        data: {
          lotId: lot.id,
          companyId: company.id,
          purchasePrice: purchase,
          deliveryCost: delivery,
          vatAmount: vat,
          contractDeposit: deposit,
          financingCost: fin,
          totalCost: cost,
          desiredMargin: margin,
          recommendedPrice: cost * (1 + margin / 100),
        },
      });
    }

    // Loss records for LOST stage
    if (stage === "LOST") {
      const competitor = COMPETITORS[i % COMPETITORS.length];
      const competitorRec = await prisma.competitor.findUnique({
        where: { companyId_name: { companyId: company.id, name: competitor.name } },
      });
      await prisma.lossRecord.create({
        data: {
          pipelineId: pipeline.id,
          competitorId: competitorRec?.id,
          winnerName: competitor.name,
          winningPrice: totalAmount * (0.75 + Math.random() * 0.1),
          ourPrice: Number(pipeline.submittedPrice),
          reason: i % 2 === 0 ? "PRICE_TOO_HIGH" : "CUSTOMER_PREFERENCE",
        },
      });
    }

    // Comments for some
    if (i % 5 === 0) {
      await prisma.comment.create({
        data: {
          pipelineId: pipeline.id,
          text: ["Запросил образцы у поставщика", "Уточнил детали по доставке", "Готовлю техническое предложение"][i % 3],
        },
      });
    }
  }

  // Recompute competitor stats
  const competitors = await prisma.competitor.findMany({ where: { companyId: company.id } });
  for (const c of competitors) {
    const losses = await prisma.lossRecord.findMany({ where: { competitorId: c.id } });
    const totalWin = losses.reduce((s, l) => s + Number(l.winningPrice ?? 0), 0);
    const avgDiscount = losses.length
      ? losses.reduce((s, l) => {
          const ours = Number(l.ourPrice ?? 0);
          const winning = Number(l.winningPrice ?? 0);
          if (!ours || !winning) return s;
          return s + ((ours - winning) / ours) * 100;
        }, 0) / losses.length
      : 0;
    await prisma.competitor.update({
      where: { id: c.id },
      data: {
        encounters: losses.length,
        wins: losses.length,
        totalWinAmount: totalWin,
        avgDiscount,
      },
    });
  }

  console.log("✅ Seed completed!");
  console.log("📧 Login: admin@tendercrm.kz / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
