import sharp from "sharp";
import { renderGiftOg } from "@/lib/giftOg";

export const dynamic = "force-dynamic";

/** Capa do link do gift em JPEG leve: o WhatsApp descarta capas pesadas. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const png = Buffer.from(await (await renderGiftOg(code)).arrayBuffer());
  const jpg = await sharp(png).flatten({ background: "#ffffff" }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300, s-maxage=300" } });
}
