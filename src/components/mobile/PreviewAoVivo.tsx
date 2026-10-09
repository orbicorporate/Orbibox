"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { aoSalvar } from "@/components/ui/AvisoSalvar";
import { PreviewVisitante } from "./PreviewVisitante";

/**
 * Celular pequeno no canto da tela de edição mostrando a página de verdade.
 * Cada vez que algo é salvo, ele recarrega e mostra a mudança, então a
 * pessoa aprende vendo: mexeu aqui, mudou lá. Dá pra recolher, e a escolha
 * fica lembrada neste aparelho.
 */
const CHAVE = "orbi_preview_ao_vivo";
const L = 390; // largura do celular "de verdade" dentro do iframe
const ESCALA = 0.36;

function lerAberto(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== "0";
  } catch {
    return true;
  }
}

export function PreviewAoVivo({ slug, tab }: { slug: string; tab?: "vitrine" | "conhecer" }) {
  const aberto0 = useSyncExternalStore(() => () => {}, lerAberto, () => false);
  const [escolha, setEscolha] = useState<boolean | null>(null);
  const aberto = escolha ?? aberto0;
  const [versao, setVersao] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [atualizado, setAtualizado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () =>
      aoSalvar(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          setCarregando(true);
          setVersao((v) => v + 1);
        }, 700);
      }),
    [],
  );

  function alternar(v: boolean) {
    setEscolha(v);
    try {
      localStorage.setItem(CHAVE, v ? "1" : "0");
    } catch {}
  }

  const destino = `/${slug}?preview=1${tab ? `&tab=${tab}` : ""}`;
  const altura = 760;

  if (!aberto) {
    return (
      <button
        type="button"
        data-guia="previa"
        onClick={() => alternar(true)}
        className="fixed bottom-28 left-4 z-30 flex items-center gap-2 rounded-full bg-on-background px-3.5 py-2.5 text-[12.5px] font-medium text-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <rect x="6" y="2.5" width="12" height="19" rx="3" />
          <path d="M11 18.5h2" />
        </svg>
        Prévia ao vivo
      </button>
    );
  }

  return (
    <div className="fixed bottom-28 left-3 z-30 flex flex-col items-start gap-1.5">
      <div
        data-guia="previa"
        className="relative overflow-hidden rounded-[22px] border-[4px] border-[#16171a] bg-background-main shadow-[0_18px_40px_-14px_rgba(0,0,0,0.55)]"
        style={{ width: L * ESCALA + 8, height: altura * ESCALA + 8 }}
      >
        <iframe
          key={versao}
          src={destino}
          title="Prévia ao vivo da sua página"
          onLoad={() => {
            setCarregando(false);
            if (versao > 0) {
              setAtualizado(true);
              setTimeout(() => setAtualizado(false), 1600);
            }
          }}
          className="pointer-events-none origin-top-left border-0"
          style={{ width: L, height: altura, transform: `scale(${ESCALA})` }}
          tabIndex={-1}
          aria-hidden
        />
        {carregando && <div className="orbi-shimmer absolute inset-0 bg-surface-soft/70" aria-hidden />}
        {atualizado && (
          <span className="absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-on-background px-2.5 py-1 text-[10.5px] font-medium text-white">
            Atualizado ✓
          </span>
        )}
        {/* Toque no celzinho abre a prévia grande, navegável. */}
        <PreviewVisitante slug={slug} tab={tab} soIcone className="absolute inset-0 cursor-zoom-in opacity-0" />
      </div>
      <button
        type="button"
        onClick={() => alternar(false)}
        className="rounded-full bg-surface-white/90 px-2.5 py-1 text-[11px] font-medium text-text-secondary shadow-sm backdrop-blur"
      >
        Recolher prévia
      </button>
    </div>
  );
}
