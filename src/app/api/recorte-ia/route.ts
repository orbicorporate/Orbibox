import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 4 * 1024 * 1024;

function pedido(cor: string) {
  return `This is a cropped piece of a restaurant menu. Make a clean studio product photo of ONLY the product shown (the drink, dessert or dish itself), centered, square framing, with a small even margin around it.
Background: a seamless, flat surface in the exact solid color ${cor}, the same tone from edge to edge, no texture, no pattern, no gradient, no horizon line. Lighting: soft, even light from above, with a soft, realistic contact shadow right under the product and a very subtle gentle shadow falloff on the surface, so it looks naturally placed on the surface.
Remove everything that is not the product: price badges or circles, prices, product names, letters, numbers, logos, decorative borders, other menu elements and the original background.
Keep the product exactly as it is in the image: same shape, colors, toppings, quantity and details. Do not invent, add, redraw or beautify anything, and do not change the packaging or its text. If part of the product is cut off by the edge of the crop, keep it as it is, do not complete it.
No text, no extra objects, no props, no hands.`;
}

/** Recorte com IA: devolve só o produto, centralizado, em fundo claro e neutro. */
export async function POST(req: NextRequest) {
  const chave = process.env.OPENAI_API_KEY;
  if (!chave) return NextResponse.json({ error: "indisponivel" }, { status: 501 });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

  let imagem: File | null = null;
  let cor = "#F4F1EA";
  try {
    const form = await req.formData();
    const f = form.get("imagem");
    if (f instanceof File) imagem = f;
    const c = form.get("cor");
    if (typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)) cor = c;
  } catch { /* trata abaixo */ }
  if (!imagem || imagem.size === 0 || imagem.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem inválida." }, { status: 400 });
  }

  const corpo = new FormData();
  corpo.append("model", "gpt-image-1");
  corpo.append("image", imagem, "prato.jpg");
  corpo.append("prompt", pedido(cor));
  corpo.append("size", "1024x1024");
  corpo.append("quality", "medium");
  corpo.append("input_fidelity", "high");
  corpo.append("n", "1");

  try {
    const r = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}` },
      body: corpo,
      signal: AbortSignal.timeout(110_000),
    });
    if (!r.ok) {
      console.error("recorte-ia", r.status, (await r.text()).slice(0, 300));
      return NextResponse.json({ error: "A IA não conseguiu agora." }, { status: 502 });
    }
    const json = (await r.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "Sem imagem." }, { status: 502 });
    return new NextResponse(Buffer.from(b64, "base64"), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("recorte-ia", e);
    return NextResponse.json({ error: "A IA demorou demais." }, { status: 504 });
  }
}
