"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OrbBadge } from "@/components/ui/OrbBadge";
import { slugify } from "@/lib/utils";

// Paleta e traços de personalidade "detectados" — heurística local enquanto
// não plugamos um provedor real de análise de site/Instagram.
const PALETTES = [
  [{ hex: "#1c1b1c", role: "primary" }, { hex: "#B7F34A", role: "accent" }, { hex: "#F7F7F4", role: "background" }],
  [{ hex: "#2b2620", role: "primary" }, { hex: "#6EE7D8", role: "accent" }, { hex: "#F7F7F4", role: "background" }],
  [{ hex: "#111318", role: "primary" }, { hex: "#E8B4A0", role: "accent" }, { hex: "#FFFFFF", role: "background" }],
];

function analyzeBrand(name: string, instagram: string, website: string) {
  const seed = (name + instagram + website).length;
  return {
    personality: {
      energetica: Math.min(0.95, 0.3 + ((seed * 7) % 70) / 100),
      proxima: Math.min(0.95, 0.3 + ((seed * 13) % 70) / 100),
      visual: Math.min(0.95, 0.3 + ((seed * 19) % 70) / 100),
      direta: Math.min(0.95, 0.3 + ((seed * 5) % 70) / 100),
    },
    colors: PALETTES[seed % PALETTES.length],
    voiceSummary:
      "Tom próximo e visual, com linguagem direta — ideal para conversão rápida e conteúdo em formato de story.",
  };
}

type Step = "dados" | "analisando" | "confirmar";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("dados");
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeBrand> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function startAnalysis(e: React.FormEvent) {
    e.preventDefault();
    setStep("analisando");
    setTimeout(() => {
      setAnalysis(analyzeBrand(name, instagram, website));
      setStep("confirmar");
    }, 1600);
  }

  async function confirmAndCreate() {
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada. Faça login novamente.");
      setSaving(false);
      return;
    }

    const slug = slugify(name) || `orbibox-${Date.now()}`;
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .insert({
        owner_id: user.id,
        name,
        slug,
        instagram_handle: instagram || null,
        website_url: website || null,
        brand_personality: analysis!.personality,
        brand_colors: analysis!.colors,
        brand_voice_summary: analysis!.voiceSummary,
        onboarding_status: "ready",
      })
      .select()
      .single();

    if (bizError || !business) {
      setError(bizError?.message ?? "Não foi possível criar seu Orbibox.");
      setSaving(false);
      return;
    }

    await supabase.from("agent_configs").insert({
      business_id: business.id,
      agent_name: "Zara",
      objectives: ["vender", "informar"],
    });

    await supabase.from("smart_boxes").insert([
      { business_id: business.id, box_type: "hero", title: "Entrada Adaptativa", position: 0 },
      { business_id: business.id, box_type: "agent", title: "AgentBox Zara", position: 1 },
      { business_id: business.id, box_type: "product", title: "Vitrine de Produtos", position: 2 },
    ]);

    await supabase.from("pulse_metrics").insert({
      business_id: business.id,
      discovery_score: 62,
      interest_score: 58,
      conversion_score: 41,
      relationship_score: 70,
      overall_score: 58,
    });

    await supabase.from("opportunities").insert([
      {
        business_id: business.id,
        title: "Publique seu primeiro produto",
        description: "Seu Orbibox ainda não tem conteúdo publicado — a Orbi não tem o que recomendar aos visitantes.",
        category: "descoberta",
        impact_score: 90,
      },
      {
        business_id: business.id,
        title: "Configure o tom de voz da Zara",
        description: "Defina como a assistente deve conversar com seus visitantes para manter a identidade da marca.",
        category: "relacionamento",
        impact_score: 65,
      },
    ]);

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg">
        {step === "dados" && (
          <>
            <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-medium tracking-[-0.01em]">
              DNA da Marca
            </h1>
            <p className="mt-1 text-[15px] text-text-secondary">
              A Orbi vai analisar seu site e Instagram para extrair a essência da sua marca.
            </p>
            <form onSubmit={startAnalysis} className="mt-8 flex flex-col gap-4">
              <input
                required
                placeholder="Nome do negócio"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
              />
              <input
                placeholder="@seuinstagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
              />
              <input
                placeholder="seusite.com.br (opcional)"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
              />
              <Button type="submit" variant="orbi">
                ✦ Analisar com Orbi
              </Button>
            </form>
          </>
        )}

        {step === "analisando" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="h-16 w-16 animate-pulse rounded-full orbi-gradient" />
            <p className="text-[15px] text-text-secondary">
              A Orbi está lendo sua marca — extraindo tom de voz, paleta e personalidade…
            </p>
          </div>
        )}

        {step === "confirmar" && analysis && (
          <>
            <div className="flex items-center gap-2">
              <OrbBadge state="done" label="Análise concluída" />
            </div>
            <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[24px] font-medium">
              Personalidade da marca
            </h1>
            <div className="mt-4 flex flex-col gap-3">
              {Object.entries(analysis.personality).map(([trait, value]) => (
                <div key={trait}>
                  <div className="flex justify-between text-[13px] text-text-secondary capitalize">
                    <span>{trait}</span>
                    <span>{Math.round(value * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-surface-soft">
                    <div
                      className="h-1.5 rounded-full orbi-gradient"
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              {analysis.colors.map((c) => (
                <div key={c.hex} className="flex flex-col items-center gap-1">
                  <div
                    className="h-10 w-10 rounded-full border border-divider"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-[11px] text-text-tertiary">{c.role}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[14px] text-text-secondary">{analysis.voiceSummary}</p>
            {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
            <Button className="mt-8 w-full" onClick={confirmAndCreate} disabled={saving}>
              {saving ? "Criando seu Orbibox…" : "Confirmar e continuar"}
            </Button>
          </>
        )}
      </Card>
    </main>
  );
}
