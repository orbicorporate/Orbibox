"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { conferirAntesDeCompartilhar } from "@/components/compartilhar/ChecklistDivulgar";

/**
 * Tour curto depois do cadastro, na página real da pessoa. Cada parada tem uma
 * cor própria, um nome curto e uma frase. As três primeiras ficam na página inicial
 * pública (bolinhas, tags e destaques); as duas últimas no Catálogo do painel.
 * O passo atual fica guardado no aparelho, então o tour atravessa as páginas.
 */

type Fase = "home" | "catalogo";
type Parada = { fase: Fase; alvo: string | null; cor: string; nome: string; texto: string };

const PARADAS: Parada[] = [
  { fase: "home", alvo: null, cor: "#111318", nome: "Intro", texto: "" },
  { fase: "home", alvo: "t-bolinhas", cor: "#1FA855", nome: "Bolinhas", texto: "Atalhos rápidos: WhatsApp, endereço, redes." },
  { fase: "home", alvo: "t-tags", cor: "#F29D38", nome: "Tags", texto: "Voucher, gift card, promoção ou um produto em evidência." },
  { fase: "home", alvo: "t-destaques", cor: "#3B5BDB", nome: "Destaques", texto: "Produtos, serviços ou categorias do seu catálogo." },
  { fase: "catalogo", alvo: "t-catalogo", cor: "#8758BE", nome: "Catálogo", texto: "Todos os seus itens, cada um com página própria. A coroa leva o item para a página inicial." },
  { fase: "catalogo", alvo: null, cor: "#111318", nome: "Pronto", texto: "Seu Orbibox está no ar." },
];

const EVENTO = "orbi-tour";
const chaveDe = (slug: string) => `orbi_tour_${slug}`;
const chaveFim = (slug: string) => `orbi_tour_fim_${slug}`;

function ler(slug: string): number | null {
  try {
    const v = window.localStorage.getItem(chaveDe(slug));
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}
function gravar(slug: string, passo: number | null) {
  try {
    if (passo === null) {
      window.localStorage.removeItem(chaveDe(slug));
      window.localStorage.setItem(chaveFim(slug), "1");
    } else window.localStorage.setItem(chaveDe(slug), String(passo));
  } catch { /* sem armazenamento: o tour só não continua */ }
  window.dispatchEvent(new Event(EVENTO));
}
function assinar(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  return () => window.removeEventListener(EVENTO, cb);
}

/** O tour já foi visto (ou pulado) neste aparelho. */
export function tourVisto(slug: string): boolean {
  try {
    return window.localStorage.getItem(chaveFim(slug)) === "1";
  } catch {
    return false;
  }
}

type Rect = { top: number; left: number; width: number; height: number };

/** Miniatura de uma das duas telas do Orbibox, na abertura do tour. */
function Tela({ n, nome, cor, sub, desenho }: { n: number; nome: string; cor: string; sub: string; desenho: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[150px] w-[92px] overflow-hidden rounded-[18px] border-[3px] border-[#16171a] bg-white p-2 shadow-lg">{desenho}</div>
      <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold text-white" style={{ backgroundColor: cor }}><span className="text-white/70">{n}</span>{nome}</span>
      <span className="text-center text-[11.5px] leading-tight text-text-tertiary">{sub}</span>
    </div>
  );
}

export function TourOrbibox({ fase, slug, iniciar = false }: { fase: Fase; slug: string; iniciar?: boolean }) {
  const router = useRouter();
  const passo = useSyncExternalStore(assinar, () => ler(slug), () => null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [copiado, setCopiado] = useState(false);
  async function compartilhar() {
    const url = `${window.location.origin}/${slug}`;
    try {
      if (navigator.share) { await navigator.share({ text: "Conheça nossa página", url }); return; }
    } catch { /* cancelou */ }
    try { await navigator.clipboard.writeText(url); setCopiado(true); } catch { /* sem clipboard */ }
  }

  // ?tour=1 na página inicial começa do primeiro passo.
  useEffect(() => {
    if (iniciar) gravar(slug, 0);
  }, [iniciar, slug]);

  const parada = passo !== null && passo >= 0 && passo < PARADAS.length ? PARADAS[passo] : null;
  const ativa = !!parada && parada.fase === fase;

  const medir = useCallback(() => {
    if (!parada?.alvo) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${parada.alvo}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [parada]);

  const avancar = useCallback(() => {
    if (passo === null) return;
    const prox = passo + 1;
    if (prox >= PARADAS.length) { gravar(slug, null); router.push("/admin"); return; }
    gravar(slug, prox);
    if (PARADAS[prox].fase !== fase) router.push(PARADAS[prox].fase === "catalogo" ? "/admin/vitrine" : `/${slug}`);
  }, [passo, slug, fase, router]);

  // Procura o alvo; se a parte não existe nesta página (ex.: sem tags), pula a parada.
  useEffect(() => {
    if (!ativa || !parada?.alvo) return;
    let tentativas = 0;
    let cancelado = false;
    const procurar = () => {
      if (cancelado) return;
      const el = document.querySelector(`[data-tour="${parada.alvo}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(medir, 380);
        return;
      }
      tentativas += 1;
      if (tentativas < 15) window.setTimeout(procurar, 120);
      else avancar();
    };
    procurar();
    return () => { cancelado = true; };
  }, [ativa, parada, medir, avancar]);

  useEffect(() => {
    if (!ativa) return;
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [ativa, medir]);

  if (!ativa || !parada || passo === null) return null;

  const fim = parada.nome === "Pronto";
  const intro = parada.nome === "Intro";
  const embaixo = rect ? rect.top + rect.height / 2 < window.innerHeight / 2 : true;

  // Abertura: o Orbibox são duas telas. Você deixa as duas bonitas, a Orbi faz o resto.
  if (intro) {
    return (
      <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 p-4 sm:items-center">
        <div className="orbi-linha-entra w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl">
          <p className="text-center font-[family-name:var(--font-manrope)] text-[24px] font-medium leading-tight">Seu Orbibox tem 2 telas</p>
          <p className="mt-1 text-center text-[14px] text-text-secondary">Deixe as duas bonitas.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Tela n={1} nome="Tela inicial" cor="#1FA855" sub="Onde o cliente chega" desenho={
              <div className="flex flex-col items-center gap-1.5">
                <span className="mt-1 h-7 w-7 rounded-full bg-black/10" />
                <span className="flex gap-1">{["#25D366", "#EA4335", "#3B5BDB", "#F29D38"].map((c) => <span key={c} className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: c }} />)}</span>
                <span className="h-3 w-14 rounded-full bg-[#F29D38]/70" />
                <span className="grid w-full grid-cols-2 gap-1">{[0, 1, 2, 3].map((k) => <span key={k} className="h-7 rounded-md bg-[#3B5BDB]/25" />)}</span>
              </div>
            } />
            <Tela n={2} nome="Catálogo" cor="#8758BE" sub="Categorias e produtos, cada um com página" desenho={
              <div className="flex flex-col gap-1.5">
                <span className="h-2 w-10 rounded-full bg-black/25" />
                <span className="grid grid-cols-2 gap-1">{[0, 1].map((k) => <span key={k} className="h-8 rounded-md bg-[#8758BE]/30" />)}</span>
                <span className="h-2 w-8 rounded-full bg-black/25" />
                <span className="grid grid-cols-2 gap-1">{[0, 1, 2, 3].map((k) => <span key={k} className="h-6 rounded-md bg-[#8758BE]/20" />)}</span>
              </div>
            } />
          </div>
          <div className="mt-5 rounded-[20px] bg-[#F4EEFB] p-3.5">
            <p className="text-[13px] font-semibold text-[#8758BE]">✦ O resto a sua IA faz</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Divulgar", "Campanhas", "Responder clientes", "Ofertas"].map((t) => <span key={t} className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium">{t}</span>)}
            </div>
          </div>
          <button type="button" onClick={avancar} className="orbi-gradient mt-5 w-full rounded-full py-3.5 text-[15.5px] font-semibold text-on-background">Mostrar como funciona</button>
          <button type="button" onClick={() => gravar(slug, null)} className="mt-1 min-h-[40px] w-full text-[13px] text-text-tertiary">Pular</button>
        </div>
      </div>
    );
  }

  if (fim) {
    return (
      <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 p-4 sm:items-center">
        <div className="orbi-linha-entra w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl">
          <p className="font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight">Pronto!</p>
          <p className="mt-1 text-[14px] text-text-secondary">Seu Orbibox está no ar.</p>
          {/* Uma única próxima ação: mandar o link para quem já conhece a marca. */}
          <div className="mt-5 rounded-[22px] bg-[#E9F8EF] p-4 text-left">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#1F9E4C]">Agora faça isso</p>
            <p className="mt-1 text-[16px] font-semibold leading-snug">Confira se está bonito e mande seu link</p>
            <button type="button" onClick={() => { gravar(slug, null); conferirAntesDeCompartilhar(slug, compartilhar); }} className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#1F9E4C] text-[15px] font-semibold text-white active:scale-[0.98]">
              {copiado ? "Link copiado ✓" : "Conferir e compartilhar"}
            </button>
          </div>
          <button type="button" onClick={avancar} className="mt-3 min-h-[44px] w-full rounded-full text-[14px] font-medium text-text-secondary">Ir para o painel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[95]">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-[22px] transition-all duration-300"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: `0 0 0 9999px rgba(11,12,16,0.62), 0 0 0 3px ${parada.cor}, 0 0 30px 6px ${parada.cor}80`,
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}
      <div
        className="fixed inset-x-4 mx-auto max-w-sm rounded-[24px] bg-white p-4 shadow-2xl"
        style={embaixo ? { bottom: 24 } : { top: 24 }}
      >
        <div className="flex items-center gap-2">
          <span key={parada.nome} className="selo-vibra rounded-full px-3 py-1 text-[12.5px] font-semibold text-white" style={{ backgroundColor: parada.cor }}>{parada.nome}</span>
          <span className="ml-auto flex gap-1" aria-hidden>
            {PARADAS.map((p, i) => (p.alvo ? <span key={p.nome} className="h-1.5 w-4 rounded-full" style={{ backgroundColor: i <= passo ? p.cor : "rgba(0,0,0,.1)" }} /> : null))}
          </span>
        </div>
        <p className="mt-2.5 text-[15px] leading-snug">{parada.texto}</p>
        <div className="mt-3.5 flex items-center justify-between">
          <button type="button" onClick={() => gravar(slug, null)} className="text-[13px] text-text-tertiary">Pular</button>
          <button type="button" onClick={avancar} className="rounded-full px-5 py-2.5 text-[14px] font-semibold text-white" style={{ backgroundColor: parada.cor }}>Próximo →</button>
        </div>
      </div>
    </div>
  );
}
