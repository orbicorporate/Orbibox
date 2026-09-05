"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OrbBadge } from "@/components/ui/OrbBadge";
import { slugify } from "@/lib/utils";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";

type Color = { hex: string; role: string };
type BrandAnalysis = {
  personality: Record<string, number>;
  colors: Color[];
  voiceSummary: string;
  font: string;
  siteAnalyzed?: boolean;
};

async function analyzeBrand(name: string, instagram: string, website: string): Promise<BrandAnalysis> {
  const res = await fetch("/api/analyze-brand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, instagram, website }),
  });
  if (!res.ok) throw new Error("Falha ao analisar marca.");
  return res.json();
}

type Step = "dados" | "analisando" | "confirmar" | "montando" | "resultado";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("dados");
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Estado editável do mini manual de marca
  const [traits, setTraits] = useState<Record<string, number>>({});
  const [voice, setVoice] = useState("");
  const [font, setFont] = useState("Manrope");
  const [colors, setColors] = useState<Color[]>([]);
  const [newColor, setNewColor] = useState("#111318");

  // O que a Orbi entendeu do site — mostrado na tela de resultado, com o
  // porquê explicado, pra nunca ser uma caixa preta.
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    siteType: "ecommerce" | "institucional" | "links" | null;
    motivo: string | null;
    fetchError: string | null;
  } | null>(null);


  async function startAnalysis(e: React.FormEvent) {
    e.preventDefault();
    setStep("analisando");
    try {
      const result = await analyzeBrand(name, instagram, website);
      setTraits(result.personality);
      setVoice(result.voiceSummary);
      setFont(result.font || "Manrope");
      // remove cores duplicadas (mesmo hex)
      const seen = new Set<string>();
      setColors((result.colors || []).filter((c) => {
        const k = c.hex.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }));
      setStep("confirmar");
    } catch {
      setError("Não foi possível analisar sua marca agora. Tente novamente.");
      setStep("dados");
    }
  }

  function addColor() {
    const hex = newColor.match(/^#?[0-9a-fA-F]{6}$/) ? (newColor.startsWith("#") ? newColor : `#${newColor}`) : null;
    if (!hex) return;
    setColors((prev) =>
      prev.some((c) => c.hex.toLowerCase() === hex.toLowerCase()) ? prev : [...prev, { hex, role: "detail" }]
    );
  }
  function updateColor(idx: number, hex: string) {
    setColors((prev) => prev.map((c, i) => (i === idx ? { ...c, hex } : c)));
  }
  function removeColor(idx: number) {
    setColors((prev) => prev.filter((_, i) => i !== idx));
  }

  async function confirmAndCreate() {
    setSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Sessão expirada. Faça login novamente."); setSaving(false); return; }

    const base = slugify(name) || "orbibox";
    // garante slug único: busca os já usados com esse prefixo e escolhe o próximo livre
    const { data: taken } = await supabase.from("businesses").select("slug").like("slug", `${base}%`);
    const used = new Set((taken ?? []).map((t) => t.slug));
    let slug = base;
    for (let i = 2; used.has(slug) && i < 100; i++) slug = `${base}-${i}`;
    if (used.has(slug)) slug = `${base}-${Date.now().toString(36)}`;

    const payload = {
      owner_id: user.id,
      name,
      instagram_handle: instagram || null,
      website_url: website || null,
      brand_personality: traits,
      brand_colors: colors,
      brand_voice_summary: voice,
      brand_font: font,
      onboarding_status: "ready",
    };
    // Rede de segurança: se dois cadastros colidirem ao mesmo tempo, tenta de novo com sufixo único.
    let business: { id: string } | null = null;
    let bizError: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await supabase.from("businesses").insert({ ...payload, slug }).select("id").single();
      business = res.data;
      bizError = res.error;
      if (!bizError) break;
      if (bizError.code !== "23505" && !bizError.message.includes("duplicate")) break;
      slug = `${base}-${Date.now().toString(36).slice(-4)}`;
    }

    if (bizError || !business) {
      const msg = bizError?.message ?? "";
      setError(
        msg.includes("duplicate") ? "Já existe um Orbibox com esse nome. Tente outro."
        : msg.includes("row-level security") ? "Sua sessão expirou. Faça login novamente."
        : "Não foi possível criar seu Orbibox. Tente novamente."
      );
      setSaving(false);
      return;
    }

    await supabase.from("agent_configs").insert({ business_id: business.id, agent_name: "Orbi", objectives: ["vender", "informar"] });
    await supabase.from("pulse_metrics").insert({ business_id: business.id, discovery_score: 62, interest_score: 58, conversion_score: 41, relationship_score: 70, overall_score: 58 });
    // O link do site já foi informado no DNA da Marca — a Orbi importa o catálogo agora,
    // sem pedir a mesma informação duas vezes. O tipo de site que ela descobre aqui
    // decide quais botões da tela inicial fazem sentido pra esse negócio.
    let importados = 0;
    let siteType: "ecommerce" | "institucional" | "links" | null = null;
    let motivo: string | null = null;
    let fetchError: string | null = null;
    if (website.trim()) {
      setStep("montando");
      try {
        const res = await fetch("/api/import-site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: business.id, url: website.trim() }),
        });
        const d = await res.json();
        if (res.ok) {
          importados = d.imported ?? 0;
          siteType = d.siteType ?? null;
          motivo = d.motivo ?? null;
        } else {
          fetchError = d.error ?? "Não consegui ler esse site automaticamente.";
        }
      } catch {
        fetchError = "Não consegui ler esse site automaticamente.";
      }
    }

    // Loja vende, então Comprar e Presentear na frente. Serviço não tem o que
    // "comprar" direto — Conhecer e tirar dúvida importam mais. Sem site, deixa
    // tudo ligado e o dono decide depois em Boxes.
    const ativos =
      siteType === "ecommerce"
        ? { product: true, campaign: true, content: false, agent: true }
        : siteType === "institucional" || siteType === "links"
        ? { product: false, campaign: false, content: true, agent: true }
        : { product: true, campaign: true, content: true, agent: true };

    await supabase.from("smart_boxes").insert([
      { business_id: business.id, box_type: "hero", title: "Entrada Adaptativa", position: 0 },
      { business_id: business.id, box_type: "agent", title: "AgentBox Orbi", position: 1, is_active: ativos.agent },
      { business_id: business.id, box_type: "product", title: "Vitrine de Produtos", position: 2, is_active: ativos.product },
      { business_id: business.id, box_type: "content", title: "História da Marca", position: 3, is_active: ativos.content },
      { business_id: business.id, box_type: "campaign", title: "Seleção de Presentes", position: 4, is_active: ativos.campaign },
    ]);

    // Se a Orbi achou um WhatsApp no site, já cria o botão pronto — o dono só confirma.
    if (siteType) {
      const { data: atualizado } = await supabase.from("businesses").select("contact_whatsapp").eq("id", business.id).maybeSingle();
      if (atualizado?.contact_whatsapp) {
        await supabase.from("smart_boxes").insert({
          business_id: business.id,
          box_type: "custom",
          title: "Fale no WhatsApp",
          position: 5,
          is_active: true,
          config: { label: "Fale no WhatsApp", icon: "☎", action: "whatsapp" },
        });
      }
    }

    const oportunidades = [
      { business_id: business.id, title: "Configure o tom de voz da Orbi", description: "Defina como a assistente deve conversar com seus visitantes.", category: "relacionamento", impact_score: 65 },
    ];
    if (importados > 0) {
      oportunidades.unshift({
        business_id: business.id,
        title: "Revise sua vitrine",
        description: `A Orbi importou ${importados} ${importados === 1 ? "item" : "itens"} do seu site. Ajuste formato, cor e imagem de cada box.`,
        category: "descoberta",
        impact_score: 92,
      });
    } else {
      oportunidades.unshift({
        business_id: business.id,
        title: "Importe seu catálogo",
        description: "Cole o link do seu site na Vitrine — a Orbi transforma seus produtos em boxes automaticamente.",
        category: "descoberta",
        impact_score: 92,
      });
    }
    await supabase.from("opportunities").insert(oportunidades);

    setImportSummary({ imported: importados, siteType, motivo, fetchError });
    setStep("resultado");
  }

  function goToApp() {
    router.push(importSummary && importSummary.imported > 0 ? "/admin/vitrine" : "/admin");
    router.refresh();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16">
      <button
        onClick={handleSignOut}
        className="fixed right-4 top-4 z-10 rounded-full bg-surface-white px-3.5 py-2 text-[12px] font-medium text-text-secondary shadow-[0_2px_10px_rgba(17,19,24,0.08)]"
      >
        Sair
      </button>
      <Card className="w-full max-w-lg">
        {step === "dados" && (
          <>
            <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-medium tracking-[-0.01em]">DNA da Marca</h1>
            <p className="mt-1 text-[15px] text-text-secondary">A Orbi vai ler seu site para montar o manual da sua marca e já trazer seus produtos.</p>
            <form onSubmit={startAnalysis} className="mt-8 flex flex-col gap-4">
              <input required placeholder="Nome do negócio" value={name} onChange={(e) => setName(e.target.value)} className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              <input placeholder="@seuinstagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              <input placeholder="seusite.com.br — de onde vêm seus produtos" value={website} onChange={(e) => setWebsite(e.target.value)} className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              <Button type="submit" variant="orbi">✦ Analisar com Orbi</Button>
            </form>
          </>
        )}

        {step === "analisando" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <OrbiOrb size={120} />
            <p className="mt-2 text-[15px] text-text-secondary">A Orbi está lendo sua marca — extraindo personalidade, paleta, tom de voz e tipografia…</p>
          </div>
        )}

        {step === "montando" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <OrbiOrb size={120} />
            <p className="mt-2 text-[15px] text-text-secondary">
              A Orbi está lendo {website || "seu site"} e montando sua vitrine — isso leva alguns segundos…
            </p>
          </div>
        )}

        {step === "resultado" && importSummary && (
          <div className="flex flex-col gap-5 py-2">
            <div className="mx-auto"><OrbiOrb size={88} /></div>

            {importSummary.fetchError ? (
              <>
                <h1 className="text-center font-[family-name:var(--font-manrope)] text-[22px] font-medium">
                  Não consegui ler seu site sozinha
                </h1>
                <p className="text-center text-[14px] text-text-secondary">
                  {importSummary.fetchError} Isso costuma acontecer quando o site bloqueia acesso automático — sem problema,
                  você monta a vitrine na mão em poucos minutos, ou tenta importar de novo depois em Configurações.
                </p>
              </>
            ) : importSummary.imported > 0 ? (
              <>
                <h1 className="text-center font-[family-name:var(--font-manrope)] text-[22px] font-medium">
                  Entendi seu negócio
                </h1>
                <div className="rounded-2xl bg-surface-soft p-4">
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">
                    {importSummary.siteType === "ecommerce" ? "Loja virtual" : importSummary.siteType === "institucional" ? "Site institucional" : "Página de links"}
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
                    {importSummary.motivo ?? "Analisei a estrutura do seu site para chegar nessa conclusão."}
                  </p>
                </div>
                <p className="text-[14px] leading-relaxed text-text-secondary">
                  {importSummary.siteType === "ecommerce" ? (
                    <>Organizei sua vitrine em <b>{importSummary.imported} categorias</b> — não em produto por produto, pra não ficar longo demais. Cada uma leva o visitante direto pra página certa no seu site.</>
                  ) : (
                    <>Criei <b>{importSummary.imported} {importSummary.imported === 1 ? "box" : "boxes"}</b> na sua vitrine, um pra cada serviço ou produto que encontrei.</>
                  )}
                </p>
              </>
            ) : !website.trim() ? (
              <>
                <h1 className="text-center font-[family-name:var(--font-manrope)] text-[22px] font-medium">Tudo pronto</h1>
                <p className="text-center text-[14px] text-text-secondary">
                  Você não passou um site, então a vitrine começa vazia — monta ela do seu jeito quando quiser.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-center font-[family-name:var(--font-manrope)] text-[22px] font-medium">Tudo pronto</h1>
                <p className="text-center text-[14px] text-text-secondary">
                  Não encontrei itens claros pra importar — sem problema, você adiciona na Vitrine quando quiser.
                </p>
              </>
            )}

            <div className="rounded-2xl border border-divider p-4">
              <p className="text-[13px] font-medium">✦ A Orbi já está pronta pra atender</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
                Ela já sabe o que seu negócio faz, recomenda produtos ou serviços, conversa com quem visita seu link e
                pode direcionar pra você quando o cliente precisar de atendimento humano de verdade.
              </p>
            </div>

            <Button onClick={goToApp} variant="orbi">Ir para o meu Orbibox →</Button>
          </div>
        )}

        {step === "confirmar" && (
          <>
            <div className="flex items-center gap-2"><OrbBadge state="done" label="Mini manual da marca" /></div>
            <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[24px] font-medium">{name || "Sua marca"}</h1>
            <p className="mt-1 text-[13px] text-text-tertiary">A Orbi sugeriu isto — ajuste tudo como quiser antes de confirmar.</p>

            {/* Personalidade */}
            <p className="mt-6 text-[13px] font-medium uppercase tracking-wide text-text-tertiary">Personalidade</p>
            <div className="mt-3 flex flex-col gap-4">
              {Object.entries(traits).map(([trait, value]) => (
                <div key={trait}>
                  <div className="flex justify-between text-[13px] text-text-secondary capitalize"><span>{trait}</span><span>{Math.round(value * 100)}%</span></div>
                  <input type="range" min={0} max={100} value={Math.round(value * 100)} onChange={(e) => setTraits((p) => ({ ...p, [trait]: Number(e.target.value) / 100 }))} className="mt-1 w-full accent-[#111318]" />
                </div>
              ))}
            </div>

            {/* Paleta editável — toque na cor pra trocar, × pra remover */}
            <p className="mt-7 text-[13px] font-medium uppercase tracking-wide text-text-tertiary">Paleta de cores</p>
            <p className="mt-1 text-[12px] text-text-tertiary">Toque numa cor para trocar. Use × para remover.</p>
            <div className="mt-3 flex flex-wrap items-start gap-4">
              {colors.map((c, i) => (
                <div key={i} className="relative flex flex-col items-center gap-1">
                  <label className="relative block h-12 w-12 cursor-pointer">
                    <span className="block h-12 w-12 rounded-full border border-divider shadow-[inset_0_0_0_2px_rgba(255,255,255,0.7)]" style={{ backgroundColor: c.hex }} />
                    <input
                      type="color"
                      value={c.hex}
                      onChange={(e) => updateColor(i, e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label={`Editar cor ${c.hex}`}
                    />
                  </label>
                  <span className="text-[10px] uppercase text-text-tertiary">{c.hex}</span>
                  <button
                    type="button"
                    onClick={() => removeColor(i)}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-on-background text-[13px] leading-none text-white shadow"
                    aria-label="Remover cor"
                  >
                    ×
                  </button>
                </div>
              ))}
              {/* Adicionar nova cor: escolhe no picker e confirma */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <label className="relative block h-12 w-12 cursor-pointer">
                    <span className="block h-12 w-12 rounded-full border-2 border-dashed border-divider" style={{ backgroundColor: newColor }} />
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Escolher nova cor"
                    />
                  </label>
                  <button type="button" onClick={addColor} className="rounded-full bg-on-background px-3 py-2 text-[12px] font-medium text-white">
                    + Adicionar
                  </button>
                </div>
                <span className="text-[10px] text-text-tertiary">nova cor</span>
              </div>
            </div>

            {/* Tipografia */}
            <p className="mt-7 text-[13px] font-medium uppercase tracking-wide text-text-tertiary">Tipografia sugerida</p>
            <div className="mt-2 flex items-center gap-3">
              <input value={font} onChange={(e) => setFont(e.target.value)} className="flex-1 rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background" />
            </div>
            <p className="mt-1 text-[12px] text-text-tertiary">Fonte do Google Fonts que combina com a marca. Você pode trocar.</p>

            {/* Tom de voz */}
            <p className="mt-7 text-[13px] font-medium uppercase tracking-wide text-text-tertiary">Tom de voz</p>
            <textarea value={voice} onChange={(e) => setVoice(e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[14px] text-text-secondary outline-none focus:border-on-background" />

            {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
            <Button className="mt-7 w-full" onClick={confirmAndCreate} disabled={saving}>{saving ? "Criando seu Orbibox…" : "Confirmar e continuar"}</Button>
          </>
        )}
      </Card>
    </main>
  );
}
