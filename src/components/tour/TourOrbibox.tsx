"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

/**
 * Tour curto depois do cadastro, na página real da pessoa. Cada parada tem uma
 * cor própria, um nome curto e uma frase. As três primeiras ficam na Home
 * pública (bolinhas, tags e destaques); as duas últimas no Catálogo do painel.
 * O passo atual fica guardado no aparelho, então o tour atravessa as páginas.
 */

type Fase = "home" | "catalogo";
type Parada = { fase: Fase; alvo: string | null; cor: string; nome: string; texto: string };

const PARADAS: Parada[] = [
  { fase: "home", alvo: "t-bolinhas", cor: "#1FA855", nome: "Bolinhas", texto: "Atalhos rápidos: WhatsApp, endereço, redes." },
  { fase: "home", alvo: "t-tags", cor: "#F29D38", nome: "Tags", texto: "Voucher, gift card, promoção ou um produto em evidência." },
  { fase: "home", alvo: "t-destaques", cor: "#3B5BDB", nome: "Destaques", texto: "Produtos, serviços ou categorias do seu catálogo." },
  { fase: "catalogo", alvo: "t-catalogo", cor: "#8758BE", nome: "Catálogo", texto: "Todos os seus itens, cada um com página própria. A coroa leva o item para a Home." },
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

export function TourOrbibox({ fase, slug, iniciar = false }: { fase: Fase; slug: string; iniciar?: boolean }) {
  const router = useRouter();
  const passo = useSyncExternalStore(assinar, () => ler(slug), () => null);
  const [rect, setRect] = useState<Rect | null>(null);

  // ?tour=1 na Home começa do primeiro passo.
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

  const fim = parada.alvo === null;
  const total = PARADAS.length - 1;
  const embaixo = rect ? rect.top + rect.height / 2 < window.innerHeight / 2 : true;

  if (fim) {
    return (
      <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 p-4 sm:items-center">
        <div className="orbi-linha-entra w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl">
          <p className="font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight">Pronto!</p>
          <p className="mt-1 text-[14px] text-text-secondary">Seu Orbibox está no ar. Agora explore:</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { t: "Vouchers", c: "#C4122F" },
              { t: "Gift card", c: "#E8508A" },
              { t: "Stories", c: "#8134AF" },
              { t: "Números", c: "#0E9AA7" },
            ].map((x) => (
              <span key={x.t} className="rounded-2xl py-3 text-[14px] font-semibold text-white" style={{ backgroundColor: x.c }}>{x.t}</span>
            ))}
          </div>
          <button type="button" onClick={avancar} className="orbi-gradient mt-5 w-full rounded-full py-3.5 text-[15.5px] font-semibold text-on-background">Vamos começar</button>
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
            {PARADAS.slice(0, total).map((p, i) => <span key={p.nome} className="h-1.5 w-4 rounded-full" style={{ backgroundColor: i <= passo ? p.cor : "rgba(0,0,0,.1)" }} />)}
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
