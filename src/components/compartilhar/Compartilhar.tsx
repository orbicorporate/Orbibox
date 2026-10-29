"use client";

import Link from "next/link";
import { origemPublica } from "@/lib/appUrl";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Compartilhar do visitante: o Orbibox da marca, o cardápio, um voucher ou um produto.
 * WhatsApp manda o link, e o WhatsApp monta a capinha (imagem, título e descrição)
 * a partir do preview da página. Stories gera uma arte vertical 1080x1920 na hora
 * e abre a folha do celular com ela (Instagram aparece lá); o link fica copiado
 * para colar no adesivo de link.
 */
export type AlvoCompartilhar = {
  /** Caminho ou URL completa. Caminho relativo vira URL do site atual. */
  url: string;
  /** O que está sendo compartilhado: "Cardápio", "Voucher", o nome do produto... */
  titulo: string;
  /** Rótulo pequeno acima do título na arte do story ("Cardápio", "Voucher"). */
  rotulo?: string;
  /** Frase que vai antes do link no WhatsApp. */
  texto?: string;
  marca: string;
  /** Descrição salva pra o preview do link da marca (a mesma que o WhatsApp mostra). */
  descricao?: string | null;
  imagem?: string | null;
  logo?: string | null;
  /** Cor de destaque da arte do story. */
  cor?: string | null;
};

/** Tira utm_*, fbclid e afins do link compartilhado. */
function semRastreio(u: string) {
  try {
    const x = new URL(u);
    for (const k of Array.from(x.searchParams.keys())) if (/^(utm_|fbclid|igshid|gclid|gbraid|wbraid|ttclid|msclkid|mc_)/i.test(k)) x.searchParams.delete(k);
    return x.toString();
  } catch { return u; }
}
function urlCompleta(u: string) {
  if (/^https?:\/\//.test(u)) {
    // Link antigo no endereço da Vercel vira o endereço oficial.
    try {
      const x = new URL(u);
      if (x.hostname.endsWith(".vercel.app")) return `${origemPublica()}${x.pathname}${x.search}${x.hash}`;
    } catch {}
    return u;
  }
  return `${origemPublica()}${u.startsWith("/") ? "" : "/"}${u}`;
}

/** Igual ao corte do preview real: uma linha só no WhatsApp. */
function curtoPreview(t: string) {
  const f = t.trim();
  return f.length > 38 ? `${f.slice(0, 36).replace(/[\s,.;:]+\S*$/, "").replace(/[\s,.;:]+$/, "")}…` : f;
}

export function IconeCompartilhar({ tam = 20 }: { tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5.5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="18.5" r="2.6" />
      <path d="M8.3 10.7l7.4-3.9M8.3 13.3l7.4 3.9" />
    </svg>
  );
}

/** O link compartilhado fica limpo, só o endereço da marca, sem nada depois. */
function comoPublico(alvo: AlvoCompartilhar): AlvoCompartilhar {
  return alvo;
}

export function BotaoCompartilhar({ alvo, className, tam = 20, style, children }: { alvo: AlvoCompartilhar; className?: string; tam?: number; style?: React.CSSProperties; children?: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`Compartilhar ${alvo.titulo}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAberto(true); }}
        className={className ?? "grid h-10 w-10 place-items-center rounded-full bg-surface-soft text-on-background transition-transform active:scale-90"}
        style={style}
      >
        <IconeCompartilhar tam={tam} />
        {children}
      </button>
      {aberto && <FolhaCompartilhar alvo={comoPublico(alvo)} aoFechar={() => setAberto(false)} />}
    </>
  );
}

/* ---------- Arte do story ---------- */

function carregar(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

function cobrir(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.max(w / img.width, h / img.height);
  const iw = img.width * r, ih = img.height * r;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function caixa(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function linhas(ctx: CanvasRenderingContext2D, texto: string, max: number, limite: number) {
  const out: string[] = [];
  let l = "";
  for (const p of texto.split(/\s+/)) {
    const t = l ? `${l} ${p}` : p;
    if (ctx.measureText(t).width > max && l) { out.push(l); l = p; } else l = t;
  }
  if (l) out.push(l);
  if (out.length > limite) { out.length = limite; out[limite - 1] = `${out[limite - 1].replace(/\s+\S*$/, "")}…`; }
  return out;
}

async function desenharStory(alvo: AlvoCompartilhar, link: string, comFotos: boolean): Promise<Blob | null> {
  const W = 1080, H = 1920;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  const cor = alvo.cor && /^#[0-9a-f]{6}$/i.test(alvo.cor) ? alvo.cor : "#8A1D22";
  const foto = comFotos && alvo.imagem ? await carregar(alvo.imagem) : null;
  const logo = comFotos && alvo.logo ? await carregar(alvo.logo) : null;

  // Fundo: a própria foto desfocada e escurecida, ou um degradê na cor da marca.
  if (foto) {
    ctx.save();
    ctx.filter = "blur(60px) saturate(1.2)";
    cobrir(ctx, foto, -120, -120, W + 240, H + 240);
    ctx.restore();
    ctx.fillStyle = "rgba(14,12,12,0.42)";
    ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, cor);
    g.addColorStop(1, "#141012");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Cartão central com a capa.
  const cx = 110, cy = 330, cw = W - 220, ch = foto ? 860 : 0;
  if (foto) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
    caixa(ctx, cx, cy, cw, ch, 64);
    ctx.fillStyle = "#000"; ctx.fill();
    ctx.restore();
    ctx.save();
    caixa(ctx, cx, cy, cw, ch, 64);
    ctx.clip();
    cobrir(ctx, foto, cx, cy, cw, ch);
    ctx.restore();
  }

  // Logo redondo encostado na base do cartão.
  let y = foto ? cy + ch : 620;
  if (logo) {
    const r = 92;
    ctx.save();
    ctx.beginPath(); ctx.arc(W / 2, y, r + 10, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.arc(W / 2, y, r, 0, Math.PI * 2); ctx.clip();
    const s = Math.min((r * 2 * 0.8) / logo.width, (r * 2 * 0.8) / logo.height);
    ctx.fillStyle = "#fff"; ctx.fillRect(W / 2 - r, y - r, r * 2, r * 2);
    ctx.drawImage(logo, W / 2 - (logo.width * s) / 2, y - (logo.height * s) / 2, logo.width * s, logo.height * s);
    ctx.restore();
    y += r + 90;
  } else {
    y += 110;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "500 34px -apple-system, system-ui, sans-serif";
  ctx.letterSpacing = "6px";
  // Rótulo repetindo o título ("Cardápio" e "Cardápio") vira o nome da marca no alto.
  const repete = !alvo.rotulo || alvo.rotulo.toLowerCase() === alvo.titulo.toLowerCase();
  ctx.fillText((repete ? alvo.marca : alvo.rotulo!).toUpperCase(), W / 2, y);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "#fff";
  ctx.font = "500 84px -apple-system, system-ui, sans-serif";
  const ls = linhas(ctx, alvo.titulo, W - 200, 2);
  ls.forEach((l, i) => ctx.fillText(l, W / 2, y + 110 + i * 96));
  y += 110 + ls.length * 96;

  if (!repete && alvo.marca !== alvo.titulo && alvo.rotulo !== alvo.marca) {
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "400 40px -apple-system, system-ui, sans-serif";
    ctx.fillText(alvo.marca, W / 2, y + 10);
  }

  // Pílula com o link, para quem vê saber onde tocar.
  const txt = link.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  ctx.font = "500 36px -apple-system, system-ui, sans-serif";
  const pw = Math.min(W - 160, ctx.measureText(txt).width + 120), ph = 96, py = H - 260;
  caixa(ctx, (W - pw) / 2, py, pw, ph, ph / 2);
  ctx.fillStyle = "rgba(255,255,255,0.94)"; ctx.fill();
  ctx.fillStyle = "#14161A";
  ctx.fillText(txt, W / 2, py + 61, pw - 60);

  return new Promise((res) => {
    try { cv.toBlob((b) => res(b), "image/png"); } catch { res(null); }
  });
}

/* ---------- Folha ---------- */

export function FolhaCompartilhar({ alvo, aoFechar }: { alvo: AlvoCompartilhar; aoFechar: () => void }) {
  const [saindo, setSaindo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const link = typeof window !== "undefined" ? semRastreio(urlCompleta(alvo.url)) : alvo.url;
  const texto = alvo.texto ?? `Olha ${alvo.titulo === alvo.marca ? alvo.marca : `${alvo.titulo}, de ${alvo.marca}`}:`;
  const temShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const fechar = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return aoFechar();
    setSaindo(true);
    window.setTimeout(aoFechar, 220);
  }, [aoFechar]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [fechar]);

  async function copiar(msg = "Link copiado") {
    try { await navigator.clipboard.writeText(link); setAviso(msg); return true; } catch { return false; }
  }

  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n${link}`)}`, "_blank", "noopener");
    fechar();
  }

  async function stories() {
    setGerando(true); setAviso(null);
    let blob = await desenharStory(alvo, link, true);
    // Foto de outro domínio sem permissão trava o canvas: refaz só com cor.
    if (!blob) blob = await desenharStory(alvo, link, false);
    setGerando(false);
    if (!blob) return setAviso("Não consegui gerar a arte agora.");
    const arquivo = new File([blob], `${alvo.marca.replace(/[^\w-]+/g, "-").toLowerCase() || "orbibox"}-story.png`, { type: "image/png" });
    await copiar();
    if (temShare && navigator.canShare?.({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo] });
        setAviso("Link copiado. No story, use o adesivo de link e cole.");
      } catch { /* cancelou */ }
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(arquivo);
    a.download = arquivo.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setAviso("Arte salva e link copiado. No story, use o adesivo de link e cole.");
  }

  async function mais() {
    try { await navigator.share({ title: alvo.titulo, text: texto, url: link }); fechar(); } catch { /* cancelou */ }
  }

  const opcoes: { k: string; nome: string; fundo: string; icone: React.ReactNode; acao: () => void }[] = [
    { k: "wa", nome: "WhatsApp", fundo: "#25D366", acao: whatsapp, icone: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden><path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.8l5.1-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.6c-1.5 0-2.9-.4-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.8zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5.1.2 1.7 2.7 4.2 3.7 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.4z" /></svg>
    ) },
    { k: "st", nome: gerando ? "Gerando..." : "Stories", fundo: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)", acao: () => void stories(), icone: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" aria-hidden><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="#fff" stroke="none" /></svg>
    ) },
    { k: "cp", nome: "Copiar link", fundo: "#14161A", acao: () => void copiar(), icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" /></svg>
    ) },
  ];
  if (temShare) opcoes.push({ k: "mais", nome: "Mais", fundo: "#E9E7E2", acao: () => void mais(), icone: <span className="text-on-background"><IconeCompartilhar tam={24} /></span> });

  return createPortal(
    <div className={`cp-fundo ${saindo ? "sai" : ""}`} onClick={fechar}>
      <div role="dialog" aria-modal="true" aria-label={`Compartilhar ${alvo.titulo}`} onClick={(e) => e.stopPropagation()} className={`cp-box ${saindo ? "sai" : ""}`}>
        <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-black/10" />
        {/* Prévia da capinha, do jeito que chega no WhatsApp. */}
        <div className="rounded-[22px] bg-[#EFE9E1] p-3">
          <div className="ml-auto w-[92%] rounded-[14px] rounded-tr-[4px] bg-[#D9FDD3] p-1.5 shadow-[0_1px_1px_rgba(17,19,24,0.12)]">
            <div className="overflow-hidden rounded-[10px] bg-black/[0.06]">
              <div className="flex h-[118px] w-full items-center justify-center bg-white/60">
                {alvo.imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={alvo.imagem} alt="" className="h-full w-full object-cover" />
                ) : alvo.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={alvo.logo} alt="" className="h-full w-full object-contain p-4" />
                ) : (
                  <span className="text-[12.5px] text-text-tertiary">Sem capinha</span>
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="truncate text-[13.5px] font-medium text-on-background">{alvo.titulo === alvo.marca ? `Visite nosso Orbibox - ${alvo.marca}` : alvo.titulo}</p>
                <p className="truncate text-[12px] text-text-secondary">{alvo.titulo === alvo.marca ? (alvo.descricao?.trim() ? curtoPreview(alvo.descricao) : `Conheça ${alvo.marca}, produtos, serviços e contato num só link.`) : alvo.marca}</p>
                <p className="truncate text-[11.5px] text-text-tertiary">{link.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}</p>
              </div>
            </div>
            <p className="px-1.5 pb-0.5 pt-1.5 text-[13px] leading-snug text-on-background">{texto} <span className="text-[#027EB5] underline">{link.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}</span></p>
          </div>
        </div>
        {alvo.titulo === alvo.marca && (
          <Link href="/admin/config/marca#compartilhamento" onClick={() => fechar()} className="mt-2.5 flex items-center gap-3 rounded-[18px] bg-[linear-gradient(110deg,#A80F28,#C4122F_50%,#E4264C)] px-3.5 py-3 text-white shadow-[0_10px_22px_-12px_rgba(196,18,47,0.9)] active:scale-[0.99]">
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-white">{alvo.imagem ? "Deixe a capinha ainda mais bonita" : "Crie uma capinha legal"}</span>
              <span className="block text-[12.5px] text-white/80">É a primeira coisa que a pessoa vê no WhatsApp.</span>
            </span>
            <span className="shrink-0 text-[18px] text-white" aria-hidden>→</span>
          </Link>
        )}

        <ul className="mt-5 grid grid-cols-4 gap-2">
          {opcoes.map((o, i) => (
            <li key={o.k} className="cp-op" style={{ ["--i" as string]: i }}>
              <button type="button" onClick={o.acao} disabled={o.k === "st" && gerando} className="flex w-full flex-col items-center gap-2 disabled:opacity-60">
                <span className="grid h-14 w-14 place-items-center rounded-full shadow-[0_6px_16px_-8px_rgba(17,19,24,0.5)] transition-transform active:scale-90" style={{ background: o.fundo }}>{o.icone}</span>
                <span className="text-[12.5px] text-text-secondary">{o.nome}</span>
              </button>
            </li>
          ))}
        </ul>

        <p role="status" aria-live="polite" className="mt-3 min-h-[20px] text-center text-[13px] text-text-secondary">{aviso}</p>
        <button type="button" onClick={fechar} className="mt-1 min-h-[48px] w-full rounded-full bg-surface-soft text-[15px] text-on-background">Fechar</button>
      </div>
    </div>,
    document.body,
  );
}
