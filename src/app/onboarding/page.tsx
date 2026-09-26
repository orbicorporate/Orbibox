"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { OrbBadge } from "@/components/ui/OrbBadge";
import { slugify } from "@/lib/utils";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { coresDaOrbi } from "@/lib/orbiCores";
import { colorOf } from "@/lib/showcase";
import { AnaliseAoVivo, BrandOrb, EssenciaDaMarca, VitrineMontando, type Analise, type Descoberta, type ItemMontado, type PontoForte } from "./MagicScreens";

type Color = { hex: string; role: string };
type BrandAnalysis = {
  personality: Record<string, number>;
  colors: Color[];
  voiceSummary: string;
  font: string;
  siteAnalyzed?: boolean;
  resumo?: string;
  pontosFortes?: PontoForte[];
};

async function analyzeBrand(name: string, instagram: string, website: string, descricao: string): Promise<BrandAnalysis> {
  const res = await fetch("/api/analyze-brand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, instagram, website, descricao }),
  });
  if (!res.ok) throw new Error("Falha ao analisar marca.");
  return res.json();
}

type Step = "dados" | "analisando" | "essencia" | "confirmar" | "montando" | "resultado";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("dados");
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [bizId, setBizId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Estado editável do mini manual de marca
  const [traits, setTraits] = useState<Record<string, number>>({});
  const [voice, setVoice] = useState("");
  const [font, setFont] = useState("Manrope");
  const [colors, setColors] = useState<Color[]>([]);
  const [newColor, setNewColor] = useState("#111318");

  // Telas mágicas: o que a leitura rápida achou, o resultado da análise,
  // e a vitrine sendo montada.
  const [descoberta, setDescoberta] = useState<Descoberta>({ status: "pending" });
  const [analise, setAnalise] = useState<Analise>({ status: "pending" });
  const [montagem, setMontagem] = useState<{ status: "pending" | "ok"; itens: ItemMontado[]; segundos: number | null }>({ status: "pending", itens: [], segundos: null });
  const orbColors = useMemo(() => coresDaOrbi(colors), [colors]);
  const alvo = useMemo(() => {
    if (website.trim()) return website.trim().replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
    const ig = instagram.trim().replace(/^.*instagram\.com\//i, "").replace(/[/?].*$/, "").replace(/^@/, "");
    return ig ? `@${ig}` : null;
  }, [website, instagram]);
  const pontosRef = useRef(0);
  // Essência da marca (resumo + pontos fortes), editável antes do manual.
  const [resumo, setResumo] = useState("");
  const [pontos, setPontos] = useState<PontoForte[]>([]);
  const irParaConfirmar = useCallback(() => setStep(pontosRef.current > 0 ? "essencia" : "confirmar"), []);
  // Veio do painel pra criar outro Orbibox (plano com vários negócios)?
  const novoNegocio = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("novo") === "1",
    () => false,
  );

  // O que a Orbi entendeu do site, mostrado na tela de resultado, com o
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
    setDescoberta({ status: "pending" });
    setAnalise({ status: "pending" });
    // Leitura rápida em paralelo: alimenta a tela ao vivo (fotos, palavras).
    if (website.trim() || instagram.trim()) {
      fetch("/api/descobrir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: website.trim(), instagram: instagram.trim() }),
      })
        .then((r) => r.json())
        .then((d) => setDescoberta(d?.ok ? { status: "ok", palavras: d.palavras ?? 0, imagens: d.imagens ?? [], fonte: d.fonte, host: d.host } : { status: "fail" }))
        .catch(() => setDescoberta({ status: "fail" }));
    }
    try {
      const result = await analyzeBrand(name, instagram, website, description);
      setResumo(result.resumo ?? "");
      setPontos(result.pontosFortes ?? []);
      pontosRef.current = (result.pontosFortes ?? []).length;
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
      const unicas = (result.colors || []).filter((c, i, arr) => arr.findIndex((x) => x.hex.toLowerCase() === c.hex.toLowerCase()) === i);
      // A tela ao vivo mostra isso e, quando terminar, vai pra confirmação.
      setAnalise({ status: "ok", voice: result.voiceSummary, font: result.font || "Manrope", paleta: unicas.map((c) => c.hex), orbColors: coresDaOrbi(unicas) });
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

  async function importarSite(id: string): Promise<{ imported: number; siteType: "ecommerce" | "institucional" | "links" | null; motivo: string | null; fetchError: string | null }> {
    try {
      const res = await fetch("/api/import-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id, url: website.trim(), instagram: instagram.trim() }),
      });
      const d = await res.json();
      if (res.ok) return { imported: d.imported ?? 0, siteType: d.siteType ?? null, motivo: d.motivo ?? null, fetchError: null };
      return { imported: 0, siteType: null, motivo: null, fetchError: d.error ?? "Não consegui ler esse site automaticamente." };
    } catch {
      return { imported: 0, siteType: null, motivo: null, fetchError: "Não consegui ler esse site automaticamente." };
    }
  }

  async function tentarDeNovo() {
    if (!bizId) return;
    setRetrying(true);
    const r = await importarSite(bizId);
    setRetrying(false);
    setImportSummary(r);
  }

  async function confirmAndCreate() {
    const inicio = Date.now();
    setMontagem({ status: "pending", itens: [], segundos: null });
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

    // Contatos opcionais do DNA da Marca, normalizados pra virarem boxes
    // prontos no painel (o dono só revisa).
    const whatsappDigits = (() => {
      const d = whatsapp.replace(/\D/g, "");
      if (d.length < 10) return "";
      return d.startsWith("55") ? d : `55${d}`;
    })();
    const comHttps = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
    const siteUrl = website.trim() ? comHttps(website.trim()) : null;
    const instagramUrl = (() => {
      const v = instagram.trim();
      if (!v) return null;
      if (/instagram\.com/i.test(v)) return comHttps(v.replace(/^https?:\/\//i, ""));
      return `https://instagram.com/${v.replace(/^@/, "")}`;
    })();
    const linkedinUrl = (() => {
      const v = linkedin.trim();
      if (!v) return null;
      if (/linkedin\.com/i.test(v)) return comHttps(v.replace(/^https?:\/\//i, ""));
      return `https://www.linkedin.com/company/${v.replace(/^@/, "")}`;
    })();

    const pontosValidos = pontos
      .map((p) => ({ icon: p.icon || "✦", title: p.title.trim(), description: p.description.trim() }))
      .filter((p) => p.title);

    const payload = {
      owner_id: user.id,
      name,
      instagram_handle: instagram || null,
      website_url: website || null,
      // O que o dono escreveu vem primeiro; o resumo revisado completa.
      about_business: [description.trim(), resumo.trim()].filter(Boolean).join("\n\n") || null,
      ...(pontosValidos.length
        ? {
            differentials_cards: pontosValidos,
            differentials: pontosValidos.map((p) => (p.description ? `${p.title}: ${p.description}` : p.title)).join("\n"),
          }
        : {}),
      contact_whatsapp: whatsappDigits || null,
      contact_site: siteUrl,
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

    // A esfera da Orbi já nasce com as cores da marca.
    // O painel passa a abrir este negócio (importante quando a conta tem vários).
    document.cookie = `orbi_negocio=${business.id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    await supabase.from("agent_configs").insert({ business_id: business.id, agent_name: "Orbi", objectives: ["vender", "informar"], ...(orbColors ? { orbi_colors: orbColors } : {}) });
    await supabase.from("pulse_metrics").insert({ business_id: business.id, discovery_score: 62, interest_score: 58, conversion_score: 41, relationship_score: 70, overall_score: 58 });
    // O link do site já foi informado no DNA da Marca, a Orbi importa o catálogo agora,
    // sem pedir a mesma informação duas vezes. O tipo de site que ela descobre aqui
    // decide quais botões da tela inicial fazem sentido pra esse negócio.
    let importados = 0;
    let siteType: "ecommerce" | "institucional" | "links" | null = null;
    let motivo: string | null = null;
    let fetchError: string | null = null;
    if (website.trim() || instagram.trim()) {
      setStep("montando");
      setBizId(business.id);
      // Tenta duas vezes antes de mostrar qualquer aviso: a maioria das
      // falhas é passageira (site lento, instabilidade).
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        const r = await importarSite(business.id);
        importados = r.imported; siteType = r.siteType; motivo = r.motivo; fetchError = r.fetchError;
        if (!fetchError) break;
      }
    }

    // Loja vende, então Comprar na frente. Serviço não tem o que "comprar"
    // direto, Conhecer e tirar dúvida importam mais. Sem site, deixa tudo
    // ligado e o dono decide depois em Boxes. O box de Presentear nasce
    // sempre desligado agora: "para presente" virou uma opção dentro da
    // pergunta de curadoria da Orbi, não um botão à parte na tela inicial.
    const ativos =
      siteType === "ecommerce"
        ? { product: true, campaign: false, content: false, agent: true }
        : siteType === "institucional" || siteType === "links"
        ? { product: false, campaign: false, content: true, agent: true }
        : { product: true, campaign: false, content: true, agent: true };

    await supabase.from("smart_boxes").insert([
      { business_id: business.id, box_type: "hero", title: "Entrada Adaptativa", position: 0 },
      { business_id: business.id, box_type: "agent", title: "AgentBox Orbi", position: 1, is_active: ativos.agent },
      { business_id: business.id, box_type: "product", title: "Vitrine de Produtos", position: 2, is_active: ativos.product },
      { business_id: business.id, box_type: "content", title: "História da Marca", position: 3, is_active: ativos.content },
      { business_id: business.id, box_type: "campaign", title: "Seleção de Presentes", position: 4, is_active: ativos.campaign },
    ]);

    // Boxes de contato prontos: WhatsApp (digitado ou achado no site),
    // Instagram, LinkedIn e site. Entram ativos, o dono só revisa em Boxes.
    let waFinal = whatsappDigits;
    if (!waFinal && siteType) {
      const { data: atualizado } = await supabase.from("businesses").select("contact_whatsapp").eq("id", business.id).maybeSingle();
      waFinal = atualizado?.contact_whatsapp ?? "";
    }
    const contatos: { title: string; config: { [k: string]: string } }[] = [];
    if (waFinal) contatos.push({ title: "Fale no WhatsApp", config: { label: "Fale no WhatsApp", subtitle: "Atendimento rápido", icon: "__wadisc__", color: "transparent", action: "whatsapp", url: "" } });
    if (instagramUrl) contatos.push({ title: "Instagram", config: { label: "Instagram", subtitle: "Siga a gente", icon: "@", color: "#111318", action: "link", url: instagramUrl } });
    if (linkedinUrl) contatos.push({ title: "LinkedIn", config: { label: "LinkedIn", subtitle: "Conheça a empresa", icon: "👤\uFE0E", color: "#111318", action: "link", url: linkedinUrl } });
    if (siteUrl) contatos.push({ title: "Nosso site", config: { label: "Nosso site", subtitle: siteUrl.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""), icon: "➜", color: "#111318", action: "link", url: siteUrl } });
    if (contatos.length) {
      await supabase.from("smart_boxes").insert(
        contatos.map((c, i) => ({ business_id: business!.id, box_type: "custom", title: c.title, position: 5 + i, is_active: true, config: c.config })),
      );
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
        description: "Cole o link do seu site na Vitrine, a Orbi transforma seus produtos em boxes automaticamente.",
        category: "descoberta",
        impact_score: 92,
      });
    }
    await supabase.from("opportunities").insert(oportunidades);

    setImportSummary({ imported: importados, siteType, motivo, fetchError });
    // Importou: mostra a vitrine se montando no celular, com os itens reais.
    if (importados > 0 && !fetchError) {
      const { data: criados } = await supabase
        .from("content_items")
        .select("title, image_url, box_color")
        .eq("business_id", business.id)
        .order("position", { ascending: true })
        .limit(7);
      const itens: ItemMontado[] = (criados ?? []).map((c) => {
        const cor = colorOf(c.box_color);
        return { title: c.title, image_url: c.image_url, bg: cor.bg, fg: cor.fg };
      });
      setMontagem({ status: "ok", itens, segundos: Math.max(1, Math.round((Date.now() - inicio) / 1000)) });
      return;
    }
    setStep("resultado");
  }

  function goToApp() {
    router.push(novoNegocio ? "/admin" : "/admin/apresentacao");
    router.refresh();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className={`relative flex min-h-screen justify-center px-6 ${step === "analisando" ? "items-start pb-16 pt-[9vh]" : "items-center py-16"}`}>
      {novoNegocio && step === "dados" ? (
        <Link
          href="/admin"
          className="fixed right-4 top-4 z-10 rounded-full bg-surface-white px-3.5 py-2 text-[12px] font-medium text-text-secondary shadow-[0_2px_10px_rgba(17,19,24,0.08)]"
        >
          ← Voltar ao painel
        </Link>
      ) : (
        <button
          onClick={handleSignOut}
          className="fixed right-4 top-4 z-10 rounded-full bg-surface-white px-3.5 py-2 text-[12px] font-medium text-text-secondary shadow-[0_2px_10px_rgba(17,19,24,0.08)]"
        >
          Sair
        </button>
      )}
      <div className="w-full max-w-lg">
        {step === "dados" && (
          <>
            {novoNegocio && <p className="mb-2 text-[13px] font-medium text-text-tertiary">Novo Orbibox</p>}
            <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-medium tracking-[-0.01em]">DNA da Marca</h1>
            <p className="mt-1 text-[15px] text-text-secondary">A Orbi lê seu site (ou seu Instagram, se não tiver site) pra montar o manual da sua marca e trazer seus produtos. Os links e o WhatsApp já viram botões prontos na sua página.</p>
            <form onSubmit={startAnalysis} className="mt-8 flex flex-col gap-4">
              <input required placeholder="Nome do negócio" value={name} onChange={(e) => setName(e.target.value)} className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              <input placeholder="@seuinstagram (opcional)" value={instagram} onChange={(e) => setInstagram(e.target.value)} className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              <input placeholder="seusite.com.br (opcional, de onde vêm seus produtos)" value={website} onChange={(e) => setWebsite(e.target.value)} className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              <input placeholder="WhatsApp com DDD (opcional)" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              <input placeholder="LinkedIn da empresa (opcional)" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              <textarea
                placeholder="Em poucas palavras, o que vocês fazem? (a Orbi usa isso pra conversar com seus clientes, mesmo sem site)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
              />
              <Button type="submit" variant="orbi">✦ Analisar com Orbi</Button>
            </form>
          </>
        )}

        {step === "analisando" && (
          <AnaliseAoVivo nome={name} alvo={alvo} descoberta={descoberta} analise={analise} onDone={irParaConfirmar} />
        )}

        {step === "montando" && (
          <VitrineMontando
            nome={name}
            alvo={alvo ?? "sua marca"}
            orbColors={orbColors}
            status={montagem.status}
            itens={montagem.itens}
            segundos={montagem.segundos}
            onContinuar={() => setStep("resultado")}
          />
        )}

        {step === "resultado" && importSummary && (
          <div className="flex flex-col gap-5 py-2">
            <div className="mx-auto"><OrbiOrb size={88} colors={orbColors} /></div>

            {importSummary.fetchError ? (
              <>
                <h1 className="text-center font-[family-name:var(--font-manrope)] text-[22px] font-medium">
                  Quase lá
                </h1>
                <p className="text-center text-[14px] text-text-secondary">
                  {importSummary.fetchError} Você pode tentar de novo, ou seguir e importar depois pela Vitrine.
                </p>
                <button
                  type="button"
                  onClick={tentarDeNovo}
                  disabled={retrying}
                  className="mx-auto rounded-full border border-divider bg-surface-white px-5 py-2.5 text-[14px] font-medium disabled:opacity-60"
                >
                  {retrying ? "Lendo de novo…" : "Tentar de novo"}
                </button>
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
                    <>Organizei sua vitrine em <b>{importSummary.imported} categorias</b>, não em produto por produto, pra não ficar longo demais. Cada uma leva o visitante direto pra página certa no seu site.</>
                  ) : (
                    <>Criei <b>{importSummary.imported} {importSummary.imported === 1 ? "box" : "boxes"}</b> na sua vitrine, um pra cada serviço ou produto que encontrei.</>
                  )}
                </p>
              </>
            ) : !website.trim() && !instagram.trim() ? (
              <>
                <h1 className="text-center font-[family-name:var(--font-manrope)] text-[22px] font-medium">Tudo pronto</h1>
                <p className="text-center text-[14px] text-text-secondary">
                  Você não passou site nem Instagram, então a vitrine começa vazia, monta ela do seu jeito quando quiser.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-center font-[family-name:var(--font-manrope)] text-[22px] font-medium">Tudo pronto</h1>
                <p className="text-center text-[14px] text-text-secondary">
                  Não encontrei itens claros pra importar, sem problema, você adiciona na Vitrine quando quiser.
                </p>
              </>
            )}

            <div className="rounded-2xl border border-divider p-4">
              {description.trim() || (importSummary.siteType && !importSummary.fetchError) ? (
                <>
                  <p className="text-[13px] font-medium">✦ A Orbi já está pronta pra atender</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
                    Ela já sabe o que seu negócio faz, recomenda produtos ou serviços, conversa com quem visita seu link e
                    pode direcionar pra você quando o cliente precisar de atendimento humano de verdade.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-medium">✦ A Orbi ainda não conhece seu negócio</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
                    Sem site nem descrição, ela não sabe o que responder pros seus clientes ainda. Leva 30 segundos pra
                    resolver, vale a pena antes de compartilhar seu link.
                  </p>
                  <Link href="/admin/boxes" className="mt-3 inline-block text-[13px] font-medium underline">
                    Contar sobre o negócio →
                  </Link>
                </>
              )}
            </div>

            <Button onClick={goToApp} variant="orbi">Ir para o meu Orbibox →</Button>
          </div>
        )}

        {step === "essencia" && (
          <EssenciaDaMarca
            nome={name}
            orbColors={orbColors}
            resumo={resumo}
            onResumo={setResumo}
            pontos={pontos}
            onPontos={setPontos}
            onContinuar={() => setStep("confirmar")}
          />
        )}

        {step === "confirmar" && (
          <>
            {/* A esfera já com as cores da marca; muda ao vivo se a pessoa editar a paleta. */}
            <div className="mb-4 flex justify-center"><BrandOrb colors={orbColors} size={88} /></div>
            <div className="flex items-center gap-2"><OrbBadge state="done" label="Mini manual da marca" /></div>
            <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[24px] font-medium">{name || "Sua marca"}</h1>
            <p className="mt-1 text-[13px] text-text-tertiary">A Orbi sugeriu isto, ajuste tudo como quiser antes de confirmar.</p>

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

            {/* Paleta editável, toque na cor pra trocar, × pra remover */}
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
      </div>
    </main>
  );
}
