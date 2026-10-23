import { ehDonoOuAdmin } from "@/lib/business";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ClienteBanco } from "@/lib/bancoImagens";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 4 * 1024 * 1024;
/** Capas geradas por negócio em cada mês. O contador é o próprio banco de imagens (arquivos "capa-ia-"). */
const LIMITE_MES = 20;
const BUCKET = "box-images";

const TAMANHOS: Record<string, string> = {
  quadrado: "1024x1024",
  retrato: "1024x1536",
  paisagem: "1536x1024",
  banner: "1536x1024",
};

type Cor = { hex?: string };

function pedido(o: { assunto: string; nome: string; cores: string; tom: string; sobre: string; comFoto: boolean; instrucao: string; fotos: number }) {
  // O dono descreveu o que quer (como num chat): o pedido dele manda, a marca só orienta.
  if (o.instrucao) {
    return [
      o.instrucao,
      "",
      o.fotos > 0
        ? `The ${o.fotos === 1 ? "attached image is a reference" : "attached images are references"} supplied by the user. Follow the request above and use the attachment(s) as the user describes. If an attachment is a product, venue or logo, keep it faithful and recognizable, do not redraw or invent it.`
        : "",
      o.cores || o.nome ? `Brand context, only a subtle guide that never overrides the request${o.nome ? ` (brand ${o.nome})` : ""}${o.cores ? `: palette ${o.cores}` : ""}.` : "",
      "No watermarks or price badges.",
    ].filter((l, i, a) => l !== "" || (i > 0 && a[i - 1] !== "")).join("\n");
  }
  return [
    `Create a cover image for "${o.assunto || "the business"}"${o.nome ? `, from the brand ${o.nome}` : ""}.`,
    o.comFoto
      ? "Use the attached photo as the base (product, venue or logo): keep the real product, dish or place recognizable and faithful, do not invent or alter it. Place it in a refined composition that feels like the brand."
      : "Make a refined, appetizing, realistic photographic composition that feels like the brand.",
    o.cores ? `Brand colors to guide the palette and background: ${o.cores}.` : "",
    o.tom ? `Brand tone: ${o.tom}` : "",
    o.sobre ? `About the brand: ${o.sobre}` : "",
    "Style: photographic, modern and clean, natural soft light, generous breathing room in the composition.",
    "Absolutely no text, letters, numbers, logos, watermarks or price badges.",
  ].filter(Boolean).join("\n");
}

/** Gera uma capa com a cara da marca. Salva no banco de imagens e devolve a URL. */
export async function POST(req: NextRequest) {
  const chave = process.env.OPENAI_API_KEY;
  if (!chave) return NextResponse.json({ error: "indisponivel" }, { status: 501 });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

  let businessId = "";
  let assunto = "";
  let formato = "quadrado";
  let imagens: File[] = [];
  let instrucao = "";
  try {
    const form = await req.formData();
    businessId = String(form.get("businessId") ?? "");
    assunto = String(form.get("assunto") ?? "").slice(0, 120);
    formato = String(form.get("formato") ?? "quadrado");
    instrucao = String(form.get("instrucao") ?? "").trim().slice(0, 900);
    imagens = form.getAll("imagem").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 3);
  } catch { /* trata abaixo */ }
  if (!/^[0-9a-f-]{36}$/i.test(businessId)) return NextResponse.json({ error: "Negócio inválido." }, { status: 400 });
  if (!(await ehDonoOuAdmin(userData.user.id, businessId))) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  if (imagens.some((f) => f.size > MAX_BYTES)) return NextResponse.json({ error: "A foto de base é grande demais." }, { status: 400 });
  const tamanho = TAMANHOS[formato] ?? TAMANHOS.quadrado;

  // O negócio precisa ser do usuário (as regras do banco já filtram por dono ou administrador).
  const { data: negocio } = await supabase
    .from("businesses")
    .select("id, name, brand_colors, about_business, brand_voice_summary")
    .eq("id", businessId)
    .maybeSingle();
  if (!negocio) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

  // Limite mensal, contando as capas geradas neste mês.
  const inicioMes = new Date();
  inicioMes.setUTCDate(1);
  inicioMes.setUTCHours(0, 0, 0, 0);
  // image_library ainda não está nos tipos gerados.
  const biblioteca = supabase as unknown as ClienteBanco;
  const { count } = await biblioteca
    .from("image_library")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .like("path", `${businessId}/capa-ia-%`)
    .gte("created_at", inicioMes.toISOString());
  if ((count ?? 0) >= LIMITE_MES) {
    return NextResponse.json({ error: `Você usou as ${LIMITE_MES} capas do mês. Elas voltam no começo do próximo mês.`, limite: true }, { status: 429 });
  }

  const cores = Array.isArray(negocio.brand_colors)
    ? (negocio.brand_colors as Cor[]).map((c) => c?.hex).filter((h): h is string => !!h && /^#[0-9a-fA-F]{6}$/.test(h)).slice(0, 5).join(", ")
    : "";
  const texto = pedido({
    assunto,
    nome: negocio.name ?? "",
    cores,
    tom: (negocio.brand_voice_summary ?? "").replace(/\s+/g, " ").slice(0, 160),
    sobre: (negocio.about_business ?? "").replace(/\s+/g, " ").slice(0, 220),
    comFoto: imagens.length > 0,
    instrucao,
    fotos: imagens.length,
  });

  const modelo = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini";
  const qualidade = process.env.OPENAI_IMAGE_QUALITY || "medium";

  try {
    let r: Response;
    if (imagens.length > 0) {
      const corpo = new FormData();
      corpo.append("model", modelo);
      imagens.forEach((f, i) => corpo.append("image[]", f, `base-${i}.jpg`));
      corpo.append("prompt", texto);
      corpo.append("size", tamanho);
      corpo.append("quality", qualidade);
      corpo.append("n", "1");
      r = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${chave}` }, body: corpo, signal: AbortSignal.timeout(110_000) });
    } else {
      r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelo, prompt: texto, size: tamanho, quality: qualidade, n: 1 }),
        signal: AbortSignal.timeout(110_000),
      });
    }
    if (!r.ok) {
      console.error("gerar-capa", modelo, r.status, (await r.text()).slice(0, 300));
      return NextResponse.json({ error: "A IA não conseguiu agora. Tente de novo." }, { status: 502 });
    }
    const json = (await r.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "A IA não devolveu a imagem." }, { status: 502 });

    // Guarda no banco de imagens: serve de contador e fica disponível no Álbum.
    let bytes: Buffer = Buffer.from(b64, "base64");
    let tipo = "image/png";
    let ext = "png";
    try {
      const sharp = (await import("sharp")).default;
      bytes = await sharp(bytes).webp({ quality: 86 }).toBuffer();
      tipo = "image/webp";
      ext = "webp";
    } catch { /* sem sharp: guarda o PNG mesmo */ }
    const path = `${businessId}/capa-ia-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: tipo, cacheControl: "31536000", upsert: false });
    if (upErr) {
      console.error("gerar-capa upload", upErr.message);
      return NextResponse.json({ error: "Não consegui guardar a imagem. Tente de novo." }, { status: 500 });
    }
    await biblioteca.from("image_library").insert({ business_id: businessId, path, size_bytes: bytes.length });
    const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    return NextResponse.json({ url, restantes: Math.max(0, LIMITE_MES - ((count ?? 0) + 1)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("gerar-capa", e);
    return NextResponse.json({ error: "A IA demorou demais. Tente de novo." }, { status: 504 });
  }
}
