"use client";

import { useEffect, useRef, useState } from "react";
import {
  GRUPOS, PREDEFINIDOS, ZERO, aplicarAjustes, carregarImagem, desenharEmEscala, temAjustes,
  type Ajustes, type GrupoAjuste,
} from "@/lib/foto-edicao";

const PREVIA_MAX = 720;

/**
 * Editor de foto reutilizável: prévia ao vivo + abas Luz, Cor e Detalhe.
 * Quem usa guarda os ajustes e, ao concluir, chama exportarAjustada().
 * Segurar "Comparar" mostra a foto original.
 */
export function PainelAjustes({
  url, ajustes, onAjustes, redonda = false,
}: {
  url: string;
  ajustes: Ajustes;
  onAjustes: (a: Ajustes) => void;
  redonda?: boolean;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [grupo, setGrupo] = useState<GrupoAjuste>("luz");
  const [comparando, setComparando] = useState(false);
  const tela = useRef<HTMLCanvasElement>(null);
  const base = useRef<ImageData | null>(null);
  const quadro = useRef<number | null>(null);

  useEffect(() => {
    let vivo = true;
    carregarImagem(url)
      .then((el) => { if (vivo) setImg(el); })
      .catch(() => { if (vivo) setErro("Não consegui abrir essa foto."); });
    return () => { vivo = false; };
  }, [url]);

  // Guarda a foto original reduzida (a prévia é calculada em cima dela).
  useEffect(() => {
    if (!img || !tela.current) return;
    const origem = desenharEmEscala(img, PREVIA_MAX);
    base.current = origem.getContext("2d")!.getImageData(0, 0, origem.width, origem.height);
    tela.current.width = origem.width;
    tela.current.height = origem.height;
    tela.current.getContext("2d")!.putImageData(base.current, 0, 0);
  }, [img]);

  // Redesenha a prévia sem travar o dedo: no máximo uma vez por quadro.
  useEffect(() => {
    const cv = tela.current;
    if (!img || !cv) return;
    if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(() => {
      quadro.current = null;
      const original = base.current;
      if (!original) return;
      const copia = new ImageData(new Uint8ClampedArray(original.data), original.width, original.height);
      if (!comparando) aplicarAjustes(copia, ajustes);
      cv.getContext("2d")!.putImageData(copia, 0, 0);
    });
    return () => { if (quadro.current !== null) { cancelAnimationFrame(quadro.current); quadro.current = null; } };
  }, [ajustes, comparando, img]);

  const mudou = temAjustes(ajustes);
  const grupoAtual = GRUPOS.find((g) => g.id === grupo)!;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex justify-center rounded-2xl bg-[#EFEDE8] p-2">
        {img ? (
          <canvas ref={tela} className={`max-h-[280px] w-auto max-w-full ${redonda ? "rounded-full" : "rounded-xl"}`} />
        ) : (
          <p className="py-16 text-[13px] text-text-secondary">{erro ?? "Abrindo a foto…"}</p>
        )}
        {img && (
          <button
            type="button"
            aria-label="Segure para ver a foto original"
            onPointerDown={() => setComparando(true)}
            onPointerUp={() => setComparando(false)}
            onPointerLeave={() => setComparando(false)}
            onPointerCancel={() => setComparando(false)}
            onContextMenu={(e) => e.preventDefault()}
            className={`absolute bottom-3 right-3 min-h-[36px] select-none rounded-full px-3.5 text-[12.5px] font-semibold shadow-sm ${comparando ? "bg-[#111318] text-white" : "bg-white text-[#111318]"}`}
            style={{ touchAction: "none", WebkitTouchCallout: "none" }}
          >
            {comparando ? "Original" : "Segurar para comparar"}
          </button>
        )}
      </div>

      {img && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Ajustes rápidos">
            {PREDEFINIDOS.map((p) => (
              <button
                key={p.rotulo}
                type="button"
                onClick={() => onAjustes({ ...ZERO, ...p.valores })}
                className="min-h-[40px] shrink-0 rounded-full bg-[#EFEDE8] px-4 text-[13px] font-medium"
              >
                {p.rotulo}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onAjustes(ZERO)}
              disabled={!mudou}
              className="min-h-[40px] shrink-0 rounded-full px-3 text-[13px] text-text-tertiary disabled:opacity-40"
            >
              Desfazer tudo
            </button>
          </div>

          <div className="flex gap-1 rounded-full bg-[#EFEDE8] p-1" role="tablist" aria-label="Tipo de ajuste">
            {GRUPOS.map((g) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={grupo === g.id}
                onClick={() => setGrupo(g.id)}
                className={`min-h-[38px] flex-1 rounded-full text-[13px] font-semibold ${grupo === g.id ? "bg-white text-[#111318] shadow-sm" : "text-text-secondary"}`}
              >
                {g.rotulo}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {grupoAtual.controles.map((c) => {
              const v = ajustes[c.chave];
              return (
                <div key={c.chave}>
                  <div className="flex items-center justify-between text-[13px] font-medium">
                    <label htmlFor={`aj-${c.chave}`}>{c.rotulo}</label>
                    <button
                      type="button"
                      onClick={() => onAjustes({ ...ajustes, [c.chave]: 0 })}
                      disabled={v === 0}
                      aria-label={`Zerar ${c.rotulo}`}
                      className="min-h-[32px] min-w-[44px] rounded-full px-2 text-right tabular-nums text-text-tertiary disabled:opacity-60"
                    >
                      {v > 0 ? `+${v}` : v}
                    </button>
                  </div>
                  <input
                    id={`aj-${c.chave}`}
                    type="range"
                    min={c.min}
                    max={c.max}
                    step={1}
                    value={v}
                    onChange={(e) => onAjustes({ ...ajustes, [c.chave]: Number(e.target.value) })}
                    className="mt-0.5 h-8 w-full accent-[#111318]"
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
      {erro && img && <p role="alert" className="text-[12.5px] text-red-600">{erro}</p>}
    </div>
  );
}
