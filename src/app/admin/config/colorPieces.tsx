"use client";

import { ORBI_SPHERE_COLORS } from "@/lib/showcase";

/**
 * Peças usadas pelos dois painéis de cor (o da Orbi e o do fundo da
 * página). Antes viviam num painel só, que misturava identidade da IA
 * com identidade da página; agora são compartilhadas.
 */

export const DEFAULT_ORBI = ["#7FE84A", "#8B2BFF"];
// Mesmas cores que o degradê padrão da tela inicial sempre usou.
export const DEFAULT_HERO = ["#B7F34A", "#6EE7D8"];

/** Botão compacto de cor: bolinha grande em cima, rótulo curto embaixo.
 * A paleta inteira só aparece ao tocar, numa folha que sobe de baixo. */
export function ColorChip({ label, hex, onOpen, onRemove }: { label: string; hex: string | null; onOpen: () => void; onRemove?: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex flex-1 cursor-pointer flex-col items-center rounded-2xl bg-surface-soft px-2 py-2.5">
      <span
        className="h-8 w-8 rounded-full border border-divider shadow-sm"
        style={hex ? { backgroundColor: hex } : { background: "repeating-linear-gradient(45deg, #ddd, #ddd 3px, transparent 3px, transparent 6px)" }}
      />
      <span className="mt-1.5 text-center text-[11px] font-medium leading-tight">{label}</span>
      <span className="mt-1.5 rounded-full bg-surface-white px-2.5 py-0.5 text-[10.5px] font-semibold text-text-secondary shadow-sm">Alterar</span>
      {onRemove && (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="mt-1 text-[10px] text-text-tertiary underline"
        >
          remover
        </span>
      )}
    </button>
  );
}

export function ColorPickerSheet({
  current,
  onSelect,
  onClose,
  preview,
}: {
  current: string | null;
  onSelect: (hex: string) => void;
  onClose: () => void;
  preview?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div className="max-h-[80vh] overflow-y-auto rounded-t-[28px] bg-surface-white p-5" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-divider" aria-label="Fechar" />

        {/* Prévia ao vivo: muda na hora conforme a pessoa toca nas cores */}
        {preview && (
          <div className="mb-4 flex flex-col items-center">
            {preview}
            <p className="mt-1.5 text-[11.5px] text-text-tertiary">Prévia ao vivo</p>
          </div>
        )}

        <p className="text-center text-[13px] font-medium text-text-secondary">Toque numa cor pra ver na hora</p>
        <div className="mt-3 grid grid-cols-10 gap-1.5 pb-2">
          {ORBI_SPHERE_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => onSelect(c.hex)}
              aria-label={c.label}
              title={c.label}
              className={`aspect-square rounded-full border-2 transition-transform ${current?.toLowerCase() === c.hex.toLowerCase() ? "scale-110 border-on-background" : "border-transparent"}`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        <button onClick={onClose} className="mt-4 w-full rounded-full bg-button-primary py-3 text-[14px] font-semibold text-white">
          Concluir
        </button>
      </div>
    </div>
  );
}
