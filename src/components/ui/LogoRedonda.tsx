"use client";

import { useEffect, useState } from "react";
import { fundoDosPixels } from "@/lib/logoFundo";

const cache = new Map<string, string | null>();

/**
 * Cor de fundo do logo (#rrggbb) ou null se ele não tem fundo próprio. Primeiro lê pelo
 * navegador; se a imagem não deixar (CORS), pergunta ao servidor. Guarda o resultado para
 * não refazer a conta a cada bolinha.
 */
export function useFundoLogo(src: string | null | undefined): string | null {
  const [lido, setLido] = useState<{ src: string; cor: string | null } | null>(null);
  useEffect(() => {
    if (!src || cache.has(src)) return;
    let vivo = true;
    const fim = (c: string | null) => { cache.set(src, c); if (vivo) setLido({ src, cor: c }); };
    const viaServidor = () =>
      fetch(`/api/logo-fundo?u=${encodeURIComponent(src)}`)
        .then((r) => r.json())
        .then((j: { cor?: string | null }) => fim(j.cor ?? null))
        .catch(() => fim(null));
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      try {
        const n = 48;
        const c = document.createElement("canvas");
        c.width = n; c.height = n;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return void viaServidor();
        g.drawImage(im, 0, 0, n, n);
        fim(fundoDosPixels(g.getImageData(0, 0, n, n).data, n, n));
      } catch {
        void viaServidor();
      }
    };
    im.onerror = () => void viaServidor();
    im.src = src;
    return () => { vivo = false; };
  }, [src]);
  if (!src) return null;
  if (cache.has(src)) return cache.get(src)!;
  return lido?.src === src ? lido.cor : null;
}

/**
 * Logo dentro de um círculo. Se o logo é um quadrado com cor de fundo, o círculo todo é
 * pintado com essa cor (o quadrado some, sem cortar o desenho do logo).
 * Sem fundo próprio (logo transparente), mantém o branco com uma margem.
 * Quem usa dá o tamanho e o formato por className (ex.: "h-9 w-9").
 */
export function LogoRedonda({ src, className = "", margem = "p-1" }: { src: string; className?: string; margem?: string }) {
  const fundo = useFundoLogo(src);
  return (
    <span className={`relative block flex-none overflow-hidden rounded-full ring-1 ring-divider ${className}`} style={{ backgroundColor: fundo ?? "#FFFFFF" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} className={`h-full w-full object-contain ${fundo ? "p-[8%]" : margem}`} />
    </span>
  );
}
