"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type Item = { nome: string; url: string };

/**
 * Folha com todas as imagens que já foram enviadas para este negócio, em
 * miniaturas pequenas. A pessoa toca numa e ela é usada na hora, sem enviar de novo.
 */
export function MinhaGaleriaPicker({
  businessId,
  atual,
  onEscolher,
  onFechar,
}: {
  businessId: string;
  atual?: string | null;
  onEscolher: (url: string) => void;
  onFechar: () => void;
}) {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [quebradas, setQuebradas] = useState<Set<string>>(new Set());

  useEffect(() => {
    let vivo = true;
    const supabase = createClient();
    supabase.storage
      .from("box-images")
      .list(businessId, { limit: 300, sortBy: { column: "created_at", order: "desc" } })
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) {
          setErro("Não consegui abrir sua galeria agora.");
          setItens([]);
          return;
        }
        const imagens = (data ?? [])
          .filter((o) => o.name && /\.(jpe?g|png|webp|gif|avif)$/i.test(o.name))
          .map((o) => ({ nome: o.name, url: supabase.storage.from("box-images").getPublicUrl(`${businessId}/${o.name}`).data.publicUrl }));
        setItens(imagens);
      });
    return () => {
      vivo = false;
    };
  }, [businessId]);

  const visiveis = (itens ?? []).filter((i) => !quebradas.has(i.nome));

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center" onClick={onFechar}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-[28px] bg-surface-white sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 px-5 pt-5">
          <div>
            <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold">Minha galeria</p>
            <p className="text-[12.5px] text-text-tertiary">Todas as imagens que você já enviou. Toque numa pra usar.</p>
          </div>
          <button onClick={onFechar} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[14px]" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          {itens === null && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="aspect-square animate-pulse rounded-xl bg-surface-soft" />
              ))}
            </div>
          )}
          {erro && <p className="text-[13px] text-red-600">{erro}</p>}
          {itens && !erro && visiveis.length === 0 && (
            <div className="rounded-[20px] border border-dashed border-divider p-6 text-center">
              <p className="text-[14px] font-medium">Sua galeria está vazia</p>
              <p className="mt-1 text-[13px] text-text-tertiary">As fotos que você enviar aparecem aqui para usar de novo.</p>
            </div>
          )}
          {visiveis.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {visiveis.map((i) => {
                const emUso = atual === i.url;
                return (
                  <button
                    key={i.nome}
                    type="button"
                    onClick={() => onEscolher(i.url)}
                    aria-label="Usar esta imagem"
                    className={`relative aspect-square overflow-hidden rounded-xl bg-surface-soft transition-transform active:scale-[0.96] ${emUso ? "ring-2 ring-on-background" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={i.url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={() => setQuebradas((p) => new Set(p).add(i.nome))}
                    />
                    {emUso && <span className="absolute right-1 top-1 rounded-full bg-on-background px-1.5 py-0.5 text-[10px] font-semibold text-white">em uso</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
