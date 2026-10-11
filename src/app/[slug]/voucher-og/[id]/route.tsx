import { ImageResponse } from "next/og";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { voucherTheme } from "@/lib/voucherThemes";
import { descontoGrande } from "@/lib/voucherDesconto";

/**
 * Capinha do link de UM voucher: o próprio card, em 1200x630. É o que
 * aparece quando a marca cola o link do voucher no WhatsApp, Instagram etc.
 * A foto do voucher pode estar em webp (o upload converte), que o gerador de
 * imagem não lê, então ela passa antes por um PNG.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const supabase = await createClient();
  const { data: b } = await supabase.from("businesses").select("id, name").eq("slug", slug).maybeSingle();
  const { data: v } = b
    ? await supabase
        .from("vouchers")
        .select("title, discount_type, discount_value, image_url, badge, color, quantity_total, quantity_claimed, show_discount")
        .eq("id", id)
        .eq("business_id", b.id)
        .eq("is_active", true)
        .maybeSingle()
    : { data: null };

  if (!b || !v) return new Response("Voucher não encontrado", { status: 404 });

  const tema = voucherTheme(v.color);
  const gift = v.discount_type === "gift";
  const mostrar = v.show_discount !== false;
  const grande = gift ? "Brinde" : mostrar ? descontoGrande(v) : null;
  const restam = v.quantity_total - v.quantity_claimed;

  let foto: string | null = null;
  if (v.image_url) {
    try {
      const r = await fetch(v.image_url);
      if (r.ok) {
        const png = await sharp(Buffer.from(await r.arrayBuffer()))
          .resize(500, 500, { fit: "cover" })
          .png()
          .toBuffer();
        foto = `data:image/png;base64,${png.toString("base64")}`;
      }
    } catch { /* sem foto: o card usa só o desconto */ }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: 56,
          backgroundImage: `linear-gradient(135deg, ${tema.from} 0%, ${tema.via} 55%, ${tema.to} 100%)`,
          color: "#fff",
        }}
      >
        {foto && (
          <div style={{ display: "flex", position: "relative", width: 500, height: 500, borderRadius: 40, overflow: "hidden", marginRight: 56, flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} width={500} height={500} alt="" style={{ width: 500, height: 500, objectFit: "cover" }} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          {v.badge?.trim() && (
            <div style={{ display: "flex", alignSelf: "flex-start", padding: "8px 20px", borderRadius: 999, background: "rgba(0,0,0,0.35)", fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 24 }}>
              {v.badge}
            </div>
          )}
          {grande && <div style={{ display: "flex", fontSize: foto ? 96 : 150, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>{grande}</div>}
          <div style={{ display: "flex", fontSize: grande ? 46 : 72, fontWeight: grande ? 600 : 800, lineHeight: 1.15, marginTop: grande ? 24 : 0, opacity: 0.95 }}>{v.title}</div>
          <div style={{ display: "flex", fontSize: 30, marginTop: 20, opacity: 0.85 }}>
            {b.name}{restam > 0 && restam <= 20 ? `  ·  restam ${restam}` : ""}
          </div>
          <div style={{ display: "flex", alignSelf: "flex-start", marginTop: 36, padding: "16px 36px", borderRadius: 999, background: "#fff", color: tema.ctaText, fontSize: 32, fontWeight: 800 }}>
            Pegar meu voucher
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } },
  );
}
