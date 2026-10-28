"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { GalleryUpload } from "@/components/ui/GalleryUpload";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";
import { useTravarRolagem } from "@/hooks/useTravarRolagem";

export type DiffCard = { icon?: string; title: string; description?: string };

export type SobreParte = "texto" | "diferenciais" | "fotos";

/**
 * Folha de edição que abre em cima da página Sobre, para o dono mudar o texto,
 * os diferenciais ou as fotos sem sair dali. Salva ao tocar em Salvar e a
 * página já mostra o resultado.
 */
export function SobreEditorSheet({
  parte,
  businessId,
  texto,
  cards,
  fotos,
  onSalvoTexto,
  onSalvoCards,
  onSalvoFotos,
  onFechar,
}: {
  parte: SobreParte;
  businessId: string;
  texto: string;
  cards: DiffCard[];
  fotos: string[];
  onSalvoTexto: (v: string) => void;
  onSalvoCards: (v: DiffCard[]) => void;
  onSalvoFotos: (v: string[]) => void;
  onFechar: () => void;
}) {
  useTravarRolagem();
  const supabase = createClient();
  const [t, setT] = useState(texto);
  const [lista, setLista] = useState<DiffCard[]>(cards.length > 0 ? cards : [{ title: "", description: "" }]);
  const [salvando, setSalvando] = useState(false);

  const titulo = parte === "texto" ? "Sobre nós" : parte === "diferenciais" ? "Diferenciais" : "Fotos da página";
  const ajuda =
    parte === "texto" ? "Conte quem vocês são em poucas linhas. Pule uma linha para começar um novo parágrafo."
    : parte === "diferenciais" ? "O que faz as pessoas escolherem vocês. Cada um vira um cartão."
    : "As fotos aparecem no topo desta página, em carrossel. Cada foto que você envia já salva na hora.";

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    let ok = true;
    if (parte === "texto") {
      ok = conferirSalvo(await supabase.from("businesses").update({ about_business: t.trim() || null }).eq("id", businessId));
      if (ok) onSalvoTexto(t.trim());
    } else if (parte === "diferenciais") {
      const limpos = lista.map((c) => ({ ...c, title: c.title.trim(), description: (c.description ?? "").trim() })).filter((c) => c.title);
      const plano = limpos.map((c) => (c.description ? `${c.title}: ${c.description}` : c.title)).join("\n");
      ok = conferirSalvo(await supabase.from("businesses").update({ differentials_cards: limpos, differentials: plano || null }).eq("id", businessId));
      if (ok) onSalvoCards(limpos);
    }
    setSalvando(false);
    if (ok) onFechar();
  }

  async function salvarFotos(urls: string[]) {
    onSalvoFotos(urls);
    conferirSalvo(await supabase.from("businesses").update({ story_photos: urls }).eq("id", businessId));
  }

  const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background";

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={`Editar ${titulo}`}>
      <button type="button" aria-label="Fechar" onClick={onFechar} className="veu-entra absolute inset-0 bg-black/40" />
      <div className="folha-sobe relative flex max-h-[90dvh] w-full max-w-[440px] flex-col rounded-t-[28px] bg-background-main">
        <div className="px-6 pb-2 pt-3">
          <span className="mx-auto mb-4 block h-1.5 w-11 rounded-full bg-on-background/15" aria-hidden />
          <h2 className="font-[family-name:var(--font-manrope)] text-[22px] font-semibold tracking-[-0.02em]">{titulo}</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">{ajuda}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4 pt-2">
          {parte === "texto" && (
            <textarea value={t} onChange={(e) => setT(e.target.value)} rows={10} placeholder="Ex: Há 10 anos servimos a melhor pizza da cidade…" className={`${campo} resize-none leading-relaxed`} />
          )}

          {parte === "diferenciais" && (
            <div className="flex flex-col gap-3">
              {lista.map((c, i) => (
                <div key={i} className="rounded-[20px] bg-surface-white p-3.5 ring-1 ring-black/[0.06]">
                  <input value={c.title} onChange={(e) => setLista((l) => l.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Título (ex: Entrega grátis)" maxLength={50} className={campo} />
                  <textarea value={c.description ?? ""} onChange={(e) => setLista((l) => l.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} placeholder="Explique em uma frase" rows={2} maxLength={160} className={`${campo} mt-2 resize-none text-[14px]`} />
                  <button type="button" onClick={() => setLista((l) => l.filter((_, j) => j !== i))} className="mt-1 min-h-[40px] px-1 text-[13px] text-red-600">Remover este</button>
                </div>
              ))}
              {lista.length < 8 && (
                <button type="button" onClick={() => setLista((l) => [...l, { title: "", description: "" }])} className="min-h-[48px] rounded-full border border-dashed border-divider text-[14px] font-medium">+ Adicionar diferencial</button>
              )}
            </div>
          )}

          {parte === "fotos" && (
            <GalleryUpload camada="z-[120]" value={fotos} businessId={businessId} lockedRatio="paisagem" lockedReason="As fotos são sempre no formato paisagem, para o carrossel ficar uniforme." onChange={salvarFotos} />
          )}
        </div>

        <div className="border-t border-divider px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          {parte === "fotos" ? (
            <button type="button" onClick={onFechar} className="min-h-[52px] w-full rounded-full bg-button-primary text-[15px] font-medium text-white">Concluir</button>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={onFechar} className="min-h-[52px] flex-1 rounded-full bg-surface-soft text-[15px] font-medium">Cancelar</button>
              <button type="button" onClick={salvar} disabled={salvando} className="min-h-[52px] flex-[1.4] rounded-full bg-button-primary text-[15px] font-medium text-white disabled:opacity-50">{salvando ? "Salvando…" : "Salvar"}</button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
