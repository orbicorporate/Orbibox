import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { giftTheme } from "@/lib/giftThemes";

export const alt = "Gift card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/** Baixa a foto e embute no SVG: dentro de um SVG a imagem precisa estar em data URI. */
async function fotoEmDataUri(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const tipo = r.headers.get("content-type") ?? "image/jpeg";
    if (!tipo.startsWith("image/") || tipo.includes("svg")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 4_000_000) return null;
    return `data:${tipo};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** O cartão do gift montado como na tela: foto nítida à direita, vidro fosco na cor escolhida à esquerda. É a prévia do link no WhatsApp. */
export default async function GiftOg({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_gift_card", { p_code: code });
  const g = data as { value_cents: number; from_name: string | null; to_name: string | null; message: string | null; business_name: string; art_url: string | null; art_theme: string | null } | null;

  const negocio = g?.business_name ?? "Orbibox";
  const valor = g ? (g.value_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "";
  const t = giftTheme(g?.art_theme);
  const foto = g?.art_url ? await fotoEmDataUri(g.art_url) : null;

  const fundo = (
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tema" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.from} />
          <stop offset=".55" stopColor={t.via} />
          <stop offset="1" stopColor={t.to} />
        </linearGradient>
        <radialGradient id="luz" cx=".18" cy="-.1" r="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".34" />
          <stop offset=".4" stopColor="#fff" stopOpacity=".08" />
          <stop offset=".7" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id="b1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="40" /></filter>
        <filter id="b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22" /></filter>
        <clipPath id="vidro"><path d="M0,0 H792 C688,189 688,441 792,630 H0 Z" /></clipPath>
        <clipPath id="tudo"><rect width="1200" height="630" /></clipPath>
      </defs>
      {foto ? (
        <g clipPath="url(#tudo)">
          <image href={foto} x="-120" y="-80" width="1440" height="790" preserveAspectRatio="xMidYMid slice" filter="url(#b1)" />
          <image href={foto} x="504" y="0" width="696" height="630" preserveAspectRatio="xMaxYMid slice" />
          <g clipPath="url(#vidro)">
            <image href={foto} x="-120" y="-80" width="1000" height="790" preserveAspectRatio="xMidYMid slice" filter="url(#b2)" />
            <rect width="800" height="630" fill="url(#tema)" opacity=".58" />
            <rect width="800" height="630" fill="#000" opacity=".1" />
            <rect width="800" height="630" fill="url(#luz)" />
          </g>
          <path d="M792,0 C688,189 688,441 792,630" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="2" />
        </g>
      ) : (
        <>
          <rect width="1200" height="630" fill="url(#tema)" />
          <rect width="1200" height="630" fill="url(#luz)" />
        </>
      )}
      <rect x="1.5" y="1.5" width="1197" height="627" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="3" />
    </svg>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", color: "#fff" }}>
        <div style={{ position: "absolute", top: 0, left: 0, display: "flex" }}>{fundo}</div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px", width: foto ? 700 : 1200, height: "100%" }}>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", fontSize: 26, letterSpacing: 5, textTransform: "uppercase", padding: "10px 30px", borderRadius: 999, border: "2px solid rgba(255,255,255,0.45)", backgroundColor: "rgba(255,255,255,0.16)" }}>Gift card</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 34, opacity: 0.92 }}>{negocio}</div>
            {g?.to_name ? <div style={{ display: "flex", fontSize: 34, marginTop: 6, opacity: 0.88 }}>{`Para ${g.to_name}`}</div> : null}
            <div style={{ display: "flex", fontSize: 140, fontWeight: 700, lineHeight: 1.05, letterSpacing: -4 }}>{valor}</div>
            {g?.message ? <div style={{ display: "flex", fontSize: 32, marginTop: 8, opacity: 0.92 }}>{`“${g.message.length > 60 ? g.message.slice(0, 57) + "..." : g.message}”`}</div> : null}
            {g?.from_name ? <div style={{ display: "flex", fontSize: 30, marginTop: 14, opacity: 0.88 }}>{`de ${g.from_name}`}</div> : null}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
