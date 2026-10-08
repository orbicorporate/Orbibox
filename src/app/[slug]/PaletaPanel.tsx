"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { PALETAS_PRONTAS, coresDoLogo, distribuirCores } from "@/lib/paletasNobres";

type Escolha = { id: string; nome: string; cores: string[] };

/**
 * Painel de paletas da página: cada toque pinta os cards na hora (prévia ao
 * vivo, o painel fica embaixo pra página continuar visível) e só vale
 * quando o dono toca em "Aplicar". Cancelar devolve as cores de antes.
 */
export function PaletaPanel({
  chaves,
  originais,
  coresMarca,
  logoUrl,
  onPreview,
  onApply,
  onClose,
}: {
  chaves: string[];
  originais: Record<string, string | null>;
  coresMarca: string[];
  logoUrl: string | null;
  onPreview: (cores: Record<string, string | null>) => void;
  onApply: (cores: Record<string, string>) => Promise<void> | void;
  onClose: () => void;
}) {
  const [escolhida, setEscolhida] = useState<Escolha | null>(null);
  const [deslocamento, setDeslocamento] = useState(0);
  const [doLogo, setDoLogo] = useState<string[] | null>(null);
  const [lendoLogo, setLendoLogo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function prever(p: Escolha, desl: number) {
    setEscolhida(p);
    setDeslocamento(desl);
    onPreview(distribuirCores(chaves, p.cores, desl));
  }

  async function lerLogo() {
    if (!logoUrl || lendoLogo) return;
    setLendoLogo(true);
    setErro(null);
    try {
      const cores = await coresDoLogo(logoUrl);
      if (cores.length < 2) { setErro("O logo tem poucas cores pra montar uma paleta."); return; }
      setDoLogo(cores);
      prever({ id: "logo", nome: "Cores do seu logo", cores }, 0);
    } catch {
      setErro("Não consegui ler as cores do logo.");
    } finally {
      setLendoLogo(false);
    }
  }

  function cancelar() {
    onPreview(originais);
    onClose();
  }

  async function aplicar() {
    if (!escolhida || salvando) return;
    setSalvando(true);
    await onApply(distribuirCores(chaves, escolhida.cores, deslocamento));
    setSalvando(false);
    onClose();
  }

  const marca: Escolha | null = coresMarca.length >= 2 ? { id: "marca", nome: "Cores da sua marca", cores: coresMarca } : null;
  const logo: Escolha | null = doLogo ? { id: "logo", nome: "Cores do seu logo", cores: doLogo } : null;

  const linha = (p: Escolha, descricao: string, destaque = false) => {
    const ativa = escolhida?.id === p.id;
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => prever(p, 0)}
        className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${ativa ? "border-on-background bg-surface-soft" : "border-divider"}`}
      >
        <span className="flex shrink-0 -space-x-1.5">
          {p.cores.slice(0, 5).map((c, i) => (
            <span key={`${c}-${i}`} className="h-7 w-7 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(17,19,24,0.1)]" style={{ backgroundColor: c }} />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium">{destaque && <span className="mr-1">✦</span>}{p.nome}</span>
          <span className="block truncate text-[12px] text-text-tertiary">{descricao}</span>
        </span>
        {ativa && <span className="shrink-0 text-[14px]">✓</span>}
      </button>
    );
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[85] mx-auto flex max-h-[54vh] w-full max-w-[440px] flex-col rounded-t-[28px] bg-surface-white shadow-[0_-12px_40px_rgba(17,19,24,0.22)]">
      <div className="px-5 pb-2 pt-4">
        <span className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-divider" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-manrope)] text-[17px] font-medium">Paleta da página</p>
            <p className="text-[12px] text-text-tertiary">Toque numa paleta e veja a página mudar na hora.</p>
          </div>
          <button type="button" onClick={cancelar} aria-label="Cancelar" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[13px] text-text-secondary">✕</button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-5 pb-3">
        <p className="mt-1 text-[11.5px] font-medium uppercase tracking-wide text-text-tertiary">Da sua marca</p>
        {marca && linha(marca, "Montada com as cores da sua marca", true)}
        {logo && linha(logo, "Tiradas do seu logo agora", true)}
        {!logo && logoUrl && (
          <button type="button" onClick={lerLogo} disabled={lendoLogo} className="flex w-full items-center justify-between rounded-2xl border border-dashed border-divider px-3.5 py-3 text-left text-[13.5px] disabled:opacity-60">
            <span><span className="mr-1">✦</span>{lendoLogo ? "Lendo seu logo…" : marca ? "Tirar as cores do logo agora" : "Montar paleta a partir do logo"}</span>
            <span className="text-text-tertiary">→</span>
          </button>
        )}
        {!marca && !logoUrl && <p className="rounded-2xl bg-surface-soft px-3.5 py-3 text-[12.5px] text-text-secondary">Envie o logo da sua marca pra a Orbi montar uma paleta com as cores dele.</p>}
        {erro && <p role="alert" className="text-[12.5px] text-red-600">{erro}</p>}

        <p className="mt-2 text-[11.5px] font-medium uppercase tracking-wide text-text-tertiary">Paletas prontas</p>
        {PALETAS_PRONTAS.map((p) => linha(p, p.descricao))}
      </div>

      <div className="flex items-center gap-2 border-t border-divider px-5 pb-6 pt-3">
        <button
          type="button"
          onClick={() => escolhida && prever(escolhida, deslocamento + 1)}
          disabled={!escolhida}
          className="shrink-0 rounded-full bg-surface-soft px-4 py-3 text-[13.5px] font-medium disabled:opacity-40"
        >
          Misturar
        </button>
        <button type="button" onClick={aplicar} disabled={!escolhida || salvando} className="flex-1 rounded-full bg-button-primary py-3 text-[14px] font-medium text-white disabled:opacity-40">
          {salvando ? "Aplicando…" : "Aplicar paleta"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
