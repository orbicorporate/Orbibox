import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessInfo, LIMITES_GRATIS } from "@/lib/plans";
import { classificarHome, lerPlanoGratis, type DestaqueGuardado, type PlanoGratis } from "@/lib/planoGratis";

/**
 * Aplica a escolha do dono ao cair no plano grátis: mantém o que ele escolheu,
 * desativa o resto (sem apagar) e guarda a lista para restaurar quando assinar.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { businessId?: string; bolinhas?: string[]; destaques?: string[]; fotos?: string[] };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.is_anonymous) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
    if (!body.businessId) return NextResponse.json({ error: "Negócio ausente." }, { status: 400 });

    const { data: negocio } = await supabase.from("businesses").select("id, owner_id, home_destaques").eq("id", body.businessId).maybeSingle();
    if (!negocio || negocio.owner_id !== user.id) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

    const acesso = await getAccessInfo(user.id);
    if (!acesso.isFree) return NextResponse.json({ error: "Seu plano não é o grátis." }, { status: 409 });

    const bol = Array.from(new Set(body.bolinhas ?? []));
    const dest = Array.from(new Set(body.destaques ?? []));
    const fotos = Array.from(new Set(body.fotos ?? []));
    if (bol.length > LIMITES_GRATIS.bolinhas) return NextResponse.json({ error: `O grátis mantém até ${LIMITES_GRATIS.bolinhas} bolinhas.` }, { status: 400 });
    if (dest.length > LIMITES_GRATIS.boxes) return NextResponse.json({ error: `O grátis mantém até ${LIMITES_GRATIS.boxes} boxes.` }, { status: 400 });
    if (fotos.length > LIMITES_GRATIS.fotos) return NextResponse.json({ error: `O grátis mantém até ${LIMITES_GRATIS.fotos} fotos.` }, { status: 400 });

    const [{ data: caixas }, { data: itens }, { data: imagens }] = await Promise.all([
      supabase.from("smart_boxes").select("id, box_type, title, is_active, position, config").eq("business_id", negocio.id),
      supabase.from("content_items").select("id, title, image_url").eq("business_id", negocio.id),
      supabase.from("image_library" as never).select("id").eq("business_id", negocio.id).limit(5000),
    ]);
    const salvos = (Array.isArray(negocio.home_destaques) ? negocio.home_destaques : []) as DestaqueGuardado[];
    const home = classificarHome(caixas ?? [], salvos, itens ?? []);

    const validasBol = new Set(home.bolinhas.map((c) => c.chave));
    const validasDest = new Set(home.destaques.map((c) => c.chave));
    if (bol.some((k) => !validasBol.has(k)) || dest.some((k) => !validasDest.has(k))) {
      return NextResponse.json({ error: "A escolha não bate com a sua página inicial. Recarregue a tela." }, { status: 409 });
    }

    // Caixas a desligar: as bloqueadas no grátis e as que não foram escolhidas.
    const desligar = new Set<string>(home.bloqueados);
    for (const c of home.bolinhas) if (c.chave.startsWith("box:") && !bol.includes(c.chave)) desligar.add(c.chave.slice(4));
    for (const c of home.destaques) if (c.chave.startsWith("botao:") && !dest.includes(c.chave)) desligar.add(c.chave.slice(6));

    // Destaques salvos: fica só o que foi escolhido (vouchers saem sempre).
    const ficam: DestaqueGuardado[] = [];
    const saem: DestaqueGuardado[] = [];
    for (const d of salvos) {
      const chave = `${d.t}:${d.id}`;
      const mantem = (d.t === "item" || d.t === "botao") ? dest.includes(chave) : d.t === "item_bolinha" ? bol.includes(chave) : false;
      (mantem ? ficam : saem).push(d);
    }

    const idsFotos = ((imagens as { id: string }[] | null) ?? []).map((i) => i.id);
    const fotosOcultas = idsFotos.length > LIMITES_GRATIS.fotos ? idsFotos.filter((id) => !fotos.includes(id)) : [];
    if (idsFotos.length > LIMITES_GRATIS.fotos && fotos.length === 0) return NextResponse.json({ error: "Escolha as fotos que ficam." }, { status: 400 });

    const ids = Array.from(desligar);
    if (ids.length > 0) {
      const { error } = await supabase.from("smart_boxes").update({ is_active: false }).in("id", ids).eq("business_id", negocio.id);
      if (error) return NextResponse.json({ error: "Não consegui desativar agora. Tente de novo." }, { status: 500 });
    }
    const anterior = lerPlanoGratis((await supabase.from("businesses").select("plano_gratis" as never).eq("id", negocio.id).maybeSingle()).data?.["plano_gratis" as never]);
    const plano: PlanoGratis = {
      feito: true,
      em: new Date().toISOString(),
      desativados: {
        boxes: Array.from(new Set([...(anterior?.desativados?.boxes ?? []), ...ids])),
        destaques: [...(anterior?.desativados?.destaques ?? []), ...saem],
        fotos: Array.from(new Set([...(anterior?.desativados?.fotos ?? []), ...fotosOcultas])),
      },
    };
    const { error: errNeg } = await supabase.from("businesses").update({ home_destaques: ficam, plano_gratis: plano } as never).eq("id", negocio.id);
    if (errNeg) return NextResponse.json({ error: "Não consegui salvar a escolha. Tente de novo." }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("plano-gratis:", e);
    return NextResponse.json({ error: "Erro ao salvar a escolha." }, { status: 500 });
  }
}
