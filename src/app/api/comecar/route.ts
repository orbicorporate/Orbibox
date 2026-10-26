import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ehDonoOuAdmin, getCurrentBusinessId } from "@/lib/business";
import { askClaude } from "@/lib/anthropic";
import { AI_MODEL_RAPIDO, ANTHROPIC_API_URL } from "@/lib/aiModel";
import { SEGMENTOS } from "@/lib/segmentos";

// Passo a passo do começo: a Orbi sugere categorias do catálogo, salva as
// escolhidas e já organiza os itens que existem, e recria os botões da página inicial
// caso a página tenha nascido sem eles.

export const maxDuration = 60;

/**
 * Olha as fotos que vieram do site e diz quais mostram com clareza o produto do
 * nome. Banner, logo, arte com texto, cena genérica ou foto de outra coisa ficam
 * de fora. Devolve os ids cuja foto NÃO serve. Em erro, não tira nenhuma.
 */
async function fotosQueNaoServem(itens: { id: string; title: string; image_url: string }[]): Promise<string[]> {
  const key = process.env.ANTHROPIC_API_KEY || process.env.CHAVE_API_ANTROPICA;
  if (!key || itens.length === 0) return [];
  const lotes: { id: string; title: string; image_url: string }[][] = [];
  for (let i = 0; i < itens.length; i += 8) lotes.push(itens.slice(i, i + 8));
  const sistema = `Você confere fotos de produtos importadas do site de uma loja. Para cada imagem numerada, com o nome do produto, responda "sim" se a foto mostra com clareza aquele produto (o próprio item ou a embalagem dele, reconhecível), ou "nao" se for banner, logotipo, arte com muito texto, ícone, cena genérica, pessoas sem o produto, foto de outra coisa, ou se estiver pequena ou borrada demais. Na dúvida, "nao". Responda APENAS com JSON puro, uma lista na ordem: ["sim","nao"].`;
  const resultados = await Promise.all(lotes.map(async (lote) => {
    try {
      const content: unknown[] = [];
      lote.forEach((it, i) => {
        content.push({ type: "text", text: `Imagem ${i + 1}: ${it.title}` });
        content.push({ type: "image", source: { type: "url", url: it.image_url } });
      });
      const r = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: AI_MODEL_RAPIDO, max_tokens: 200, system: sistema, messages: [{ role: "user", content }] }),
        signal: AbortSignal.timeout(40000),
      });
      if (!r.ok) return [];
      const d = await r.json();
      const txt = (d.content?.find((b: { type: string }) => b.type === "text")?.text ?? "") as string;
      const lista = JSON.parse(txt.slice(txt.indexOf("["), txt.lastIndexOf("]") + 1)) as unknown[];
      if (!Array.isArray(lista) || lista.length !== lote.length) return [];
      return lote.filter((_, i) => String(lista[i]).toLowerCase().startsWith("n")).map((it) => it.id);
    } catch {
      return [];
    }
  }));
  return resultados.flat();
}

function jsonDe(bruto: string) {
  return JSON.parse(bruto.slice(bruto.indexOf("{"), bruto.lastIndexOf("}") + 1));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  const body = (await req.json()) as { acao?: string; categorias?: string[]; businessId?: string };
  // No cadastro o negócio acabou de nascer: ele vem no corpo, conferindo que é do dono.
  const businessId = body.businessId && (await ehDonoOuAdmin(user.id, body.businessId)) ? body.businessId : await getCurrentBusinessId(user.id);
  if (!businessId) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

  const { data: biz } = await supabase.from("businesses").select("id, name, about_business, address, contact_whatsapp, vitrine_categories").eq("id", businessId).maybeSingle();
  if (!biz) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
  const { data: itens } = await supabase.from("content_items").select("id, title, brand_label, type, image_url").eq("business_id", businessId).eq("status", "published").limit(60);

  // Conferência do que veio do site, antes de mostrar para a pessoa: categorias
  // com nome de menu do site (Todos, Início, Loja...) saem, nomes estranhos são
  // corrigidos, e o que não é produto nem serviço (frete, política, contato) fica
  // escondido como rascunho. Nada é apagado.
  if (body.acao === "conferir") {
    const reais = (itens ?? []).filter((i) => i.type !== "link");
    if (reais.length === 0) return NextResponse.json({ ok: true });
    const cats = Array.from(new Set(reais.map((i) => i.brand_label?.trim()).filter((v): v is string => !!v)));
    const system = `Você revisa o catálogo que foi importado do site de um pequeno negócio no Brasil, antes de o dono ver.
1. Categorias: para cada categoria, devolva o nome corrigido (curto, 1 a 3 palavras, em português, com inicial maiúscula) ou null se não for categoria de verdade (ex.: Todos, Início, Home, Loja, Produtos, Menu, Destaques, Promoções genéricas, Sem categoria, nomes de página).
2. Itens: liste os ids que NÃO são produto ou serviço vendido (ex.: frete, política, troca, contato, quem somos, cupom, blog, página institucional, duplicado exato).
Na dúvida, mantenha. Responda SOMENTE em JSON: {"categorias": {"<original>": "<corrigido>" ou null}, "ocultar": ["<id>"]}`;
    const userTxt = `Negócio: ${biz.name}. Sobre: ${(biz.about_business ?? "").slice(0, 400)}\nCategorias: ${cats.join(" | ") || "nenhuma"}\nItens:\n${reais.map((i) => `${i.id} | ${i.title} | ${i.brand_label ?? ""}`).join("\n")}`;
    try {
      const j = jsonDe(await askClaude({ system, messages: [{ role: "user", content: userTxt }], maxTokens: 1500, model: AI_MODEL_RAPIDO }));
      const mapa = (j.categorias ?? {}) as Record<string, string | null>;
      const ocultar = new Set((Array.isArray(j.ocultar) ? j.ocultar : []).map(String));
      // Segurança: se a IA quiser esconder metade ou mais, não esconde nada.
      const podeOcultar = ocultar.size < reais.length / 2;
      let alterados = 0;
      for (const it of reais) {
        const atual = it.brand_label?.trim() ?? "";
        const campos: { brand_label?: string | null; status?: string } = {};
        if (atual && atual in mapa) {
          const novo = mapa[atual];
          const limpo = typeof novo === "string" ? novo.trim().slice(0, 30) : null;
          if (limpo !== atual) campos.brand_label = limpo || null;
        }
        if (podeOcultar && ocultar.has(it.id)) campos.status = "draft";
        if (Object.keys(campos).length > 0) {
          await supabase.from("content_items").update(campos).eq("id", it.id);
          alterados++;
        }
      }
      // Fotos: só fica a que mostra o produto com clareza. As outras saem e o card
      // fica na cor da marca, até o dono colocar uma foto boa.
      const comFoto = reais.filter((i): i is typeof i & { image_url: string } => !!i.image_url && /^https?:\/\//.test(i.image_url) && !(podeOcultar && ocultar.has(i.id))).slice(0, 32);
      const semServir = await fotosQueNaoServem(comFoto);
      await Promise.all(semServir.map((itemId) => supabase.from("content_items").update({ image_url: null, box_style: "cor" }).eq("id", itemId)));
      return NextResponse.json({ ok: true, alterados, fotosTiradas: semServir.length });
    } catch {
      return NextResponse.json({ ok: true, alterados: 0 });
    }
  }

  if (body.acao === "sugerir") {
    const titulos = (itens ?? []).filter((i) => i.type !== "link").map((i) => i.title).slice(0, 30).join("; ");
    const system = `Você ajuda donos de pequenos negócios no Brasil a montar o menu do catálogo. Sugira de 3 a 6 categorias curtas (1 a 3 palavras, em português, sem emoji) que organizem o que o negócio vende ou oferece. Responda SOMENTE em JSON: {"categorias": ["...", "..."]}`;
    const user = `Negócio: ${biz.name}. Sobre: ${(biz.about_business ?? "").slice(0, 500)}. Itens já cadastrados: ${titulos || "nenhum"}.`;
    try {
      const j = jsonDe(await askClaude({ system, messages: [{ role: "user", content: user }], maxTokens: 250, model: AI_MODEL_RAPIDO }));
      const cats = (Array.isArray(j.categorias) ? j.categorias : []).map((c: unknown) => String(c).trim().slice(0, 30)).filter(Boolean).slice(0, 6);
      if (cats.length >= 2) return NextResponse.json({ categorias: cats });
    } catch { /* cai no padrão */ }
    return NextResponse.json({ categorias: SEGMENTOS[0].categorias.concat(SEGMENTOS[5].categorias).slice(0, 5) });
  }

  if (body.acao === "salvar") {
    const cats = Array.from(new Set((body.categorias ?? []).map((c) => String(c).trim().slice(0, 30)).filter(Boolean))).slice(0, 12);
    if (cats.length === 0) return NextResponse.json({ error: "Escolha pelo menos uma categoria." }, { status: 400 });
    await supabase.from("businesses").update({ vitrine_categories: cats }).eq("id", businessId);

    // Organiza os itens que ainda estão sem categoria.
    const soltos = (itens ?? []).filter((i) => !i.brand_label?.trim() && i.type !== "link");
    let organizados = 0;
    if (soltos.length > 0) {
      const system = `Distribua cada item em UMA das categorias dadas, a que mais combina. Responda SOMENTE em JSON: {"mapa": {"<id>": "<categoria exata>"}}. Use só categorias da lista.`;
      const user = `Categorias: ${cats.join(" | ")}\nItens:\n${soltos.map((i) => `${i.id}: ${i.title}`).join("\n")}`;
      try {
        const j = jsonDe(await askClaude({ system, messages: [{ role: "user", content: user }], maxTokens: 700, model: AI_MODEL_RAPIDO }));
        const mapa = (j.mapa ?? {}) as Record<string, string>;
        for (const it of soltos) {
          const c = mapa[it.id];
          if (c && cats.includes(c)) {
            await supabase.from("content_items").update({ brand_label: c }).eq("id", it.id);
            organizados++;
          }
        }
      } catch { /* o dono organiza na mão */ }
    }
    return NextResponse.json({ ok: true, organizados });
  }

  if (body.acao === "botoes") {
    const { count } = await supabase.from("smart_boxes").select("id", { count: "exact", head: true }).eq("business_id", businessId);
    if ((count ?? 0) > 0) return NextResponse.json({ ok: true, criados: 0 });
    type Linha = { business_id: string; box_type: string; title: string; position: number; is_active: boolean; config: Record<string, string> };
    const linhas: Linha[] = [
      { business_id: businessId, box_type: "hero", title: "Tela inicial", position: 0, is_active: true, config: {} },
      { business_id: businessId, box_type: "product", title: "Catálogo", position: 1, is_active: true, config: {} },
      { business_id: businessId, box_type: "agent", title: "Pergunte o que quiser", position: 2, is_active: true, config: {} },
      { business_id: businessId, box_type: "content", title: "Conhecer", position: 3, is_active: true, config: {} },
    ];
    let pos = 4;
    if (biz.contact_whatsapp) linhas.push({ business_id: businessId, box_type: "custom", title: "Fale no WhatsApp", position: pos++, is_active: true, config: { label: "Fale no WhatsApp", subtitle: "Atendimento rápido", icon: "__wadisc__", color: "transparent", action: "whatsapp", url: "" } });
    if (biz.address) linhas.push({ business_id: businessId, box_type: "custom", title: "Como chegar", position: pos++, is_active: true, config: { label: "Como chegar", subtitle: "Veja no mapa", icon: "__pin__", color: "transparent", action: "endereco", url: biz.address } });
    linhas.push({ business_id: businessId, box_type: "campaign", title: "Presentear", position: pos++, is_active: false, config: {} });
    const { error } = await supabase.from("smart_boxes").insert(linhas);
    if (error) return NextResponse.json({ error: "Não consegui criar os botões." }, { status: 500 });
    return NextResponse.json({ ok: true, criados: linhas.length });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
