"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MinhaGaleriaPicker } from "@/components/ui/MinhaGaleriaPicker";

type Linha = { id: string; title: string; categoria: string; temFoto: boolean };

/** Lista os itens e deixa colocar a foto de cada um direto da galeria, um depois do outro. */
export function FotosEmLote({ businessId, itens }: { businessId: string; itens: Linha[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [encadear, setEncadear] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const pendentes = itens.filter((i) => !i.temFoto && !fotos[i.id]);
  const visiveis = mostrarTodos ? itens : itens.filter((i) => !i.temFoto || fotos[i.id]);
  const grupos = useMemo(() => {
    const m = new Map<string, Linha[]>();
    for (const i of visiveis) m.set(i.categoria, [...(m.get(i.categoria) ?? []), i]);
    return Array.from(m.entries());
  }, [visiveis]);

  async function escolher(url: string) {
    const id = aberto;
    if (!id) return;
    setErro(null);
    const { error } = await supabase.from("content_items").update({ image_url: url, image_is_placeholder: false, box_style: "foto" }).eq("id", id);
    if (error) {
      setErro("Não consegui salvar essa foto. Tente de novo.");
      setAberto(null);
      return;
    }
    setFotos((p) => ({ ...p, [id]: url }));
    const proximo = encadear ? pendentes.find((i) => i.id !== id) : undefined;
    setAberto(proximo ? proximo.id : null);
  }

  const atual = itens.find((i) => i.id === aberto);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] font-medium">{pendentes.length === 0 ? "Todos os itens têm foto." : `${pendentes.length} ${pendentes.length === 1 ? "item sem foto" : "itens sem foto"}`}</p>
        {pendentes.length > 0 && (
          <button
            type="button"
            onClick={() => { setEncadear(true); setAberto(pendentes[0].id); }}
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
                    onClick={() => { setEncadear(false); setAberto(i.id); }}
                    className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-divider bg-surface-white p-2.5 text-left active:scale-[0.99]"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-soft text-[18px] text-text-tertiary">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      ) : i.temFoto ? "✓" : "+"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{i.title}</span>
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
        <MinhaGaleriaPicker
          businessId={businessId}
          atual={fotos[aberto] ?? null}
          onEscolher={escolher}
          onFechar={() => { setAberto(null); setEncadear(false); }}
        />
      )}
    </div>
  );
}
