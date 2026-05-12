# Tender CRM — контекст проекта

> Этот файл — краткое изложение бизнес-контекста, целей и архитектурных решений.
> Claude Code должен прочитать этот файл первым при запуске в проекте.

---

## 1. Суть проекта

**Что строим:** Веб-приложение (SaaS-готовое) для автоматизации участия в государственных закупках Казахстана.

**Тип продукта:** Tender CRM — специализированная CRM-система для тендерного бизнеса.

**Ключевая задача:** Дать поставщику возможность обрабатывать воронку 100+ тендеров в день — от обнаружения лота до получения оплаты по контракту.

**Основной источник данных:** Портал государственных закупок РК (goszakup.gov.kz) — GraphQL API v3 (ows.goszakup.gov.kz/v3/graphql).

---

## 2. Технический стек

| Слой | Технологии |
|------|-----------|
| Фронтенд | Next.js 14 (App Router), TypeScript, TailwindCSS v4, shadcn/ui-style компоненты |
| Бэкенд | Next.js API Routes + Server Actions |
| БД | PostgreSQL + Prisma ORM v7 |
| Аутентификация | NextAuth.js v5 (Auth.js) — email/password, JWT |
| Очереди | Redis + BullMQ (планируется) |
| ИИ | Claude API (Anthropic) — планируется в v0.5 |

**Важно для Prisma v7:** конфигурация через `prisma.config.ts`, клиент создаётся с `@prisma/adapter-pg`.

---

## 3. Структура проекта

```
src/
  app/
    (auth)/          — страницы входа/регистрации (без sidebar)
      login/
      register/
    (dashboard)/     — защищённые страницы с sidebar
      dashboard/     — главный дашборд
      tenders/       — список тендеров
      pipeline/      — канбан-воронка лотов
      suppliers/     — база поставщиков
      customers/     — база заказчиков
      settings/      — настройки
    api/
      auth/          — NextAuth handlers + register endpoint
  components/
    ui/              — базовые UI компоненты (Button, Input, Card, Badge...)
    layout/          — Sidebar, Header
  lib/
    auth.ts          — NextAuth конфигурация
    prisma.ts        — Prisma клиент (singleton)
    utils.ts         — утилиты (cn, formatCurrency, formatDate)
  types/
    index.ts         — типы и константы (PipeStage labels/colors)
prisma/
  schema.prisma      — схема БД
prisma.config.ts     — конфигурация Prisma v7
```

---

## 4. Архитектурные решения

- **Multi-tenant**: `company_id` во всех таблицах. Каждая компания — изолированный тенант.
- **Язык UI**: русский. Денежные суммы в тенге (`1 234 567 ₸`). Даты: `DD.MM.YYYY`. Timezone: `Asia/Almaty`.
- **Auth**: middleware защищает все маршруты кроме `/login` и `/register`.
- **Безопасность**: bcrypt для паролей, Prisma защищает от SQL-инъекций, валидация через Zod.

---

## 5. Roadmap

### MVP v0.1 — Скелет ✅ (текущий этап)
- Next.js + Prisma + PostgreSQL структура
- Авторизация (email/пароль)
- Страницы: Dashboard, Тендеры, Воронка, Поставщики, Заказчики, Настройки
- Тестовые данные в UI

### MVP v0.2 — Интеграция с goszakup
- GraphQL API клиент
- Фоновая тяга лотов (BullMQ + Redis)
- Реальные данные в интерфейсе
- Поиск и фильтры

### MVP v0.3 — CRM-логика
- Drag-and-drop в воронке
- История переходов по статусам
- Комментарии к лотам
- Дедлайны и уведомления

### MVP v0.4 — Поставщики и калькулятор
- CRUD поставщиков
- Загрузка прайсов из Excel
- Калькулятор себестоимости (поставщик → НДС → обеспечение → маржа → рекомендуемая цена)

### MVP v0.5 — ИИ-функции
- Claude API: разбор ТЗ
- Оценка лотов 1-10
- ИИ-ассистент

---

## 6. Открытые вопросы

1. **Токен goszakup API** — нужен от пользователя. Получается в ЛК на goszakup.gov.kz.
2. **Целевые товарные категории** — влияет на приоритизацию поставщиков.
3. **Деплой** — VPS в Казахстане (Hoster.kz, PS.kz) или Hetzner + Docker.

---

## 7. Принципы разработки

- Простые решения лучше сложных. Не переусложнять MVP.
- TypeScript строгий режим. ESLint.
- Безопасность с самого начала: bcrypt, Prisma, Zod, rate limiting.
- Все миграции БД — через Prisma migrations.
- **Не подключать платные API без разрешения** (Claude API, SMS и т.д.).
- **Не пушить в main без ревью**.
- Комментарии только там, где логика неочевидна.
