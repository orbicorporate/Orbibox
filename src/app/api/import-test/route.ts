import { NextRequest, NextResponse } from "next/server";
import { extrairProposta, lerMelhorFonte } from "@/lib/siteImport";

// TEMPORÁRIO: teste em lote da importação, sem gravar nada no banco.
// Protegido por chave; remover depois dos testes.
export const maxDuration = 60;
const CHAVE = "orbi-teste-7f3k9q2m";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  if (u.searchParams.get("key") !== CHAVE) return NextResponse.json({ error: "nope" }, { status: 404 });
  // Modo sonda: busca uma URL crua e mostra status e começo da resposta.
  const raw = u.searchParams.get("raw");
  if (raw) {
    const ua = u.searchParams.get("ua") === "bot"
      ? "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
      : u.searchParams.get("ua") === "google"
      ? "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
      : "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    const headers: Record<string, string> = { "User-Agent": ua, "Accept-Language": "pt-BR,pt;q=0.9" };
    if (u.searchParams.get("appid")) headers["x-ig-app-id"] = "936619743392459";
    try {
      const r = await fetch(raw, { headers, signal: AbortSignal.timeout(15000), redirect: "follow" });
      const t = await r.text();
      const find = u.searchParams.get("find");
      const idx = find ? t.indexOf(find) : -1;
      return NextResponse.json({ status: r.status, finalUrl: r.url, len: t.length, head: t.slice(0, 1500), achou: idx, trecho: idx >= 0 ? t.slice(idx, idx + 2500) : null });
    } catch (e) {
      return NextResponse.json({ erro: String(e) });
    }
  }
  const site = u.searchParams.get("site");
  const ig = u.searchParams.get("ig");
  const nome = u.searchParams.get("nome") || "Negócio";
  const soLer = u.searchParams.get("soLer") === "1";
  const t0 = Date.now();
  const lida = await lerMelhorFonte({ site, instagram: ig });
  const tLeitura = Date.now() - t0;
  if (!lida) return NextResponse.json({ ok: false, etapa: "leitura", tLeitura });
  const base = {
    fonte: lida.fonte,
    url: lida.url,
    tentativas: lida.tentativas,
    textoChars: lida.data.text.length,
    imagens: lida.data.images.length,
    links: lida.data.links.length,
    amostra: lida.data.text.slice(0, 300),
    tLeitura,
  };
  if (soLer) return NextResponse.json({ ok: true, ...base });
  const t1 = Date.now();
  const p = await extrairProposta(lida.data, lida.url, nome, lida.fonte);
  const tIA = Date.now() - t1;
  if (!p) return NextResponse.json({ ok: false, etapa: "ia", ...base, tIA });
  return NextResponse.json({
    ok: true,
    ...base,
    tIA,
    tipo: p.site_type,
    motivo: p.motivo,
    sobre: p.about_business,
    whatsapp: p.contact_whatsapp,
    itens: p.items.map((i) => `${i.title}${i.image_hint ? " [foto]" : ""}${i.target_url ? " -> " + i.target_url : ""}`),
  });
}
