"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";

type Destaque = { t: string; id: string; p?: number; logo?: string | null };

/**
 * Imagem da bolinha deste item na Home (só aparece quando o item virou bolinha).
 * Fica guardada junto da lista de destaques da Home, no campo `logo` da bolinha.
 */
export function IconeBolinha({ businessId, itemId, fotoItem, logoMarca, inicial }: { businessId: string; itemId: string; fotoItem: string | null; logoMarca: string | null; inicial: string | null }) {
  const supabase = createClient();
  const [atual, setAtual] = useState<string | null>(inicial);
  const [enviar, setEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function escolher(url: string | null) {
    setErro(null);
    setSalvando(true);
    const { data } = await supabase.from("businesses").select("home_destaques").eq("id", businessId).maybeSingle();
    const lista = (Array.isArray(data?.home_destaques) ? data!.home_destaques : []) as Destaque[];
    const nova = lista.map((d) => (d.t === "item_bolinha" && d.id === itemId ? { ...d, logo: url } : d));
    const { error } = await supabase.from("businesses").update({ home_destaques: nova as never }).eq("id", businessId);
    setSalvando(false);
    if (error) { setErro("Não consegui salvar. Tente de novo."); return; }
    setAtual(url);
  }

  const opcoes = [
    { url: null as string | null, img: fotoItem, nome: "Foto do item" },
    ...(logoMarca ? [{ url: logoMarca as string | null, img: logoMarca, nome: "Logo da marca" }] : []),
  ];
  const ehPersonalizada = atual !== null && atual !== logoMarca;

  return (
    <div className="mt-5">
      <p className="text-[13px] font-semibold text-text-secondary">Ícone da bolinha <span className="font-normal text-text-tertiary">(como aparece na Home)</span></p>
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        {opcoes.map((o) => {
          const ativa = o.url === null ? atual === null : atual === o.url;
          return (
            <button
              key={o.nome}
              type="button"
              aria-pressed={ativa}
              disabled={salvando}
              onClick={() => void escolher(o.url)}
              className={`flex flex-col items-center gap-1 rounded-2xl p-1.5 text-[12px] text-text-secondary disabled:opacity-60 ${ativa ? "bg-surface-soft ring-2 ring-on-background" : ""}`}
            >
              <span className="h-14 w-14 overflow-hidden rounded-full bg-surface-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {o.img && <img src={o.img} alt="" className="h-full w-full object-cover" />}
              </span>
              {o.nome}
            </button>
          );
        })}
        {ehPersonalizada && (
          <span aria-pressed className="flex flex-col items-center gap-1 rounded-2xl bg-surface-soft p-1.5 text-[12px] text-text-secondary ring-2 ring-on-background">
            <span className="h-14 w-14 overflow-hidden rounded-full bg-surface-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={atual!} alt="" className="h-full w-full object-cover" />
            </span>
            Enviada
          </span>
        )}
        <button
          type="button"
          onClick={() => setEnviar((v) => !v)}
          aria-expanded={enviar}
          className="flex flex-col items-center gap-1 rounded-2xl p-1.5 text-[12px] text-text-secondary"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-on-background/35 text-[22px]">+</span>
          Enviar outra
        </button>
      </div>
      {enviar && (
        <div className="mt-2 rounded-2xl border border-divider p-3">
          <ImageUpload
            value={null}
            businessId={businessId}
            lockedRatio="quadrado"
            promptKind="avatar"
            onChange={(url) => { if (!url) return; void escolher(url); setEnviar(false); }}
          />
        </div>
      )}
      {erro && <p role="alert" className="mt-1.5 px-1 text-[13px] text-red-600">{erro}</p>}
    </div>
  );
}
