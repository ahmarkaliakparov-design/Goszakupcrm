import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/auth-utils";
import { Header } from "@/components/layout/header";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import type { PipelineLot } from "@/components/pipeline/KanbanBoard";
import type { PipeStage } from "@/types";

async function getPipelineData(companyId: string) {
  const pipelines = await prisma.lotPipeline.findMany({
    where: { companyId, isArchived: false },
    include: {
      lot: {
        include: { tender: { select: { name: true, customerName: true, deadline: true } } },
      },
      comments: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const stages: Record<PipeStage, typeof pipelines> = {
    FOUND: [], ANALYSIS: [], CALCULATION: [], SUBMITTED: [],
    WON: [], LOST: [], CONTRACT: [], DELIVERY: [], PAYMENT: [], CLOSED: [],
  };

  for (const p of pipelines) stages[p.stage].push(p);

  // Serialize Decimal fields (Prisma Decimal → string via JSON round-trip)
  return JSON.parse(JSON.stringify(stages)) as Record<PipeStage, PipelineLot[]>;
}

export default async function PipelinePage() {
  const companyId = await getCompanyId();
  const data = await getPipelineData(companyId);

  const totalInPipeline = Object.values(data).flat().length;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Воронка"
        subtitle={`${totalInPipeline} активных лотов`}
      />

      <div className="flex-1 overflow-x-auto p-6">
        <KanbanBoard initialData={data} />
      </div>
    </div>
  );
}
