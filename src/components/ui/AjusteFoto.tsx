"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ZERO, exportarAjustada, temAjustes, type Ajustes } from "@/lib/foto-edicao";
import { PainelAjustes } from "./PainelAjustes";

/**
 * Ajuste de uma foto que já existe: luz, contraste, sombras, realces, cor,
 * calor, nitidez e vinheta. Roda no próprio aparelho, sem custo e sem esperar
 * a IA. Devolve a foto nova como arquivo.
 */
export function AjusteFoto({
  url, onAplicar, onFechar, onPular, camada = "z-[130]", redonda = false,
}: {
  url: string;
  onAplicar: (arquivo: File) => void;
  onFechar: () => void;
  /** Se vier, mostra "Usar sem ajustar" (seguir com a foto como está). */
  onPular?: () => void;
  camada?: string;
  redonda?: boolean;
}) {
  const [a, setA] = useState<Ajustes>(ZERO);
  const [aplicando, setAplicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setAplicando(true);
    setErro(null);
    try {
      const blob = await exportarAjustada(url, a, { max: 2400 });
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      onAplicar(new File([blob], `foto-ajustada.${ext}`, { type: blob.type }));
    } catch {
      setErro("Não consegui salvar a foto.");
    }
    setAplicando(false);
  }

  const mudou = temAjustes(a);

  return createPortal(
    <div className={`fixed inset-0 ${camada} flex items-end justify-center sm:items-center sm:p-6`} role="dialog" aria-modal="true" aria-label="Ajustar a foto">
      <button aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/45" />
      <div className="relative flex max-h-[94dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
          <p className="text-[15px] font-semibold">Ajustar a foto</p>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFEDE8] text-[14px]">✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <PainelAjustes url={url} ajustes={a} onAjustes={setA} redonda={redonda} />
          {erro && <p role="alert" className="mt-3 text-[12.5px] text-red-600">{erro}</p>}
        </div>
        <div className="border-t border-divider px-5 py-3.5">
          <button type="button" onClick={confirmar} disabled={!mudou || aplicando} className="min-h-[50px] w-full rounded-full bg-on-background text-[14.5px] font-semibold text-white disabled:opacity-40">
            {aplicando ? "Aplicando…" : onPular ? "Usar esta foto" : "Aplicar na foto"}
          </button>
          {onPular && (
            <button type="button" onClick={onPular} disabled={aplicando} className="mt-2 min-h-[44px] w-full rounded-full text-[13.5px] font-medium text-text-secondary">
              Usar sem ajustar
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
