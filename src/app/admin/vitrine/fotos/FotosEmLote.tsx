"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { COVER_RATIO_BY_SIZE, SIZE_LABEL, type BoxSize } from "@/lib/showcase";

type Linha = { id: string; title: string; categoria: string; temFoto: boolean; formato: BoxSize };

/** Formatos desenhados como miniatura (mesmo desenho do catálogo). */
const FORMA: Record<BoxSize, string> = { destaque: "h-5 w-10", largo: "h-3 w-10", medio: "h-6 w-6", alto: "h-9 w-5" };
const ORDEM: BoxSize[] = ["medio", "largo", "destaque", "alto"];

/** Lista os itens e deixa colocar a foto de cada um direto da galeria, um depois do outro. */
export function FotosEmLote({ businessId, itens }: { businessId: string; itens: Linha[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [encadear, setEncadear] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [formatos, setFormatos] = useState<Record<string, BoxSize>>({});
  const [formatoSel, setFormatoSel] = useState<BoxSize>("medio");
  const [salvando, setSalvando] = useState(false);
  const formatoDe = (i: Linha) => formatos[i.id] ?? i.formato;

  const pendentes = itens.filter((i) => !i.temFoto && !fotos[i.id]);
  const visiveis = mostrarTodos ? itens : itens.filter((i) => !i.temFoto || fotos[i.id]);
  const grupos = useMemo(() => {
    const m = new Map<string, Linha[]>();
    for (const i of visiveis) m.set(i.categoria, [...(m.get(i.categoria) ?? []), i]);
    return Array.from(m.entries());
  }, [visiveis]);

  // Foto escolhida (enviada, pronta, da galeria ou criada com IA), já no formato do card.
  async function salvarFoto(id: string, url: string) {
    setErro(null);
    setSalvando(true);
    const { error } = await supabase.from("content_items").update({ image_url: url, image_is_placeholder: false, box_style: "foto", layout_size: formatoSel }).eq("id", id);
    setSalvando(false);
    if (error) { setErro("Não consegui salvar essa foto. Tente de novo."); return; }
    setFotos((p) => ({ ...p, [id]: url }));
    setFormatos((p) => ({ ...p, [id]: formatoSel }));
    const proximo = encadear ? pendentes.find((i) => i.id !== id) : undefined;
    if (proximo) abrir(proximo.id);
    else { setAberto(null); setEncadear(false); }
  }

  function abrir(id: string) {
    const item = itens.find((i) => i.id === id);
    setFormatoSel(item ? formatoDe(item) : "medio");
    setAberto(id);
  }

  const atual = itens.find((i) => i.id === aberto);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] font-medium">{pendentes.length === 0 ? "Todos os itens têm foto." : `${pendentes.length} ${pendentes.length === 1 ? "item sem foto" : "itens sem foto"}`}</p>
        {pendentes.length > 0 && (
          <button
            type="button"
            onClick={() => { setEncadear(true); abrir(pendentes[0].id); }}
            className="min-h-[44px] rounded-full bg-button-primary px-5 text-[14px] font-semibold text-white active:scale-[0.97]"
          >
            Começar pelo primeiro
          </button>
        )}
      </div>
      {erro && <p role="alert" className="mt-3 text-[13px] font-medium text-red-600">{erro}</p>}

      {grupos.map(([cat, linhas]) => (
        <section key={cat} className="mt-6">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">{cat}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {linhas.map((i) => {
              const url = fotos[i.id];
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => { setEncadear(false); abrir(i.id); }}
                    className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl bg-white p-2.5 text-left ring-1 ring-black/[0.08] active:scale-[0.99]"
                  >
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-[18px] text-text-tertiary ${url ? "bg-[#F2F2EE]" : ""}`}>
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className={`flex items-center justify-center rounded-[4px] bg-on-background/15 text-[12px] text-on-background/60 ${FORMA[formatoDe(i)]}`}>{i.temFoto ? "✓" : "+"}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{i.title}</span>
                      <span className="block text-[12px] text-text-tertiary">{SIZE_LABEL[formatoDe(i)]}</span>
                    </span>
                    <span className="shrink-0 text-[12.5px] text-text-tertiary">{url ? "Foto salva" : i.temFoto ? "Tem foto" : "Escolher foto"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <button type="button" onClick={() => setMostrarTodos((v) => !v)} className="mt-6 min-h-[44px] rounded-full border border-divider px-5 text-[13.5px] font-medium text-text-secondary">
        {mostrarTodos ? "Mostrar só os sem foto" : "Mostrar todos os itens"}
      </button>

      {aberto && atual && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40" onClick={() => { setAberto(null); setEncadear(false); }}>
          <div className="max-h-[92vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-[#EFEFEA] p-4 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-1">
              <div className="min-w-0">
                <p className="truncate text-[18px] font-semibold leading-tight">{atual.title}</p>
                <p className="mt-0.5 text-[12.5px] text-text-secondary">{encadear && pendentes.length > 1 ? `Faltam ${pendentes.length} sem foto` : "Foto do card"}</p>
              </div>
              <button type="button" onClick={() => { setAberto(null); setEncadear(false); }} aria-label="Fechar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[14px]">✕</button>
            </div>

            {/* Formato do card: a foto já sai recortada nele. */}
            <div className="mt-3 rounded-[22px] bg-white p-3 ring-1 ring-black/[0.06]">
              <p className="px-1 text-[12.5px] font-medium text-text-tertiary">Formato do card</p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {ORDEM.map((f) => (
                  <button key={f} type="button" onClick={() => setFormatoSel(f)} aria-pressed={formatoSel === f} className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${formatoSel === f ? "bg-on-background text-white" : "bg-[#F2F2EE] text-text-secondary"}`}>
                    <span className="flex h-9 items-center"><span className={`rounded-[3px] bg-current ${FORMA[f]}`} /></span>
                    <span className="text-[11px] font-medium">{SIZE_LABEL[f]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Todas as formas de ter a foto: enviar, foto pronta, galeria ou criar com IA. */}
            <div className="mt-3 rounded-[22px] bg-white p-4 ring-1 ring-black/[0.06]">
              <ImageUpload
                key={`${atual.id}-${formatoSel}`}
                value={fotos[atual.id] ?? null}
                businessId={businessId}
                lockedRatio={COVER_RATIO_BY_SIZE[formatoSel]}
                lockedReason="A foto segue o formato do card escolhido acima."
                promptSubject={atual.title}
                onChange={(url) => { if (url) void salvarFoto(atual.id, url); }}
              />
              {salvando && <p className="mt-2 text-center text-[12.5px] text-text-tertiary">Salvando…</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
