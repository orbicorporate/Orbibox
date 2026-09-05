"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Campaign = { id: string; title: string; channel: string; content: string | null; status: string; };
type PickItem = { id: string; title: string; price: number | null; image_url: string | null; brand_label: string | null };

const CHANNELS = [{ key: "instagram", label: "Instagram" }, { key: "whatsapp", label: "WhatsApp" }, { key: "direct", label: "Direct" }] as const;
const TIMINGS = [{ key: "now", label: "Agora" }, { key: "21h", label: "21h hoje", best: true }, { key: "tomorrow", label: "Amanhã" }, { key: "custom", label: "Personalizar" }];

export function CampaignsManager({ businessId, initialCampaigns, contentOptions }: { businessId: string; initialCampaigns: Campaign[]; contentOptions: PickItem[]; }) {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [pick, setPick] = useState<PickItem | null>(contentOptions[0] ?? null);
  const [channel, setChannel] = useState<string>("instagram");
  const [timing, setTiming] = useState<string>("21h");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const others = contentOptions.filter((c) => c.id !== pick?.id).slice(0, 4);

  async function schedule() {
    if (!pick) return;
    setSaving(true);
    let suggestion = `Promover "${pick.title}" às ${timing === "21h" ? "21h" : timing}.`;
    try {
      const res = await fetch("/api/suggest-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, channel, title: pick.title }),
      });
      if (res.ok) { const d = await res.json(); if (d.content) suggestion = d.content; }
    } catch {}
    const { data, error } = await supabase
      .from("campaigns")
      .insert({ business_id: businessId, title: pick.title, channel, status: "scheduled", ai_recommended_time: timing === "21h", content: suggestion, recommended_content_id: pick.id })
      .select()
      .single();
    setSaving(false);
    if (!error && data) { setCampaigns((p) => [data as Campaign, ...p]); setDone(`Campanha agendada para ${TIMINGS.find(t => t.key === timing)?.label} ✦`); }
  }

  return (
    <div className="mt-5 flex flex-col gap-6">
      {/* Orbi PickItem */}
      {pick ? (
        <div className="overflow-hidden rounded-[28px] border-[1.5px] border-orbi-gradient-start bg-surface-white">
          <div className="relative">
            {pick.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pick.image_url} alt={pick.title} className="h-56 w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
            )}
            <span className="absolute left-3 top-3 rounded-full bg-surface-white/95 px-3 py-1 text-[11px] font-medium">✦ Orbi Pick</span>
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-[family-name:var(--font-manrope)] text-[18px] font-medium">{pick.title}</p>
                {pick.brand_label && <p className="text-[13px] text-text-tertiary">{pick.brand_label}</p>}
              </div>
              {pick.price != null && <p className="font-[family-name:var(--font-manrope)] text-[16px] font-medium">R$ {Number(pick.price).toFixed(0)}</p>}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-orbi-gradient-start" /> Recomendado pela Orbi esta semana
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-[28px] border border-divider bg-surface-white p-5 text-[14px] text-text-secondary">
          Publique itens na Vitrine para a Orbi sugerir o que movimentar.
        </div>
      )}

      {/* Outras oportunidades */}
      {others.length > 0 && (
        <div>
          <p className="text-[13px] text-text-tertiary">Outras Oportunidades</p>
          <div className="mt-2 flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {others.map((o) => (
              <button key={o.id} onClick={() => setPick(o)} className="flex w-40 shrink-0 items-center gap-2 rounded-2xl border border-divider bg-surface-white p-2 text-left">
                {o.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.image_url} alt="" className="h-12 w-12 rounded-xl object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                )}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{o.title}</p>
                  {o.brand_label && <p className="truncate text-[11px] text-text-tertiary">{o.brand_label}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Canais */}
      <div>
        <p className="text-[13px] text-text-tertiary">Canais de Ativação</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button key={c.key} onClick={() => setChannel(c.key)} className={`rounded-full px-4 py-2 text-[13px] ${channel === c.key ? "bg-button-primary text-white" : "border border-divider bg-surface-white text-text-secondary"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timing */}
      <div>
        <p className="text-[13px] text-text-tertiary">Timing</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {TIMINGS.map((t) => (
            <button key={t.key} onClick={() => setTiming(t.key)} className={`rounded-2xl px-4 py-3 text-left text-[14px] ${timing === t.key ? "bg-button-primary text-white" : "border border-divider bg-surface-white text-text-secondary"}`}>
              <span className="block font-medium">{t.label}</span>
              {t.best && <span className={`text-[11px] ${timing === t.key ? "text-orbi-gradient-start" : "text-text-tertiary"}`}>✦ Melhor horário</span>}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-2xl bg-on-background p-4 text-[13px] leading-relaxed text-white">
          <span className="text-orbi-gradient-start">✦</span> Seu público costuma responder melhor entre 20h30 e 22h. Agendar para este horário aumenta a chance de conversão.
        </div>
      </div>

      <button onClick={schedule} disabled={!pick || saving} className="rounded-full bg-button-primary py-4 text-[15px] font-medium text-white disabled:opacity-40">
        {saving ? "Agendando…" : "Agendar →"}
      </button>
      {done && <p className="text-center text-[13px] text-text-secondary">{done}</p>}

      {/* Histórico */}
      {campaigns.length > 0 && (
        <div>
          <p className="text-[13px] text-text-tertiary">Campanhas recentes</p>
          <div className="mt-2 flex flex-col gap-2">
            {campaigns.slice(0, 5).map((c) => (
              <div key={c.id} className="rounded-2xl border border-divider bg-surface-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-medium">{c.title}</p>
                  <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] capitalize">{c.channel} · {c.status}</span>
                </div>
                {c.content && <p className="mt-1 text-[12px] text-text-secondary">{c.content}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
