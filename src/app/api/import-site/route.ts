import { NextRequest, NextResponse } from "next/server";
import { extrairProposta, instagramHandle, lerMelhorFonte, type Extracted, type SiteType } from "@/lib/siteImport";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const businessId: string | undefined = body.businessId;
    const urlInformada: string = (body.url ?? "").trim();
    const instagram: string = (body.instagram ?? "").trim();
    if (!businessId || (!urlInformada && !instagram)) {
      return NextResponse.json({ error: "Informe o site ou o Instagram." }, { status: 400 });
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

    // Site primeiro; sem site (ou site vazio/bloqueado), o Instagram.
    const tentativas: string[] = [];
    const lida = await lerMelhorFonte({ site: urlInformada, instagram }, tentativas);
    if (!lida) {
      console.warn("import-site: nenhuma fonte legível", { urlInformada, instagram, tentativas });
      const soInstagram = !urlInformada && !!instagram;
      return NextResponse.json(
        {
          error: soInstagram
            ? "Não encontrei esse perfil do Instagram. Confere se o @ está certo e se o perfil é público."
            : "Não consegui abrir esse site agora. Confere o endereço, ou informe também o Instagram.",
          codigo: soInstagram ? "instagram_nao_encontrado" : "fonte_indisponivel",
        },
        { status: 422 },
      );
    }
    const site = lida.data;
    const url = lida.url;

    let proposta = await extrairProposta(site, url, business.name, lida.fonte);
    // Uma segunda chance antes de desistir (instabilidade da IA).
    if (!proposta) proposta = await extrairProposta(site, url, business.name, lida.fonte);
    if (!proposta) {
      return NextResponse.json({ error: "A Orbi não conseguiu montar a vitrine agora. Tenta de novo em instantes.", codigo: "ia" }, { status: 422 });
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

    // Fotos do Instagram vêm de links que expiram em poucos dias: copia pro
    // nosso armazenamento antes de salvar, senão a vitrine perde as fotos.
    async function rehospedar(src: string): Promise<string | null> {
      if (!/(cdninstagram\.com|fbcdn\.net)/i.test(src)) return src;
      try {
        const r = await fetch(src, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) return null;
        const blob = await r.blob();
        const tipo = blob.type || "image/jpeg";
        const path = `${businessId}/ig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${tipo.includes("webp") ? "webp" : "jpg"}`;
        const { error } = await supabase.storage.from("box-images").upload(path, blob, { contentType: tipo, cacheControl: "31536000", upsert: false });
        if (error) return null;
        return supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl;
      } catch {
        return null;
      }
    }

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

    await Promise.all(
      rows.map(async (r, idx) => {
        if (!r.image_url) return;
        const nova = await rehospedar(r.image_url);
        if (nova) {
          r.image_url = nova;
        } else {
          // Não deu pra copiar a foto: o card fica em cor, nunca com foto quebrada.
          r.image_url = null;
          r.box_style = "cor";
          r.box_color = swatches[idx % swatches.length];
        }
      }),
    );

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
      .select("contact_whatsapp, contact_phone, contact_email, about_business, contact_site, instagram_handle")
      .eq("id", businessId)
      .maybeSingle();

    await supabase
      .from("businesses")
      .update({
        last_import_url: url,
        last_import_at: new Date().toISOString(),
        site_type: siteType,
        contact_site: lida.fonte === "site" ? url : atual?.contact_site ?? null,
        instagram_handle: atual?.instagram_handle || (lida.fonte === "instagram" ? instagramHandle(url) : null) || (instagram ? instagramHandle(instagram) : null),
        // O que o dono escreveu no cadastro vale mais; a Orbi completa.
        about_business: atual?.about_business?.trim()
          ? proposta.about_business && !atual.about_business.includes(proposta.about_business.slice(0, 40))
            ? `${atual.about_business.trim()}\n\n${proposta.about_business}`
            : atual.about_business
          : proposta.about_business ?? null,
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
      fonte: lida.fonte,
      motivo: proposta.motivo ?? null,
      semFoto: rows.filter((r) => !r.image_url).length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha na importação." }, { status: 500 });
  }
}
