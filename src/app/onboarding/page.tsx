"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { slugify } from "@/lib/utils";
import { coresDaOrbi } from "@/lib/orbiCores";
import { colorOf } from "@/lib/showcase";
import { segmentoPorId } from "@/lib/segmentos";
import { registrarFunil } from "@/lib/funil";
import { CONVERSOES, OBJETIVOS, conversaoPorId, ordenarBotoes, type BotaoChave, type ConversaoId, type ObjetivoId } from "@/lib/conversao";
import { AnaliseAoVivo, BrandOrb, VitrineMontando, formatarWhatsapp, type Analise, type Descoberta, type ItemMontado, type PontoForte } from "./MagicScreens";
import { Pronto, type ProntoDados } from "./Pronto";

type Color = { hex: string; role: string };
type BrandAnalysis = {
  personality: Record<string, number>;
  colors: Color[];
  voiceSummary: string;
  font: string;
  siteAnalyzed?: boolean;
  resumo?: string;
  pontosFortes?: PontoForte[];
  segmento?: string | null;
  objetivo?: ObjetivoId | null;
  conversao?: ConversaoId | null;
  demo?: { pergunta: string; resposta: string } | null;
  oferta?: { titulo: string; tipo: "percent" | "fixed"; valor: number } | null;
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

type Step = "dados" | "objetivo" | "analisando" | "montando" | "pronto";
type Escolha<T> = T | "orbi" | null;
type Importacao = { imported: number; siteType: "ecommerce" | "institucional" | "links" | null; motivo: string | null; fetchError: string | null };

// Frases enquanto a Orbi lê a marca. Nada técnico: a sensação é de alguém trabalhando.
const LENDO = [
  "Conhecendo sua marca",
  "Encontrando seus produtos e serviços",
  "Entendendo sua identidade",
  "Preparando sua inteligência",
  "Criando sua primeira experiência",
];

const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-3.5 text-[15px] outline-none transition-colors placeholder:text-text-tertiary focus:border-on-background";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("dados");
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [semLinks, setSemLinks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // As duas únicas decisões: o objetivo e o que o cliente deve fazer.
  const [objetivo, setObjetivo] = useState<Escolha<ObjetivoId>>(null);
  const [conversao, setConversao] = useState<Escolha<ConversaoId>>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [endereco, setEndereco] = useState("");

  // Leitura da marca rodando em paralelo com as perguntas.
  const [descoberta, setDescoberta] = useState<Descoberta>({ status: "pending" });
  const [analise, setAnalise] = useState<Analise>({ status: "pending" });
  const [orbColors, setOrbColors] = useState<string[] | null>(null);
  const [frase, setFrase] = useState(0);
  const resultadoRef = useRef<BrandAnalysis | null>(null);
  const respondeuRef = useRef(false);
  const criouRef = useRef(false);

  const [montagem, setMontagem] = useState<{ status: "pending" | "ok"; itens: ItemMontado[]; segundos: number | null }>({ status: "pending", itens: [], segundos: null });
  const [pronto, setPronto] = useState<ProntoDados | null>(null);
  const [bizId, setBizId] = useState<string | null>(null);
  const [tentando, setTentando] = useState(false);

  const alvo = useMemo(() => {
    if (website.trim()) return website.trim().replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
    const ig = instagram.trim().replace(/^.*instagram\.com\//i, "").replace(/[/?].*$/, "").replace(/^@/, "");
    return ig ? `@${ig}` : null;
  }, [website, instagram]);
  const temLinks = !!(website.trim() || instagram.trim());

  // Veio do painel pra criar outro Orbibox (plano com vários negócios)?
  const novoNegocio = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("novo") === "1",
    () => false,
  );

  // Frases girando enquanto a leitura não termina.
  useEffect(() => {
    if (step !== "objetivo" || analise.status === "ok") return;
    const t = setTimeout(() => setFrase((f) => Math.min(f + 1, LENDO.length - 1)), 2600);
    return () => clearTimeout(t);
  }, [step, frase, analise.status]);

  useEffect(() => {
    registrarFunil(`onb_${step}`, { umaVez: true, meta: step === "dados" ? { novo_negocio: novoNegocio } : undefined });
  }, [step, novoNegocio]);

  function comecar(e: React.FormEvent) {
    e.preventDefault();
    if (!temLinks && !description.trim()) {
      setSemLinks(true);
      setError("Sem site nem Instagram, conte em uma frase o que vocês fazem. É com isso que a Orbi monta tudo.");
      return;
    }
    setError(null);
    respondeuRef.current = false;
    criouRef.current = false;
    resultadoRef.current = null;
    setFrase(0);
    setDescoberta({ status: "pending" });
    setAnalise({ status: "pending" });
    setStep("objetivo");
    if (temLinks) {
      fetch("/api/descobrir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: website.trim(), instagram: instagram.trim() }),
      })
        .then((r) => r.json())
        .then((d) => setDescoberta(d?.ok ? { status: "ok", palavras: d.palavras ?? 0, imagens: d.imagens ?? [], fonte: d.fonte, host: d.host } : { status: "fail" }))
        .catch(() => setDescoberta({ status: "fail" }));
    }
    analyzeBrand(name, instagram, website, description)
      .then((result) => {
        const seen = new Set<string>();
        result.colors = (result.colors || []).filter((c) => {
          const k = c.hex.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        resultadoRef.current = result;
        const cores = coresDaOrbi(result.colors);
        setOrbColors(cores);
        setAnalise({ status: "ok", voice: result.voiceSummary, font: result.font || "Manrope", paleta: result.colors.map((c) => c.hex), orbColors: cores });
        // Respondeu antes da leitura acabar e ficou vendo a análise: ela
        // mesma chama a criação quando termina a animação (onDone).
      })
      .catch(() => {
        registrarFunil("onb_analise_erro", { meta: { tem_site: !!website.trim(), tem_instagram: !!instagram.trim() } });
        setError("A Orbi não conseguiu ler sua marca agora. Confira se o site ou o @ estão certos e tente de novo. Se preferir, apague os links e conte em uma frase o que vocês fazem.");
        if (!temLinks) setSemLinks(true);
        setStep("dados");
      });
  }

  function confirmarRespostas() {
    respondeuRef.current = true;
    registrarFunil("onb_respostas", { meta: { objetivo, conversao } });
    if (resultadoRef.current) criar();
    else setStep("analisando");
  }

  async function importarSite(id: string): Promise<Importacao> {
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
    if (!bizId || !pronto) return;
    setTentando(true);
    const r = await importarSite(bizId);
    setTentando(false);
    setPronto({ ...pronto, importados: r.imported || pronto.importados, siteType: r.siteType ?? pronto.siteType, fetchError: r.fetchError });
  }

  async function criar() {
    if (criouRef.current) return;
    const result = resultadoRef.current;
    if (!result) return;
    criouRef.current = true;
    const inicio = Date.now();
    setMontagem({ status: "pending", itens: [], segundos: null });
    setStep("montando");
    setError(null);

    const voltar = (msg: string) => {
      criouRef.current = false;
      setError(msg);
      setStep("dados");
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return voltar("Sessão expirada. Faça login novamente.");

    // O que a pessoa escolheu, ou o que a Orbi sugeriu quando ela deixou decidir.
    const seg = segmentoPorId(result.segmento);
    const obj: ObjetivoId = objetivo && objetivo !== "orbi" ? objetivo : result.objetivo ?? "tudo";
    const conv: ConversaoId = conversao && conversao !== "orbi" ? conversao : result.conversao ?? (seg?.servico ? "whatsapp" : "comprar");
    const convInfo = conversaoPorId(conv)!;

    const base = slugify(name) || "orbibox";
    const { data: taken } = await supabase.from("businesses").select("slug").like("slug", `${base}%`);
    const used = new Set((taken ?? []).map((t) => t.slug));
    let slug = base;
    for (let i = 2; used.has(slug) && i < 100; i++) slug = `${base}-${i}`;
    if (used.has(slug)) slug = `${base}-${Date.now().toString(36)}`;

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

    const pontos = (result.pontosFortes ?? [])
      .map((p) => ({ icon: p.icon || "✦", title: p.title.trim(), description: (p.description ?? "").trim() }))
      .filter((p) => p.title);
    const resumo = (result.resumo ?? "").trim();

    const payload = {
      owner_id: user.id,
      name,
      instagram_handle: instagram || null,
      website_url: website || null,
      about_business: [description.trim(), resumo].filter(Boolean).join("\n\n") || null,
      ...(pontos.length
        ? { differentials_cards: pontos, differentials: pontos.map((p) => (p.description ? `${p.title}: ${p.description}` : p.title)).join("\n") }
        : {}),
      contact_whatsapp: whatsappDigits || null,
      address: endereco.trim() || null,
      contact_site: siteUrl,
      brand_personality: result.personality,
      brand_colors: result.colors,
      brand_voice_summary: result.voiceSummary,
      brand_font: result.font || "Manrope",
      onboarding_status: "ready",
      objetivo: obj,
      conversao: conv,
      ...(seg ? { hero_question: seg.pergunta } : {}),
    };
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
      return voltar(
        msg.includes("duplicate") ? "Já existe um Orbibox com esse nome. Tente outro."
        : msg.includes("row-level security") ? "Sua sessão expirou. Faça login novamente."
        : "Não foi possível criar seu Orbibox. Tente novamente.",
      );
    }
    const id = business.id;
    setBizId(id);
    registrarFunil("onb_criou", { businessId: id, meta: { segmento: result.segmento ?? null, objetivo: obj, conversao: conv, tem_site: !!website.trim(), tem_instagram: !!instagram.trim() } });
    document.cookie = `orbi_negocio=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    // Teste grátis sem cartão começa agora, com o Orbibox no ar.
    const { data: fimTeste } = await supabase.rpc("iniciar_teste_gratis");
    const diasTeste = fimTeste ? Math.max(0, Math.round((new Date(fimTeste).getTime() - Date.now()) / 86400000)) : null;

    const cores = coresDaOrbi(result.colors);
    await supabase.from("agent_configs").insert({ business_id: id, agent_name: "Orbi", objectives: [convInfo.objetivoConversa, "tirar dúvidas"], ...(cores ? { orbi_colors: cores } : {}) });
    await supabase.from("pulse_metrics").insert({ business_id: id, discovery_score: 62, interest_score: 58, conversion_score: 41, relationship_score: 70, overall_score: 58 });

    let imp: Importacao = { imported: 0, siteType: null, motivo: null, fetchError: null };
    if (temLinks) {
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        imp = await importarSite(id);
        if (!imp.fetchError) break;
      }
    }

    if (seg && imp.imported === 0) {
      await supabase.from("businesses").update({ vitrine_categories: seg.categorias }).eq("id", id);
    }

    // Quem quer vender ganha a primeira oferta já no ar. Os outros ficam
    // com ela pronta como rascunho em Vouchers, é só publicar.
    const oferta = result.oferta
      ? { title: result.oferta.titulo, discountType: result.oferta.tipo, discountValue: result.oferta.valor }
      : seg?.voucher
        ? { title: seg.voucher.title, discountType: seg.voucher.discountType, discountValue: seg.voucher.discountValue }
        : { title: "10% na primeira compra", discountType: "percent" as const, discountValue: 10 };
    const quantidade = seg?.voucher?.quantity ?? 30;
    const horas = seg?.voucher?.horas ?? 168;
    let voucherCriado: { titulo: string; quantidade: number } | null = null;
    if (obj === "vender" || obj === "tudo" || conv === "oferta") {
      const { error: vErr } = await supabase.from("vouchers").insert({
        business_id: id, title: oferta.title, discount_type: oferta.discountType, discount_value: oferta.discountValue,
        quantity_total: quantidade, expires_hours: horas, badge: "Primeira visita", color: "cherry", is_active: true,
      });
      if (!vErr) voucherCriado = { titulo: oferta.title, quantidade };
    } else {
      try {
        localStorage.setItem(`orbi_voucher_rascunho_${id}`, JSON.stringify({
          title: oferta.title, description: "", discountType: oferta.discountType, discountValue: String(oferta.discountValue),
          quantityTotal: String(quantidade), expiresHours: String(horas), imageUrl: null, badge: "Primeira visita", color: "cherry", sugestao: true,
        }));
      } catch { /* sem storage */ }
    }

    // WhatsApp digitado ou achado no site pela importação.
    let waFinal = whatsappDigits;
    if (!waFinal && imp.siteType) {
      const { data: atualizado } = await supabase.from("businesses").select("contact_whatsapp").eq("id", id).maybeSingle();
      waFinal = atualizado?.contact_whatsapp ?? "";
    }

    // Estrutura da tela inicial: o botão que leva à conversão escolhida vem
    // primeiro, o objetivo decide o segundo, o resto segue a ordem do ramo.
    const temVitrine = imp.imported > 0 || imp.siteType === "ecommerce";
    const conteudoAtivo = imp.siteType !== "ecommerce";
    const disponiveis: BotaoChave[] = ["agent"];
    if (temVitrine) disponiveis.push("catalogo");
    if (conteudoAtivo) disponiveis.push("conhecer");
    if (waFinal) disponiveis.push("whatsapp");
    if (endereco.trim()) disponiveis.push("endereco");
    if (voucherCriado) disponiveis.push("cupom");
    const ordem = ordenarBotoes({ disponiveis, conversao: conv, objetivo: obj, servico: !!seg?.servico });

    const waRotulo = convInfo.principal === "whatsapp" && convInfo.rotuloWhatsapp ? convInfo.rotuloWhatsapp : { label: "Fale no WhatsApp", subtitle: "Atendimento rápido" };
    const NOMES: Record<BotaoChave, string> = {
      catalogo: "O que fazemos",
      agent: "Pergunte o que quiser",
      conhecer: "Conhecer",
      whatsapp: waRotulo.label,
      endereco: "Como chegar",
      cupom: voucherCriado?.titulo ?? "Vouchers",
    };
    const linha = (k: BotaoChave, position: number, is_active: boolean) => {
      switch (k) {
        case "catalogo": return { business_id: id, box_type: "product", title: NOMES.catalogo, position, is_active };
        case "agent": return { business_id: id, box_type: "agent", title: NOMES.agent, position, is_active };
        case "conhecer": return { business_id: id, box_type: "content", title: NOMES.conhecer, position, is_active };
        case "whatsapp": return { business_id: id, box_type: "custom", title: waRotulo.label, position, is_active, config: { label: waRotulo.label, subtitle: waRotulo.subtitle, icon: "__wadisc__", color: "transparent", action: "whatsapp", url: "" } };
        case "endereco": return { business_id: id, box_type: "custom", title: "Como chegar", position, is_active, config: { label: "Como chegar", subtitle: "Veja no mapa", icon: "__pin__", color: "transparent", action: "endereco", url: endereco.trim() } };
        case "cupom": return { business_id: id, box_type: "custom", title: NOMES.cupom, position, is_active, config: { label: NOMES.cupom, subtitle: "Resgate agora e aproveite", icon: "__ticket__", color: "transparent", action: "cupom" } };
      }
    };
    const linhas = [
      { business_id: id, box_type: "hero", title: "Tela inicial", position: 0, is_active: true },
      ...ordem.map((k, i) => linha(k, i + 1, true)),
    ];
    let pos = ordem.length + 1;
    // Catálogo e Conhecer sempre existem, mesmo desligados: o dono liga depois.
    if (!ordem.includes("catalogo")) linhas.push(linha("catalogo", pos++, false));
    if (!ordem.includes("conhecer")) linhas.push(linha("conhecer", pos++, false));
    linhas.push({ business_id: id, box_type: "campaign", title: "Presentear", position: pos++, is_active: false });
    if (instagramUrl) linhas.push({ business_id: id, box_type: "custom", title: "Instagram", position: pos++, is_active: true, config: { label: "Instagram", subtitle: "Siga a gente", icon: "@", color: "#111318", action: "link", url: instagramUrl } });
    if (siteUrl) linhas.push({ business_id: id, box_type: "custom", title: "Nosso site", position: pos++, is_active: true, config: { label: "Nosso site", subtitle: siteUrl.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""), icon: "➜", color: "#111318", action: "link", url: siteUrl } });
    const { error: boxesErr } = await supabase.from("smart_boxes").insert(linhas);
    if (boxesErr) console.error("onboarding: falha ao criar botões", boxesErr);

    await supabase.from("opportunities").insert({
      business_id: id,
      title: imp.imported > 0 ? "Revise seu catálogo" : "Importe seu catálogo",
      description: imp.imported > 0
        ? `A Orbi importou ${imp.imported} ${imp.imported === 1 ? "item" : "itens"} do seu site. Confira fotos, preços e nomes.`
        : "Cole o link do seu site no Catálogo e a Orbi transforma seus produtos em cards automaticamente.",
      category: "descoberta",
      impact_score: 92,
    });

    const principal = ordem[0];
    setPronto({
      nome: name,
      slug,
      link: `${window.location.origin}/${slug}`,
      orbColors: cores,
      objetivo: obj,
      conversao: conv,
      botaoPrincipal: principal ? NOMES[principal] : null,
      voucher: voucherCriado,
      demo: result.demo ?? null,
      importados: imp.imported,
      siteType: imp.siteType,
      fetchError: imp.fetchError,
      resumo,
      pontos: pontos.map((p) => ({ icon: p.icon, title: p.title })),
      paleta: result.colors.map((c) => c.hex),
      voz: result.voiceSummary,
      ramo: seg?.rotulo ?? null,
      diasTeste,
    });

    // Importou: o celular termina de montar e segue sozinho pro resultado.
    if (imp.imported > 0 && !imp.fetchError) {
      const { data: criados } = await supabase.from("content_items").select("title, image_url, box_color").eq("business_id", id).order("position", { ascending: true }).limit(7);
      const itens: ItemMontado[] = (criados ?? []).map((c) => {
        const cor = colorOf(c.box_color);
        return { title: c.title, image_url: c.image_url, bg: cor.bg, fg: cor.fg };
      });
      setMontagem({ status: "ok", itens, segundos: Math.max(1, Math.round((Date.now() - inicio) / 1000)) });
      setTimeout(() => setStep((s) => (s === "montando" ? "pronto" : s)), 3200);
      return;
    }
    setStep("pronto");
  }

  function irPara(destino: string = "/admin") {
    router.push(destino);
    router.refresh();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const convEscolhida = conversao && conversao !== "orbi" ? conversaoPorId(conversao) : null;
  const leituraOk = analise.status === "ok";

  return (
    <main className={`relative flex min-h-screen justify-center px-5 ${step === "pronto" ? "items-start py-14" : step === "analisando" ? "items-start pb-16 pt-[9vh]" : "items-center py-16"}`}>
      {step === "dados" && (novoNegocio ? (
        <Link href="/admin" className="fixed right-4 top-4 z-10 rounded-full bg-surface-white px-3.5 py-2 text-[12px] font-medium text-text-secondary shadow-[0_2px_10px_rgba(17,19,24,0.08)]">
          ← Voltar ao painel
        </Link>
      ) : (
        <button onClick={handleSignOut} className="fixed right-4 top-4 z-10 rounded-full bg-surface-white px-3.5 py-2 text-[12px] font-medium text-text-secondary shadow-[0_2px_10px_rgba(17,19,24,0.08)]">
          Sair
        </button>
      ))}

      <div className={step === "pronto" ? "w-full" : "w-full max-w-md"}>
        {step === "dados" && (
          <>
            <div className="mb-7 flex justify-center"><BrandOrb colors={null} size={72} /></div>
            {novoNegocio && <p className="mb-2 text-center text-[13px] font-medium text-text-tertiary">Novo Orbibox</p>}
            <h1 className="text-center font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-[1.12] tracking-[-0.02em]">Qual é o seu negócio?</h1>
            <p className="mx-auto mt-2 max-w-[340px] text-center text-[15px] leading-relaxed text-text-secondary">
              Mostre seu site ou Instagram. A Orbi lê tudo e monta seu Orbibox pra você.
            </p>
            <form onSubmit={comecar} className="mt-8 flex flex-col gap-3">
              <input required autoFocus placeholder="Nome da empresa" value={name} onChange={(e) => setName(e.target.value)} className={campo} />
              <input placeholder="seusite.com.br" inputMode="url" autoCapitalize="none" value={website} onChange={(e) => setWebsite(e.target.value)} className={campo} />
              <input placeholder="@seuinstagram" autoCapitalize="none" value={instagram} onChange={(e) => setInstagram(e.target.value)} className={campo} />
              {semLinks || (!temLinks && description) ? (
                <textarea
                  placeholder="Em uma frase, o que vocês fazem?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className={`${campo} resize-none`}
                />
              ) : (
                !temLinks && (
                  <button type="button" onClick={() => setSemLinks(true)} className="self-start px-1 text-[13px] text-text-secondary underline underline-offset-2">
                    Não tenho site nem Instagram
                  </button>
                )
              )}
              {error && (
                <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] leading-snug text-red-700 ring-1 ring-red-100">{error}</p>
              )}
              <Button type="submit" variant="orbi" className="mt-2">Criar meu Orbibox ✦</Button>
              <p className="text-center text-[12.5px] text-text-tertiary">Leva menos de um minuto. Tudo dá pra mudar depois.</p>
            </form>
          </>
        )}

        {step === "objetivo" && (
          <div>
            {/* A Orbi trabalhando, sempre visível no topo enquanto a pessoa escolhe. */}
            <div className="flex items-center gap-3 rounded-[22px] bg-surface-white px-4 py-3 ring-1 ring-black/[0.06]">
              <BrandOrb colors={orbColors} size={36} />
              <div className="min-w-0 flex-1">
                <p key={leituraOk ? "ok" : frase} className="orbi-linha-entra truncate text-[14px] font-medium">
                  {leituraOk ? `Pronto, já conheço a ${name || "sua marca"}` : `${LENDO[frase]}…`}
                </p>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-soft">
                  <div className="orbi-gradient h-full rounded-full transition-[width] duration-[1200ms] ease-out" style={{ width: leituraOk ? "100%" : `${18 + frase * 16}%` }} />
                </div>
              </div>
            </div>

            <h2 className="mt-8 font-[family-name:var(--font-manrope)] text-[24px] font-medium leading-tight tracking-[-0.01em]">
              Enquanto isso: o que você mais quer conseguir?
            </h2>
            <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Objetivo">
              {OBJETIVOS.map((o) => (
                <Opcao key={o.id} ativa={objetivo === o.id} onClick={() => setObjetivo(o.id)} titulo={o.rotulo} detalhe={o.detalhe} />
              ))}
              <Opcao ativa={objetivo === "orbi"} onClick={() => setObjetivo("orbi")} titulo="Não sei. Deixe a Orbi decidir" detalhe="Ela escolhe pelo que encontrou sobre você" orbi />
            </div>

            {objetivo && (
              <div className="orbi-linha-entra">
                <h2 className="mt-9 font-[family-name:var(--font-manrope)] text-[22px] font-medium leading-tight tracking-[-0.01em]">
                  E o que você mais quer que seus clientes façam?
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Ação principal do cliente">
                  {CONVERSOES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={conversao === c.id}
                      onClick={() => setConversao(c.id)}
                      className={`min-h-[48px] rounded-2xl px-3.5 py-3 text-left text-[14px] font-medium transition-all active:scale-[0.98] ${conversao === c.id ? "bg-on-background text-white" : "bg-surface-white text-on-background ring-1 ring-divider"}`}
                    >
                      {c.rotulo}
                    </button>
                  ))}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={conversao === "orbi"}
                    onClick={() => setConversao("orbi")}
                    className={`col-span-2 min-h-[48px] rounded-2xl px-3.5 py-3 text-left text-[14px] font-medium transition-all active:scale-[0.98] ${conversao === "orbi" ? "bg-on-background text-white" : "bg-surface-white text-text-secondary ring-1 ring-divider"}`}
                  >
                    ✦ Deixe a Orbi decidir
                  </button>
                </div>

                {convEscolhida?.precisa === "whatsapp" && (
                  <div className="orbi-linha-entra mt-4">
                    <input
                      placeholder="Seu WhatsApp (opcional)"
                      inputMode="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(formatarWhatsapp(e.target.value))}
                      className={campo}
                    />
                    <p className="mt-1.5 px-1 text-[12px] text-text-tertiary">Se estiver no seu site, a Orbi acha sozinha.</p>
                  </div>
                )}
                {convEscolhida?.precisa === "endereco" && (
                  <div className="orbi-linha-entra mt-4">
                    <input placeholder="Endereço do seu espaço (opcional)" value={endereco} onChange={(e) => setEndereco(e.target.value)} className={campo} />
                    <p className="mt-1.5 px-1 text-[12px] text-text-tertiary">Vira um botão com mapa, Waze e Google Maps.</p>
                  </div>
                )}
              </div>
            )}

            <Button className="mt-8 w-full" variant="orbi" disabled={!objetivo || !conversao} onClick={confirmarRespostas}>
              Ver meu Orbibox ✦
            </Button>
          </div>
        )}

        {step === "analisando" && (
          <AnaliseAoVivo nome={name} alvo={alvo} descoberta={descoberta} analise={analise} onDone={criar} />
        )}

        {step === "montando" && (
          <VitrineMontando
            nome={name}
            alvo={alvo ?? "sua marca"}
            orbColors={orbColors}
            status={montagem.status}
            itens={montagem.itens}
            segundos={montagem.segundos}
            onContinuar={() => setStep("pronto")}
          />
        )}

        {step === "pronto" && pronto && <Pronto d={pronto} onPainel={irPara} onTentarDeNovo={tentarDeNovo} tentando={tentando} />}
      </div>
    </main>
  );
}

function Opcao({ ativa, onClick, titulo, detalhe, orbi }: { ativa: boolean; onClick: () => void; titulo: string; detalhe: string; orbi?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativa}
      onClick={onClick}
      className={`flex min-h-[60px] items-center gap-3 rounded-[20px] px-4 py-3 text-left transition-all active:scale-[0.99] ${ativa ? "bg-on-background text-white" : "bg-surface-white ring-1 ring-divider"}`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${ativa ? "border-white" : "border-divider"}`} aria-hidden>
        {ativa && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-tight">{orbi && "✦ "}{titulo}</span>
        <span className={`mt-0.5 block text-[13px] leading-snug ${ativa ? "text-white/65" : "text-text-secondary"}`}>{detalhe}</span>
      </span>
    </button>
  );
}
