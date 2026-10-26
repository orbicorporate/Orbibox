"use client";

import { origemPublica } from "@/lib/appUrl";
import { IconeOrbi, type NomeIcone } from "./IconesOrbi";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { slugify } from "@/lib/utils";
import { SLUGS_RESERVADOS } from "@/lib/slugsReservados";
import { coresDaOrbi } from "@/lib/orbiCores";
import { colorOf } from "@/lib/showcase";
import { segmentoPorId } from "@/lib/segmentos";
import { registrarFunil } from "@/lib/funil";
import type { Json } from "@/lib/supabase/types";
import { CONVERSOES, OBJETIVOS, conversaoPorId, ordenarBotoes, type BotaoChave, type ConversaoId, type ObjetivoId } from "@/lib/conversao";
import { AnaliseAoVivo, BrandOrb, VitrineMontando, formatarWhatsapp, type Analise, type Descoberta, type ItemMontado, type PontoForte } from "./MagicScreens";
import { Pronto, type ProntoDados } from "./Pronto";
import { coresDosCards } from "@/lib/paletaCards";
import { Revisar, type CategoriaRevisao, type ItemRevisao, type RevisaoDados, type RevisaoResultado } from "./Revisar";

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

type Step = "dados" | "objetivo" | "acao" | "analisando" | "revisar" | "montando" | "pronto";
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

const campo = "w-full rounded-full bg-white/80 px-5 py-3.5 text-[15px] outline-none ring-1 ring-black/[0.08] backdrop-blur transition-shadow placeholder:text-text-tertiary focus:ring-2 focus:ring-on-background/40";

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
  const leituraRef = useRef(0);
  const criouRef = useRef(false);

  const [montagem, setMontagem] = useState<{ status: "pending" | "ok"; itens: ItemMontado[]; segundos: number | null }>({ status: "pending", itens: [], segundos: null });
  const [pronto, setPronto] = useState<ProntoDados | null>(null);
  const [revisao, setRevisao] = useState<RevisaoDados | null>(null);
  const revisaoRef = useRef<((v: RevisaoResultado) => void) | null>(null);
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
    if ((step !== "objetivo" && step !== "acao") || analise.status === "ok") return;
    const t = setTimeout(() => setFrase((f) => Math.min(f + 1, LENDO.length - 1)), 2600);
    return () => clearTimeout(t);
  }, [step, frase, analise.status]);

  useEffect(() => {
    registrarFunil(`onb_${step}`, { umaVez: true, meta: step === "dados" ? { novo_negocio: novoNegocio } : undefined });
  }, [step, novoNegocio]);

  // Cada leitura tem um número. Se a pessoa voltar e corrigir o nome, a leitura antiga é descartada.
  function voltarParaDados() {
    leituraRef.current += 1;
    respondeuRef.current = false;
    resultadoRef.current = null;
    setError(null);
    setStep("dados");
  }

  function comecar(e: React.FormEvent) {
    e.preventDefault();
    if (!temLinks && !description.trim()) {
      setSemLinks(true);
      setError("Sem site nem Instagram, conte em uma frase o que vocês fazem. É com isso que a Orbi monta tudo.");
      return;
    }
    setError(null);
    const minha = ++leituraRef.current;
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
        .then((d) => minha === leituraRef.current && setDescoberta(d?.ok ? { status: "ok", palavras: d.palavras ?? 0, imagens: d.imagens ?? [], fonte: d.fonte, host: d.host } : { status: "fail" }))
        .catch(() => minha === leituraRef.current && setDescoberta({ status: "fail" }));
    }
    analyzeBrand(name, instagram, website, description)
      .then((result) => {
        if (minha !== leituraRef.current) return;
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
        if (minha !== leituraRef.current) return;
        registrarFunil("onb_analise_erro", { meta: { tem_site: !!website.trim(), tem_instagram: !!instagram.trim() } });
        setError("A Orbi não conseguiu ler sua marca agora. Confira se o site ou o @ estão certos e tente de novo. Se preferir, apague os links e conte em uma frase o que vocês fazem.");
        if (!temLinks) setSemLinks(true);
        setStep("dados");
      });
  }

  // Ao escolher o objetivo a segunda pergunta aparece embaixo: leva a tela até ela.
  // Escolheu o objetivo: segue sozinho para o passo 3 (dá tempo de ver a marcação).
  function escolherObjetivo(id: NonNullable<typeof objetivo>) {
    setObjetivo(id);
    window.setTimeout(() => setStep((s) => (s === "objetivo" ? "acao" : s)), 260);
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
    if (!user) return voltar("Sua sessão expirou. Toque em Sair, no canto de cima, e entre de novo.");

    // O que a pessoa escolheu, ou o que a Orbi sugeriu quando ela deixou decidir.
    const seg = segmentoPorId(result.segmento);
    const obj: ObjetivoId = objetivo && objetivo !== "orbi" ? objetivo : result.objetivo ?? "tudo";
    const conv: ConversaoId = conversao && conversao !== "orbi" ? conversao : result.conversao ?? (seg?.servico ? "whatsapp" : "comprar");
    const convInfo = conversaoPorId(conv)!;

    const base0 = slugify(name) || "meu-negocio";
    const base = SLUGS_RESERVADOS.has(base0) ? `${base0}-1` : base0;
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
      // "analyzing" = montando. Só vira "ready" no fim; se a pessoa sair no meio, a página inicial oferece terminar.
      onboarding_status: "analyzing",
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

    // A Orbi confere o que veio do site antes de mostrar: tira categorias que são menu
    // do site, corrige nomes e esconde o que não é produto nem serviço.
    if (imp.imported > 0) {
      try {
        await fetch("/api/comecar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "conferir", businessId: id }) });
      } catch { /* segue com o que veio */ }
    }

    // Galeria já nasce cheia com as fotos do site (em segundo plano).
    void fetch("/api/galeria/do-site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId: id }) }).catch(() => {});

    // Pausa pra a pessoa conferir o que a Orbi achou (logotipo, contato, endereço)
    // e dizer o que vem primeiro. Só depois a página inicial é montada.
    const { data: pre } = await supabase.from("businesses").select("contact_whatsapp, contact_phone, address, logo_url, vitrine_categories").eq("id", id).maybeSingle();
    const { data: preItens } = await supabase.from("content_items").select("id, title, brand_label, type, image_url, price").eq("business_id", id).eq("status", "published").order("position", { ascending: true }).limit(60);
    const catsPre = Array.from(new Set((preItens ?? []).map((r) => r.brand_label?.trim()).filter((v): v is string => !!v)));
    // Destaques: a Orbi decide sozinha se mostra categorias, produtos ou serviços,
    // pelo que puxou do site. A pessoa só toca nos que mais vendem.
    const reaisPre = (preItens ?? []).filter((r) => r.type !== "link");
    const ehServico = !!seg?.servico || conv === "agendar";
    const precoTxt = (v: number | null) => (v != null && v > 0 ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}` : undefined);
    // Tudo o que veio do site vai para a revisão: todas as categorias (com quantos
    // itens e a melhor foto) e todos os produtos ou serviços, com foto primeiro.
    const categoriasRev: CategoriaRevisao[] = catsPre.map((c) => {
      const daCat = reaisPre.filter((r) => r.brand_label?.trim() === c);
      const comFoto = daCat.filter((r) => r.image_url).sort((x, y) => (y.price ?? 0) - (x.price ?? 0))[0];
      return { nome: c, n: daCat.length, foto: comFoto?.image_url ?? null };
    });
    const itensRev: ItemRevisao[] = [...reaisPre].sort((x, y) => Number(!!y.image_url) - Number(!!x.image_url)).map((r) => ({
      id: r.id, nome: r.title, foto: r.image_url ?? null, categoria: r.brand_label?.trim() || null,
      sub: precoTxt(r.price) ? (ehServico ? `a partir de ${precoTxt(r.price)}` : precoTxt(r.price)) : undefined,
    }));
    // Site sem categorias: a Orbi sugere categorias a partir dos itens que vieram,
    // em vez de usar só a lista genérica do ramo (que pode não bater com o que a marca vende).
    let sugestoesCats: string[] = catsPre.length > 0 ? [] : (seg?.categorias ?? []).slice(0, 8);
    if (catsPre.length === 0 && reaisPre.length >= 3) {
      try {
        const r = await fetch("/api/comecar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "sugerir", businessId: id }) });
        const d = await r.json();
        if (Array.isArray(d.categorias) && d.categorias.length >= 2) sugestoesCats = d.categorias.map(String).slice(0, 8);
      } catch { /* fica com as do ramo */ }
    }
    const waPre = (pre?.contact_whatsapp || pre?.contact_phone || whatsappDigits || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
    const conf = await new Promise<RevisaoResultado>((resolve) => {
      revisaoRef.current = resolve;
      setRevisao({ bizId: id, logo: pre?.logo_url ?? null, cores: result.colors.map((c) => c.hex).slice(0, 5), whatsapp: waPre ? formatarWhatsapp(waPre) : "", endereco: pre?.address ?? endereco, categorias: categoriasRev, sugestoes: sugestoesCats, itens: itensRev, temInstagram: !!(instagramUrl || temLinks), temVoucher: obj === "vender" || obj === "tudo" || conv === "oferta", gastronomico: !!seg && ["restaurante", "doceria", "sorveteria"].includes(seg.id), servico: !!seg?.servico || conv === "agendar" });
      setStep("revisar");
    });
    setMontagem({ status: "pending", itens: [], segundos: null });
    setStep("montando");
    const waConf = (() => { const d = conf.whatsapp.replace(/\D/g, ""); if (d.length < 10) return ""; return d.startsWith("55") ? d : `55${d}`; })();
    const enderecoFinal = conf.endereco.trim();
    // Cores conferidas na revisão: só grava se a pessoa mudou alguma.
    const coresMudaram = conf.cores.length > 0 && conf.cores.join() !== result.colors.slice(0, 5).map((c) => c.hex).join();
    if (coresMudaram) {
      const novas = conf.cores.map((hex, i) => ({ hex, role: result.colors[i]?.role ?? "accent" }));
      await supabase.from("businesses").update({ brand_colors: novas }).eq("id", id);
      const orbi = coresDaOrbi(novas);
      if (orbi) await supabase.from("agent_configs").update({ orbi_colors: orbi }).eq("business_id", id);
    }
    await supabase.from("businesses").update({ contact_whatsapp: waConf || null, address: enderecoFinal || null }).eq("id", id);
    const paletaFinal = (conf.cores.length ? conf.cores : result.colors.map((c) => c.hex)).filter((h) => /^#[0-9a-f]{6}$/i.test(h));
    const corUsavel = coresDosCards(paletaFinal);
    const corDe = (i: number) => corUsavel[i % corUsavel.length];
    const catsEscolhidas = conf.categorias;
    // Itens do site sem categoria e categorias escolhidas na revisão: a Orbi encaixa
    // cada item na categoria que combina, pra o catálogo não nascer bagunçado.
    if (catsPre.length === 0 && catsEscolhidas.length > 0 && reaisPre.length > 0) {
      try {
        await fetch("/api/comecar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "salvar", categorias: catsEscolhidas, businessId: id }) });
      } catch { /* o dono organiza depois */ }
    }

    // Destaques: os itens do site escolhidos e os que a pessoa escreveu, que viram
    // cards novos na cor da marca (na categoria marcada). Todos sobem para o topo.
    const idsDestaque: string[] = [];
    for (const [i, e] of conf.itens.entries()) {
      if (e.itemId) { idsDestaque.push(e.itemId); continue; }
      const { data: criado } = await supabase.from("content_items").insert({ business_id: id, type: "product", title: e.nome, status: "published", position: -100 + i, box_color: corDe(i), box_style: "cor", brand_label: e.categoria }).select("id").single();
      if (criado) idsDestaque.push(criado.id);
    }
    if (idsDestaque.length > 0) {
      const { data: topo } = await supabase.from("content_items").select("position").eq("business_id", id).order("position", { ascending: true }).limit(1).maybeSingle();
      const base = (topo?.position ?? 0) - idsDestaque.length - 1;
      await Promise.all(idsDestaque.map((itemId, i) => supabase.from("content_items").update({ position: base + i }).eq("id", itemId)));
    }

    // Negócio gastronômico: a Orbi já deixa o Cardápio criado (desligado) e avisa na fila de pendências.
    // Ele aparece no menu e é só montar e ligar.
    if (seg && ["restaurante", "doceria", "sorveteria"].includes(seg.id)) {
      await supabase.from("smart_boxes").insert({
        business_id: id, box_type: "custom", title: "Cardápio", position: 99, is_active: conf.extras.includes("cardapio"),
        config: { label: "Cardápio", subtitle: "Veja os pratos e preços", icon: "🍴", action: "cardapio", color: "transparent" },
      });
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
    let voucherId: string | null = null;
    if (obj === "vender" || obj === "tudo" || conv === "oferta") {
      const { data: vCriado, error: vErr } = await supabase.from("vouchers").insert({
        business_id: id, title: oferta.title, discount_type: oferta.discountType, discount_value: oferta.discountValue,
        quantity_total: quantidade, expires_hours: horas, badge: "Primeira visita", color: "cherry", is_active: true,
      }).select("id").single();
      if (!vErr) { voucherCriado = { titulo: oferta.title, quantidade }; voucherId = vCriado?.id ?? null; }
    } else {
      try {
        localStorage.setItem(`orbi_voucher_rascunho_${id}`, JSON.stringify({
          title: oferta.title, description: "", discountType: oferta.discountType, discountValue: String(oferta.discountValue),
          quantityTotal: String(quantidade), expiresHours: String(horas), imageUrl: null, badge: "Primeira visita", color: "cherry", sugestao: true,
        }));
      } catch { /* sem storage */ }
    }

    // WhatsApp digitado ou achado no site pela importação.
    const waFinal = waConf;

    // Estrutura da tela inicial: o botão que leva à conversão escolhida vem
    // primeiro, o objetivo decide o segundo, o resto segue a ordem do ramo.
    const temVitrine = imp.imported > 0 || imp.siteType === "ecommerce";
    const conteudoAtivo = imp.siteType !== "ecommerce";
    const disponiveis: BotaoChave[] = ["agent"];
    if (temVitrine) disponiveis.push("catalogo");
    if (conteudoAtivo) disponiveis.push("conhecer");
    if (waFinal) disponiveis.push("whatsapp");
    if (enderecoFinal) disponiveis.push("endereco");
    if (voucherCriado) disponiveis.push("cupom");
    const ordem = ordenarBotoes({ disponiveis, conversao: conv, objetivo: obj, servico: !!seg?.servico });

    const waRotulo = convInfo.principal === "whatsapp" && convInfo.rotuloWhatsapp ? convInfo.rotuloWhatsapp : { label: "Fale no WhatsApp", subtitle: "Atendimento rápido" };
    const NOMES: Record<BotaoChave, string> = {
      catalogo: "Catálogo",
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
        case "endereco": return { business_id: id, box_type: "custom", title: "Como chegar", position, is_active, config: { label: "Como chegar", subtitle: "Veja no mapa", icon: "__pin__", color: "transparent", action: "endereco", url: enderecoFinal, ...(conf.horario ? { horario: conf.horario } : {}) } };
        case "cupom": return { business_id: id, box_type: "custom", title: NOMES.cupom, position, is_active, config: { label: NOMES.cupom, subtitle: "Resgate agora e aproveite", icon: "__ticket__", color: "transparent", action: "cupom" } };
      }
    };
    type LinhaBox = { business_id: string; box_type: string; title: string; position: number; is_active: boolean; config?: Json };
    const linhas: LinhaBox[] = [
      { business_id: id, box_type: "hero", title: "Tela inicial", position: 0, is_active: true },
      ...ordem.map((k, i) => linha(k, i + 1, true)),
    ];
    let pos = ordem.length + 1;
    // Categorias escolhidas viram bolinhas logo depois dos botões principais:
    // com a foto do melhor item, ou na cor da marca quando não tem foto.
    {
      const fotoCat = new Map(categoriasRev.map((c) => [c.nome, c.foto]));
      for (const [i, nome] of catsEscolhidas.slice(0, 4).entries()) {
        const foto = fotoCat.get(nome) ?? null;
        linhas.push({
          business_id: id, box_type: "custom", title: nome, position: pos++, is_active: true,
          config: { label: nome, subtitle: "Ver no catálogo", action: "vitrine", categoria: nome, color: "transparent", bolinhaCor: corDe(i), icon: foto ? "__logo__" : "◆", ...(foto ? { logo_url: foto, logo_ajuste: { z: 1.45, x: 0, y: 0 } } : {}) },
        });
      }
    }
    // Catálogo e Conhecer sempre existem, mesmo desligados: o dono liga depois.
    if (!ordem.includes("catalogo")) linhas.push(linha("catalogo", pos++, false));
    if (!ordem.includes("conhecer")) linhas.push(linha("conhecer", pos++, false));
    linhas.push({ business_id: id, box_type: "campaign", title: "Presentear", position: pos++, is_active: false });
    // Sugestão do ramo: serviço ganha o botão Agendar (abre o WhatsApp).
    if (conf.extras.includes("agendar") && waFinal) linhas.push({ business_id: id, box_type: "custom", title: "Agendar horário", position: pos++, is_active: true, config: { label: "Agendar horário", subtitle: "Escolha o melhor dia", icon: "__wadisc__", color: "transparent", action: "whatsapp", url: "" } });
    // Instagram digitado, ou o que a Orbi achou no site.
    let igFinal = instagramUrl;
    if (!igFinal && imp.siteType) {
      const { data: ig } = await supabase.from("businesses").select("instagram_handle").eq("id", id).maybeSingle();
      if (ig?.instagram_handle) igFinal = `https://instagram.com/${ig.instagram_handle}`;
    }
    if (igFinal) linhas.push({ business_id: id, box_type: "custom", title: "Instagram", position: pos++, is_active: true, config: { label: "Instagram", subtitle: "Siga a gente", icon: "@", color: "#111318", action: "link", url: igFinal } });
    if (siteUrl) linhas.push({ business_id: id, box_type: "custom", title: "Nosso site", position: pos++, is_active: true, config: { label: "Nosso site", subtitle: siteUrl.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""), icon: "➜", color: "#111318", action: "link", url: siteUrl } });
    // Destaques escolhidos viram os boxes da seção Destaque da página inicial. Ficam no
    // box que a página inicial usa para isso: o primeiro ativo do catálogo, senão a Tela inicial.
    if (idsDestaque.length > 0) {
      const alvo = [...linhas].sort((x, y) => x.position - y.position).find((l) => l.is_active && (l.box_type === "product" || (l.box_type === "custom" && (l.config as { action?: string } | undefined)?.action === "vitrine"))) ?? linhas.find((l) => l.box_type === "hero");
      if (alvo) alvo.config = { ...((alvo.config as Record<string, unknown> | undefined) ?? {}), itensHome: idsDestaque.slice(0, 6) };
    }
    // Toda linha leva config (a coluna não aceita vazio) e, se o lote falhar,
    // cada botão é tentado sozinho, pra a página inicial nunca nascer sem botões.
    const linhasOk = linhas.map((l) => ({ config: {}, ...l }));
    const { error: boxesErr } = await supabase.from("smart_boxes").insert(linhasOk);
    if (boxesErr) {
      console.error("onboarding: falha ao criar botões em lote", boxesErr);
      for (const l of linhasOk) {
        const { error: e1 } = await supabase.from("smart_boxes").insert(l);
        if (e1) console.error("onboarding: falha no botão", l.title, e1);
      }
    }

    // Tags da página inicial: o voucher criado já aparece ali. Os produtos ficam nos boxes de Destaque.
    await supabase.from("businesses").update({ home_destaques: voucherId ? [{ t: "voucher", id: voucherId }] : [] }).eq("id", id);

    // Categorias do catálogo: as escolhidas na frente, depois as que o site trouxe (ou as do ramo).
    {
      const { data: rotulos } = await supabase.from("content_items").select("brand_label").eq("business_id", id);
      const doSite = Array.from(new Set((rotulos ?? []).map((r) => r.brand_label?.trim()).filter((v): v is string => !!v)));
      const resto = doSite.length > 0 ? doSite : seg?.categorias ?? [];
      const cats = Array.from(new Set([...catsEscolhidas, ...resto])).slice(0, 10);
      if (cats.length > 0) await supabase.from("businesses").update({ vitrine_categories: cats }).eq("id", id);
    }

    // Catálogo nas cores da marca: com foto pinta o rodapé, sem foto pinta o card.
    // Só onde ainda não tem cor, pra não desfazer o que veio do site.
    {
      const { data: todos } = await supabase.from("content_items").select("id, image_url, box_color, footer_color").eq("business_id", id).order("position", { ascending: true }).limit(80);
      await Promise.all((todos ?? []).map((it, i) => {
        if (it.image_url && !it.footer_color) return supabase.from("content_items").update({ footer_color: corDe(i) }).eq("id", it.id);
        if (!it.image_url && (!it.box_color || it.box_color === "neutro")) return supabase.from("content_items").update({ box_color: corDe(i) }).eq("id", it.id);
        return null;
      }));
    }

    // Texto curto para os destaques sem descrição. Roda em segundo plano, sem segurar a tela.
    if (idsDestaque.length > 0) {
      void (async () => {
        const { data: semTexto } = await supabase.from("content_items").select("id, description").in("id", idsDestaque.slice(0, 4));
        for (const it of semTexto ?? []) {
          if (it.description?.trim()) continue;
          try {
            const r = await fetch("/api/gerar-descricao-item", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentItemId: it.id }) });
            const d = await r.json().catch(() => ({}));
            if (r.ok && typeof d.texto === "string" && d.texto.trim()) await supabase.from("content_items").update({ description: d.texto.trim() }).eq("id", it.id);
          } catch { /* fica sem texto, a pessoa escreve depois */ }
        }
      })();
    }

    await supabase.from("opportunities").insert({
      business_id: id,
      title: imp.imported > 0 ? "Revise seu catálogo" : "Importe seu catálogo",
      description: imp.imported > 0
        ? `A Orbi importou ${imp.imported} ${imp.imported === 1 ? "item" : "itens"} do seu site. Confira fotos, preços e nomes.`
        : "Cole o link do seu site no Catálogo e a Orbi transforma seus produtos em cards automaticamente.",
      category: "descoberta",
      impact_score: 92,
    });

    await supabase.from("businesses").update({ onboarding_status: "ready", home_mode: "vitrine" }).eq("id", id);

    const principal = ordem[0];
    setPronto({
      nome: name,
      slug,
      link: `${origemPublica()}/${slug}`,
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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const convEscolhida = conversao && conversao !== "orbi" ? conversaoPorId(conversao) : null;
  const leituraOk = analise.status === "ok";

  return (
    <main className={`relative flex min-h-[100dvh] justify-center overflow-x-clip overscroll-none px-5 ${step === "pronto" ? "items-center py-6" : step === "analisando" ? "items-start pb-16 pt-[9vh]" : step === "dados" ? "items-center py-8" : "items-start pb-10 pt-6"}`}>
      {step === "dados" && (novoNegocio ? (
        <Link href="/admin" className="fixed right-4 top-4 z-10 rounded-full bg-surface-white px-3.5 py-2 text-[12px] font-medium text-text-secondary shadow-[0_2px_10px_rgba(17,19,24,0.08)]">
          ← Voltar ao painel
        </Link>
      ) : (
        <button onClick={handleSignOut} className="fixed right-4 top-4 z-10 rounded-full bg-surface-white px-3.5 py-2 text-[12px] font-medium text-text-secondary shadow-[0_2px_10px_rgba(17,19,24,0.08)]">
          Sair
        </button>
      ))}

      {(step === "dados" || step === "objetivo" || step === "acao" || step === "revisar") && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-[320px] w-[320px] rounded-full bg-[#FFD9B8] opacity-60 blur-[90px]" />
          <div className="absolute -right-28 top-1/3 h-[300px] w-[300px] rounded-full bg-[#CFC3FF] opacity-60 blur-[90px]" />
          <div className="absolute -bottom-28 left-1/4 h-[300px] w-[300px] rounded-full bg-[#B9ECD6] opacity-60 blur-[90px]" />
        </div>
      )}

      <div className={`relative z-10 ${step === "pronto" ? "w-full" : "w-full max-w-md"}`}>
        {(step === "dados" || step === "objetivo" || step === "acao") && (
          <Passos atual={step === "dados" ? 1 : step === "objetivo" ? 2 : 3} />
        )}
        {step === "dados" && (
          <>
            <div className="mb-5 flex justify-center"><BrandOrb colors={null} size={64} /></div>
            {novoNegocio && <p className="mb-2 text-center text-[13px] font-medium text-text-tertiary">Novo Orbibox</p>}
            <h1 className="text-center font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-[1.12] tracking-[-0.02em]">Qual é o seu negócio?</h1>
            <p className="mx-auto mt-2 max-w-[340px] text-center text-[15px] leading-relaxed text-text-secondary">
              Mostre seu site ou Instagram. A Orbi lê tudo e monta seu Orbibox pra você.
            </p>
            <form onSubmit={comecar} className="mt-7 flex flex-col gap-2.5">
              <input required autoFocus placeholder="Nome da empresa" value={name} onChange={(e) => setName(e.target.value)} className={campo} />
              <input placeholder="seusite.com.br" inputMode="url" autoCapitalize="none" value={website} onChange={(e) => setWebsite(e.target.value)} className={campo} />
              <input placeholder="@seuinstagram" autoCapitalize="none" value={instagram} onChange={(e) => setInstagram(e.target.value)} className={campo} />
              {semLinks || (!temLinks && description) ? (
                <textarea
                  placeholder="Em uma frase, o que vocês fazem?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className={`${campo} resize-none !rounded-[24px]`}
                />
              ) : (
                !temLinks && (
                  <button type="button" onClick={() => setSemLinks(true)} className="self-center px-1 text-[13px] text-text-secondary underline underline-offset-2">
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

        {(step === "objetivo" || step === "acao") && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={step === "objetivo" ? voltarParaDados : () => setStep("objetivo")}
              aria-label="Voltar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/60 text-[16px] text-text-secondary ring-1 ring-white/80 backdrop-blur-xl active:scale-95"
            >
              ←
            </button>
            {/* A Orbi trabalhando, sempre visível no topo enquanto a pessoa escolhe. */}
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full bg-white/60 py-1.5 pl-1.5 pr-4 ring-1 ring-white/80 backdrop-blur-xl">
              <BrandOrb colors={orbColors} size={32} />
              <div className="min-w-0 flex-1">
                <p key={leituraOk ? "ok" : frase} className="orbi-linha-entra truncate text-[13px] font-medium">
                  {leituraOk ? "Pronto, já conheço sua marca" : `${LENDO[frase]}…`}
                </p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/5">
                  <div className="orbi-gradient h-full rounded-full transition-[width] duration-[1200ms] ease-out" style={{ width: leituraOk ? "100%" : `${18 + frase * 16}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "objetivo" && (
          <div key="objetivo">
            <h2 className="orbi-linha-entra mt-7 font-[family-name:var(--font-manrope)] text-[28px] font-medium leading-tight tracking-[-0.01em]">
              O que você mais quer?
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Objetivo">
              {OBJETIVOS.map((o, i) => (
                <Tile key={o.id} i={i} ativa={objetivo === o.id} onClick={() => escolherObjetivo(o.id)} titulo={o.rotulo} icone={VISUAL_OBJETIVO[o.id].icone} cor={VISUAL_OBJETIVO[o.id].cor} />
              ))}
              <PilulaOrbi i={OBJETIVOS.length} ativa={objetivo === "orbi"} onClick={() => escolherObjetivo("orbi")} />
            </div>
          </div>
        )}

        {step === "acao" && (
          <div key="acao">
            <h2 className="orbi-linha-entra mt-7 font-[family-name:var(--font-manrope)] text-[28px] font-medium leading-tight tracking-[-0.01em]">
              Qual ação mais importante do seu cliente quando ele chegar no seu Orbibox?
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Ação principal do cliente">
              {CONVERSOES.map((c, i) => (
                <Tile key={c.id} i={i} ativa={conversao === c.id} onClick={() => setConversao(c.id)} titulo={c.rotulo} icone={VISUAL_CONVERSAO[c.id].icone} cor={VISUAL_CONVERSAO[c.id].cor} />
              ))}
              <PilulaOrbi i={CONVERSOES.length} ativa={conversao === "orbi"} onClick={() => setConversao("orbi")} />
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

            <Button className="mt-6 w-full" variant="orbi" disabled={!objetivo || !conversao} onClick={confirmarRespostas}>
              {!conversao ? "Escolha uma opção" : "Ver meu Orbibox ✦"}
            </Button>
          </div>
        )}

        {step === "analisando" && (
          <AnaliseAoVivo nome={name} alvo={alvo} descoberta={descoberta} analise={analise} onDone={criar} />
        )}

        {step === "revisar" && revisao && <Revisar dados={revisao} onConfirmar={(v) => revisaoRef.current?.(v)} />}

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

        {step === "pronto" && pronto && <Pronto d={pronto} onTentarDeNovo={tentarDeNovo} tentando={tentando} />}
      </div>
    </main>
  );
}

const VISUAL_OBJETIVO: Record<string, { icone: NomeIcone; cor: string }> = {
  vender: { icone: "sacola", cor: "#FF7A3D" },
  apresentar: { icone: "brilho", cor: "#8758BE" },
  atender: { icone: "balao", cor: "#3B82F6" },
  tudo: { icone: "orbita", cor: "#1F9E4C" },
};
const VISUAL_CONVERSAO: Record<string, { icone: NomeIcone; cor: string }> = {
  comprar: { icone: "carrinho", cor: "#FF7A3D" },
  orcamento: { icone: "documento", cor: "#E9A100" },
  whatsapp: { icone: "whatsapp", cor: "#1FA855" },
  agendar: { icone: "agenda", cor: "#3B82F6" },
  visitar: { icone: "pino", cor: "#EA4335" },
  conhecer: { icone: "olho", cor: "#8758BE" },
  oferta: { icone: "ticket", cor: "#E8457C" },
  contato: { icone: "telefone", cor: "#0EA5E9" },
};

/** 1, 2, 3: onde a pessoa está e quanto falta. Barrinhas centralizadas e o nome do passo atual. */
function Passos({ atual }: { atual: 1 | 2 | 3 }) {
  const nomes = ["Seu negócio", "Seu objetivo", "Seus clientes"];
  return (
    <div className="mb-6 flex flex-col items-center gap-2" aria-label={`Passo ${atual} de 3: ${nomes[atual - 1]}`}>
      <div className="flex items-center gap-1.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-1.5 rounded-full transition-all duration-500 ${n === atual ? "w-8 bg-on-background" : n < atual ? "orbi-gradient w-5" : "w-5 bg-black/10"}`} />
        ))}
      </div>
      <p className="text-[12.5px] text-text-tertiary"><span className="font-semibold text-on-background">{atual} de 3</span> · {nomes[atual - 1]}</p>
    </div>
  );
}

/** Escolha em vidro, de dois em dois: ícone grande e uma palavra. Entra em cascata. */
function Tile({ i, ativa, onClick, titulo, icone, cor }: { i: number; ativa: boolean; onClick: () => void; titulo: string; icone: NomeIcone; cor: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativa}
      onClick={onClick}
      style={{ animationDelay: `${i * 0.05}s` }}
      className={`orbi-linha-entra relative flex min-h-[112px] flex-col items-start justify-between rounded-[24px] p-3.5 text-left backdrop-blur-xl transition-all duration-200 active:scale-[0.96] ${ativa ? "sel-orbi scale-[1.02] shadow-[0_14px_30px_-14px_rgba(110,197,214,0.8)]" : "bg-white/55 ring-1 ring-white/80 shadow-[0_8px_24px_-16px_rgba(17,19,24,0.25)]"}`}
    >
      <IconeOrbi nome={icone} cor={cor} tamanho={44} />
      <span className="relative z-10 text-[15px] font-medium leading-tight">{titulo}</span>
      {ativa && <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-on-background text-[12px] text-white" aria-hidden>✓</span>}
    </button>
  );
}

function PilulaOrbi({ i, ativa, onClick }: { i: number; ativa: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativa}
      onClick={onClick}
      style={{ animationDelay: `${i * 0.05}s` }}
      className={`orbi-linha-entra col-span-2 flex min-h-[52px] items-center justify-center gap-2 rounded-full text-[14px] font-medium backdrop-blur-xl transition-all active:scale-[0.98] ${ativa ? "sel-orbi" : "bg-white/55 text-text-secondary ring-1 ring-white/80"}`}
    >
      <span aria-hidden>✦</span> Deixe a Orbi decidir
    </button>
  );
}

