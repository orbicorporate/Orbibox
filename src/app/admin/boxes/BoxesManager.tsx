"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Box = {
  id: string;
  box_type: string;
  title: string | null;
  position: number;
  is_active: boolean;
  auto_arranged: boolean;
};

const TYPE_LABEL: Record<string, string> = {
  hero: "Hero Box",
  agent: "Agent Box",
  product: "Product Box",
  content: "Content Box",
  campaign: "Campaign Box",
  custom: "Custom Box",
};

export function BoxesManager({
  initialBoxes,
}: {
  businessId: string;
  initialBoxes: Box[];
}) {
  const supabase = createClient();
  const [boxes, setBoxes] = useState<Box[]>(initialBoxes);
  const [arranging, setArranging] = useState(false);

  async function toggleActive(box: Box) {
    const { error } = await supabase
      .from("smart_boxes")
      .update({ is_active: !box.is_active })
      .eq("id", box.id);
    if (!error) {
      setBoxes((prev) =>
        prev.map((b) => (b.id === box.id ? { ...b, is_active: !b.is_active } : b))
      );
    }
  }

  async function autoArrange() {
    setArranging(true);
    // Heurística local de "auto arrange": prioriza Agent > Hero > Product > resto,
    // simulando a otimização de conversão que a Orbi faria de verdade.
    const priority: Record<string, number> = { hero: 0, agent: 1, product: 2, content: 3, campaign: 4, custom: 5 };
    const sorted = [...boxes].sort((a, b) => (priority[a.box_type] ?? 9) - (priority[b.box_type] ?? 9));

    await Promise.all(
      sorted.map((box, i) =>
        supabase.from("smart_boxes").update({ position: i, auto_arranged: true }).eq("id", box.id)
      )
    );

    setBoxes(sorted.map((b, i) => ({ ...b, position: i, auto_arranged: true })));
    setArranging(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="orbi" onClick={autoArrange} disabled={arranging} className="self-start">
        {arranging ? "Reorganizando…" : "✦ Auto Arrange"}
      </Button>

      <div className="flex flex-col gap-3">
        {boxes
          .sort((a, b) => a.position - b.position)
          .map((box) => (
            <Card key={box.id} className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-text-tertiary">{TYPE_LABEL[box.box_type] ?? box.box_type}</p>
                <p className="text-[15px] font-medium">{box.title ?? "Sem título"}</p>
                {box.auto_arranged && (
                  <span className="orbi-gradient-text text-[12px] font-medium">
                    ✦ organizado pela Orbi
                  </span>
                )}
              </div>
              <Button variant="secondary" onClick={() => toggleActive(box)}>
                {box.is_active ? "Ativo" : "Inativo"}
              </Button>
            </Card>
          ))}
      </div>
    </div>
  );
}
