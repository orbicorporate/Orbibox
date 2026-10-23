import { ehDonoOuAdmin } from "@/lib/business";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { AI_MODEL_RAPIDO, ANTHROPIC_API_URL } from "@/lib/aiModel";

export const runtime = "nodejs";
export const maxDuration = 60;

const TIPOS = ["logos", "produtos", "ambientes"] as const;
type Tipo = (typeof TIPOS)[number];
const MAX_POR_CHAMADA = 8;

const SISTEMA = `Você organiza o banco de imagens de uma marca. Para cada imagem numerada, escolha UM tipo:
- logos: logotipos, ícones, selos, marcas, artes gráficas, ilustrações, imagens com muito texto ou fundo liso de design
- produtos: o item vendido em destaque (prato, bebida, peça de roupa, joia, objeto, embalagem), fotos de detalhe do produto
- ambientes: lugares e cenas (fachada, interior da loja, salão, mesas, equipe, pessoas, eventos, paisagens)
Responda APENAS com JSON puro, uma lista na ordem das imagens, assim: ["produtos","logos"]. Sem explicação.`;

export async function POST(req: NextRequest) {
  try {
    const { businessId, ids } = (await req.json()) as { businessId?: string; ids?: string[] };
    if (!businessId || !Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "parâmetros" }, { status: 400 });
    const key = process.env.ANTHROPIC_API_KEY || process.env.CHAVE_API_ANTROPICA;
    if (!key) return NextResponse.json({ error: "sem chave" }, { status: 500 });

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ error: "sem login" }, { status: 401 });
    if (!(await ehDonoOuAdmin(userData.user.id, businessId))) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

    // O RLS garante que só entram imagens de uma marca da qual a pessoa é membro.
    const { data: linhas } = await supabase
      .from("image_library" as never)
      .select("id, path, tipo_corrigido, auto_tipo")
      .eq("business_id", businessId)
      .in("id", ids.slice(0, MAX_POR_CHAMADA));
    const alvo = ((linhas ?? []) as unknown as { id: string; path: string; tipo_corrigido: boolean; auto_tipo: string | null }[]).filter((l) => !l.tipo_corrigido);
    if (alvo.length === 0) return NextResponse.json({ resultados: {} });

    const blocos: { id: string; data: string }[] = [];
    for (const l of alvo) {
      try {
        const url = supabase.storage.from("box-images").getPublicUrl(l.path).data.publicUrl;
        const r = await fetch(url);
        if (!r.ok) continue;
        const miniatura = await sharp(Buffer.from(await r.arrayBuffer()))
          .rotate()
          .resize(512, 512, { fit: "inside", withoutEnlargement: true })
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: 70 })
          .toBuffer();
        blocos.push({ id: l.id, data: miniatura.toString("base64") });
      } catch {
        /* imagem ilegível: segue sem tipo */
      }
    }
    if (blocos.length === 0) return NextResponse.json({ resultados: {} });

    const content: unknown[] = [];
    blocos.forEach((b, n) => {
      content.push({ type: "text", text: `Imagem ${n + 1}:` });
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b.data } });
    });
    content.push({ type: "text", text: "Devolva a lista JSON." });

    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: AI_MODEL_RAPIDO, max_tokens: 120, system: SISTEMA, messages: [{ role: "user", content }] }),
    });
    if (!res.ok) {
      console.error("classificar-imagens", res.status, await res.text());
      return NextResponse.json({ error: "ia" }, { status: 502 });
    }
    const data = await res.json();
    const texto: string = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
    const m = texto.match(/\[[\s\S]*\]/);
    const lista: unknown[] = m ? JSON.parse(m[0]) : [];

    const resultados: Record<string, Tipo> = {};
    blocos.forEach((b, n) => {
      const t = String(lista[n] ?? "").toLowerCase();
      if ((TIPOS as readonly string[]).includes(t)) resultados[b.id] = t as Tipo;
    });

    await Promise.all(
      Object.entries(resultados).map(([id, t]) =>
        supabase.from("image_library" as never).update({ auto_tipo: t } as never).eq("id", id).eq("tipo_corrigido", false),
      ),
    );
    return NextResponse.json({ resultados });
  } catch (e) {
    console.error("classificar-imagens", e);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
