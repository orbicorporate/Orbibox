import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { giftTheme } from "@/lib/giftThemes";

export const alt = "Gift card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/** O cartão do gift como imagem: é o que aparece na prévia do link no WhatsApp. */
export default async function GiftOg({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_gift_card", { p_code: code });
  const g = data as { value_cents: number; from_name: string | null; to_name: string | null; business_name: string; art_url: string | null; art_theme: string | null } | null;

  const negocio = g?.business_name ?? "Orbibox";
  const valor = g ? (g.value_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "";
  const t = giftTheme(g?.art_theme);
  const linha = [g?.to_name ? `Para ${g.to_name}` : null, g?.from_name ? `de ${g.from_name}` : null].filter(Boolean).join(" ");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", backgroundImage: `linear-gradient(135deg, ${t.from} 0%, ${t.via} 55%, ${t.to} 100%)`, color: "#fff" }}>
        {g?.art_url ? (
          <img src={g.art_url} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, width: 1200, height: 630, objectFit: "cover" }} />
        ) : null}
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: g?.art_url ? "linear-gradient(90deg, rgba(10,12,16,0.82) 0%, rgba(10,12,16,0.55) 55%, rgba(10,12,16,0.25) 100%)" : "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 40%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: "100%", height: "100%" }}>
          <div style={{ display: "flex", fontSize: 34, letterSpacing: 6, textTransform: "uppercase", opacity: 0.9 }}>Gift card</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 150, fontWeight: 700, lineHeight: 1 }}>{valor}</div>
            {linha ? <div style={{ display: "flex", fontSize: 40, marginTop: 24, opacity: 0.92 }}>{linha}</div> : null}
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 600 }}>{negocio}</div>
        </div>
      </div>
    ),
    size,
  );
}
