import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { askClaude } from "@/lib/anthropic";
import { AI_MODEL_RAPIDO } from "@/lib/aiModel";
import { SEGMENTOS } from "@/lib/segmentos";

// Passo a passo do começo: a Orbi sugere categorias do catálogo, salva as
// escolhidas e já organiza os itens que existem, e recria os botões da Home
// caso a página tenha nascido sem eles.

function jsonDe(bruto: string) {
  return JSON.parse(bruto.slice(bruto.indexOf("{"), bruto.lastIndexOf("}") + 1));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  const businessId = await getCurrentBusinessId(user.id);
  if (!businessId) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

  const body = (await req.json()) as { acao?: string; categorias?: string[] };
  const { data: biz } = await supabase.from("businesses").select("id, name, about_business, address, contact_whatsapp, vitrine_categories").eq("id", businessId).maybeSingle();
  if (!biz) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
  const { data: itens } = await supabase.from("content_items").select("id, title, brand_label, type").eq("business_id", businessId).eq("status", "published").limit(60);

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
      { business_id: businessId, box_type: "product", title: "O que fazemos", position: 1, is_active: true, config: {} },
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
