"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OrbBadge } from "@/components/ui/OrbBadge";

type Campaign = {
  id: string;
  title: string;
  channel: string;
  content: string | null;
  status: string;
  ai_recommended_time: boolean;
  scheduled_at: string | null;
};

const CHANNELS = ["instagram", "whatsapp", "direct"] as const;
const BEST_HOURS: Record<string, string> = {
  instagram: "19h",
  whatsapp: "11h",
  direct: "20h",
};

export function CampaignsManager({
  businessId,
  initialCampaigns,
  contentOptions,
}: {
  businessId: string;
  initialCampaigns: Campaign[];
  contentOptions: { id: string; title: string }[];
}) {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("instagram");
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const recommended = contentOptions[0]?.title;
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        business_id: businessId,
        title,
        channel,
        status: "draft",
        ai_recommended_time: true,
        content: recommended
          ? `✦ Orbi sugere promover "${recommended}" às ${BEST_HOURS[channel]} — horário de maior engajamento neste canal.`
          : `Melhor horário sugerido pela Orbi: ${BEST_HOURS[channel]}.`,
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setCampaigns((prev) => [data as Campaign, ...prev]);
      setTitle("");
    }
  }

  async function updateStatus(campaign: Campaign, status: string) {
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", campaign.id);
    if (!error) {
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, status } : c)));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
          <input
            placeholder="Nome da campanha"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-2xl border border-divider px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as (typeof CHANNELS)[number])}
            className="rounded-2xl border border-divider px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c === "direct" ? "Direct" : c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          <Button type="submit" variant="orbi" disabled={saving}>
            ✦ Criar com Orbi
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {campaigns.map((c) => (
          <Card key={c.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-soft px-3 py-1 text-[12px] capitalize">
                  {c.channel}
                </span>
                <p className="text-[15px] font-medium">{c.title}</p>
              </div>
              <span className="text-[12px] text-text-tertiary capitalize">{c.status}</span>
            </div>
            {c.content && (
              <div className="flex items-start gap-2">
                <OrbBadge state="insight" />
                <p className="text-[14px] text-text-secondary">{c.content}</p>
              </div>
            )}
            <div className="mt-1 flex gap-2">
              {c.status === "draft" && (
                <Button variant="secondary" onClick={() => updateStatus(c, "scheduled")}>
                  Agendar
                </Button>
              )}
              {c.status === "scheduled" && (
                <Button variant="secondary" onClick={() => updateStatus(c, "sent")}>
                  Marcar como enviada
                </Button>
              )}
            </div>
          </Card>
        ))}
        {campaigns.length === 0 && (
          <Card className="text-[15px] text-text-secondary">Nenhuma campanha criada ainda.</Card>
        )}
      </div>
    </div>
  );
}
