import { NextRequest, NextResponse } from "next/server";
import { extrairProposta, fetchSiteResiliente, type Extracted, type SiteType } from "@/lib/siteImport";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { businessId, url } = await req.json();
    if (!businessId || !url) {
      return NextResponse.json({ error: "businessId e url são obrigatórios." }, { status: 400 });
    }

    const supabase = await createClient();

    // Confirma que o negócio é do usuário logado (segurança).
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, owner_id, brand_colors")
      .eq("id", businessId)
      .maybeSingle();
    if (!business || business.owner_id !== user.id) {
      return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
    }

    const site = await fetchSiteResiliente(url);
    if (!site) {
      return NextResponse.json({ error: "Não consegui acessar esse site. Verifique o link." }, { status: 422 });
    }

    const proposta = await extrairProposta(site, url, business.name);
    if (!proposta) {
      return NextResponse.json({ error: "Não consegui interpretar o conteúdo do site." }, { status: 422 });
    }

    const tiposValidos: SiteType[] = ["ecommerce", "institucional", "links"];
    const siteType: SiteType = tiposValidos.includes(proposta.site_type) ? proposta.site_type : "institucional";
    const items: Extracted[] = Array.isArray(proposta.items) ? proposta.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "Não encontrei produtos ou serviços nesse site.", imported: 0 });
    }

    // Resolve o image_hint (img0/img1...) para a URL real, ou gera fallback genérico.
    function resolveImage(it: Extracted): { url: string | null; placeholder: boolean } {
      const hint = it.image_hint;
      if (hint) {
        const found = site!.images.find((img) => img.id === hint);
        if (found) return { url: found.url, placeholder: false };
      }
      // Sem foto no site (ou a Orbi preferiu não arriscar): o box fica em
      // cor sólida, como combinado. Não inventamos imagem de banco de
      // imagens, o dono coloca a dele se/quando quiser.
      return { url: null, placeholder: false };
    }

    // Descobre a posição inicial (append ao que já existe).
    const { count } = await supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);
    const startPos = count ?? 0;

    // Paleta pra vestir os cards que vierem SEM foto, assim a vitrine
    // importada já nasce colorida e bonita, em vez de um monte de quadrado
    // cinza. Usa as cores do DNA da marca (definidas pela Orbi); se não houver,
    // cai numa curadoria fixa de tons suaves. As cores entram intercaladas.
    function brandSwatches(): string[] {
      const raw = business!.brand_colors;
      const hexes: string[] = Array.isArray(raw)
        ? (raw as { hex?: string }[]).map((c) => c?.hex).filter((h): h is string => typeof h === "string" && /^#[0-9a-fA-F]{6}$/.test(h))
        : [];
      if (hexes.length >= 2) return hexes;
      // Curadoria fixa (chaves de BOX_COLORS), mistura de tons vivos e
      // pastéis pra vitrine importada já sair colorida e com bom contraste.
      return ["prim-azul", "bril-lima", "pastel-lavanda", "prim-verde", "energy-amarelo", "bril-pink", "pastel-ceu", "prim-roxo"];
    }
    const swatches = brandSwatches();

    const RHYTHM = ["destaque", "medio", "medio", "largo", "medio", "medio"];
    let semFotoIdx = 0;
    const usedImages = new Set<string>();
    const picked = items.slice(0, 12);
    const rows = picked.map((it, i) => {
      const img = resolveImage(it);
      // Trava de segurança: se por algum motivo a Orbi repetiu a mesma
      // imagem em dois itens, só o primeiro fica com ela, o resto vira cor.
      if (img.url) {
        if (usedImages.has(img.url)) img.url = null;
        else usedImages.add(img.url);
      }
      // Sem foto: veste com uma cor da paleta, alternando pra não repetir
      // duas iguais em seguida. Com foto: fica neutro, recortada (sem "moldura").
      const cor = img.url ? "neutro" : swatches[semFotoIdx++ % swatches.length];
      return {
        business_id: businessId,
        type: it.type === "service" || it.type === "link" ? it.type : "product",
        title: it.title?.slice(0, 200) || "Item sem título",
        description: it.description?.slice(0, 500) ?? null,
        price: typeof it.price === "number" ? it.price : null,
        brand_label: it.brand_label?.slice(0, 80) ?? null,
        image_url: img.url,
        image_is_placeholder: img.placeholder,
        // Destino do clique: categoria/produto vão para o site do dono.
        target_url: typeof it.target_url === "string" && it.target_url.startsWith("http") ? it.target_url : null,
        link_kind: ["categoria", "produto", "externo"].includes(it.link_kind ?? "") ? it.link_kind : null,
        // Ritmo visual: o primeiro vira destaque, os demais alternam.
        layout_size: RHYTHM[i % RHYTHM.length],
        box_style: img.url ? "foto" : "cor",
        box_color: cor,
        source_url: url,
        status: "published" as const,
        ai_optimized: true,
        position: startPos + i,
      };
    });

    const { data: inserted, error: insErr } = await supabase
      .from("content_items")
      .insert(rows)
      .select("id");
    if (insErr) {
      console.error("import-site: erro ao inserir", insErr);
      return NextResponse.json({ error: "Erro ao salvar os itens." }, { status: 500 });
    }

    // Guarda o que a Orbi entendeu: tipo do site, conhecimento e contatos.
    // Só preenche contato que ainda estiver vazio, não sobrescreve o que o dono digitou.
    const { data: atual } = await supabase
      .from("businesses")
      .select("contact_whatsapp, contact_phone, contact_email")
      .eq("id", businessId)
      .maybeSingle();

    await supabase
      .from("businesses")
      .update({
        last_import_url: url,
        last_import_at: new Date().toISOString(),
        site_type: siteType,
        contact_site: url,
        about_business: proposta.about_business ?? null,
        differentials: proposta.differentials ?? null,
        policies: proposta.policies ?? null,
        contact_whatsapp: atual?.contact_whatsapp ?? proposta.contact_whatsapp ?? null,
        contact_phone: atual?.contact_phone ?? proposta.contact_phone ?? null,
        contact_email: atual?.contact_email ?? proposta.contact_email ?? null,
      })
      .eq("id", businessId);

    return NextResponse.json({
      imported: inserted?.length ?? 0,
      ids: inserted?.map((r) => r.id) ?? [],
      siteType,
      motivo: proposta.motivo ?? null,
      semFoto: rows.filter((r) => !r.image_url).length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha na importação." }, { status: 500 });
  }
}
