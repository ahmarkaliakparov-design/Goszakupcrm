"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export function PipelineExportButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.open("/api/export/pipeline", "_blank")}
    >
      <FileDown className="h-4 w-4 mr-2" />
      Экспорт Excel
    </Button>
  );
}
