"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Antes de divulgar, a pessoa confere se a página está bonita: primeiro o
 * Catálogo, depois a página inicial, cada um numa prévia de celular com "Está pronto"
 * ou "Editar". Regras:
 * - Primeira vez que tenta compartilhar: abre o checklist.
 * - Segunda vez: pergunta se já conferiu (Conferir ou Já conferi).
 * - Da terceira em diante: compartilha direto.
 * Qualquer botão de compartilhar chama `conferirAntesDeCompartilhar`; o
 * `ChecklistDivulgarHost`, montado uma vez no painel, cuida do resto.
 */

const EVENTO = "orbi-checklist-divulgar";
type Pedido = { slug: string; compartilhar: () => void | Promise<void>; /** Tour de conferência: página inicial, depois catálogo, sem pergunta no começo. */ tour?: boolean };

const kOk = (slug: string) => `orbi_checklist_ok_${slug}`;
const kVezes = (slug: string) => `orbi_share_n_${slug}`;
function lerNum(k: string) { try { return Number(window.localStorage.getItem(k) ?? "0") || 0; } catch { return 0; } }
function gravar(k: string, v: string) { try { window.localStorage.setItem(k, v); } catch { /* sem armazenamento */ } }

/** Tira o slug de um link do Orbibox (https://orbibox.app/vabene → vabene). */
export function slugDoLink(url: string): string {
  try { return new URL(url, window.location.origin).pathname.split("/").filter(Boolean)[0] ?? ""; } catch { return ""; }
}

/** Tour de conferência: leva pela página inicial (bolinhas, tags e destaque) e depois pelo catálogo (itens). */
export function conferirTour(slug: string, aoTerminar: () => void) {
  window.dispatchEvent(new CustomEvent<Pedido>(EVENTO, { detail: { slug, compartilhar: aoTerminar, tour: true } }));
}

export function conferirAntesDeCompartilhar(slug: string, compartilhar: () => void | Promise<void>) {
  if (!slug) { void compartilhar(); return; }
  const vezes = lerNum(kVezes(slug));
  const conferiu = lerNum(kOk(slug)) === 1;
  if (conferiu && vezes >= 2) {
    gravar(kVezes(slug), String(vezes + 1));
    void compartilhar();
    return;
  }
  window.dispatchEvent(new CustomEvent<Pedido>(EVENTO, { detail: { slug, compartilhar } }));
}

/** Largura de um celular de verdade: a página renderiza assim e a prévia só encolhe, sem quebrar nomes. */
const LARGURA_CELULAR = 390;

function PreviaEscalada({ src, onLoad }: { src: string; onLoad: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [caixa, setCaixa] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setCaixa({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const escala = caixa.w > 0 ? caixa.w / LARGURA_CELULAR : 1;
  return (
    <div ref={ref} className="h-full w-full overflow-hidden">
      <iframe
        src={src}
        title="Prévia"
        onLoad={onLoad}
        className="origin-top-left border-0"
        style={{ width: LARGURA_CELULAR, height: caixa.h / escala, transform: `scale(${escala})` }}
      />
    </div>
  );
}

type Tela = "pergunta" | "catalogo" | "home" | "pronto";

export function ChecklistDivulgarHost() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [tela, setTela] = useState<Tela>("catalogo");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const ouvir = (e: Event) => {
      const d = (e as CustomEvent<Pedido>).detail;
      const conferiu = lerNum(kOk(d.slug)) === 1;
      setPedido(d);
      setCarregando(true);
      setTela(d.tour ? "home" : conferiu ? "pergunta" : "catalogo");
    };
    window.addEventListener(EVENTO, ouvir);
    return () => window.removeEventListener(EVENTO, ouvir);
  }, []);

  if (!pedido || typeof document === "undefined") return null;
  const slug = pedido.slug;

  function fechar() { setPedido(null); }
  function compartilharAgora() {
    if (!pedido) return;
    gravar(kVezes(slug), String(lerNum(kVezes(slug)) + 1));
    const acao = pedido.compartilhar;
    setPedido(null);
    void acao();
  }
  function ir(t: Tela) { setCarregando(true); setTela(t); }

  const tour = !!pedido.tour;
  const etapa = tela === "catalogo" ? (tour ? 2 : 1) : tela === "home" ? (tour ? 1 : 2) : 0;
  const proxima: Tela = tela === "home" ? (tour ? "catalogo" : "pronto") : tour ? "pronto" : "home";
  const destino = tela === "catalogo" ? `/${slug}?preview=1&tab=vitrine` : `/${slug}?preview=1`;
  const editar = tela === "catalogo" ? "/admin/vitrine" : `/${slug}`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/55 p-3 sm:items-center" onClick={fechar}>
      <div className="orbi-linha-entra flex max-h-[94dvh] w-full max-w-md flex-col rounded-[28px] bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {tela === "pergunta" && (
          <div className="text-center">
            <p className="font-[family-name:var(--font-manrope)] text-[22px] font-medium leading-tight">Já conferiu se está bonito?</p>
            <p className="mt-1.5 text-[14px] text-text-secondary">Uma olhada rápida no Catálogo e na página inicial antes de divulgar.</p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={() => ir("catalogo")} className="min-h-[50px] rounded-full bg-on-background text-[15px] font-semibold text-white">Conferir agora</button>
              <button type="button" onClick={compartilharAgora} className="min-h-[46px] rounded-full bg-[#F2F2EE] text-[14px] font-medium">Já conferi, compartilhar</button>
            </div>
          </div>
        )}

        {(tela === "catalogo" || tela === "home") && (
          <>
            <div className="flex items-center gap-2">
              <span className="rounded-full px-3 py-1 text-[12.5px] font-semibold text-white" style={{ backgroundColor: tela === "catalogo" ? "#8758BE" : "#1FA855" }}>{tela === "catalogo" ? "Catálogo" : "Página inicial"}</span>
              <span className="text-[12.5px] text-text-tertiary">{etapa} de 2</span>
              <button type="button" onClick={fechar} aria-label="Fechar" className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2EE] text-[14px]">✕</button>
            </div>
            <p className="mt-2 text-[17px] font-semibold">{tour ? (tela === "home" ? "Confira as bolinhas, as tags e o destaque" : "Confira os itens do catálogo") : "Está pronto para divulgar?"}</p>
            {/* Prévia de celular: a página como o cliente vê. */}
            <div className="relative mx-auto mt-3 min-h-0 w-full max-w-[300px] flex-1 overflow-hidden rounded-[24px] border-[4px] border-[#16171a] bg-white" style={{ height: "min(56dvh, 520px)" }}>
              <PreviaEscalada key={destino} src={destino} onLoad={() => setCarregando(false)} />
              {carregando && <div className="orbi-shimmer absolute inset-0 bg-[#F2F2EE]" aria-hidden />}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={editar} className="flex min-h-[50px] items-center justify-center rounded-full bg-[#F2F2EE] text-[15px] font-semibold">✎ Editar</a>
              <button type="button" onClick={() => ir(proxima)} className="min-h-[50px] rounded-full bg-[#1F9E4C] text-[15px] font-semibold text-white">✓ Está pronto</button>
            </div>
          </>
        )}

        {tela === "pronto" && (
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E9F8EF] text-[26px] text-[#1F9E4C]">✓</span>
            <p className="mt-3 font-[family-name:var(--font-manrope)] text-[22px] font-medium">Tudo pronto!</p>
            <button
              type="button"
              onClick={() => { gravar(kOk(slug), "1"); compartilharAgora(); }}
              className="mt-5 min-h-[50px] w-full rounded-full bg-[#1F9E4C] text-[15px] font-semibold text-white"
            >
              {tour ? "Continuar" : "Compartilhar meu link"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
