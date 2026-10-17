"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TIPOS_IMAGEM, classificarImagens, clienteBanco, enviarImagem, sincronizarBiblioteca, urlDaImagem, type Categoria, type TipoImagem } from "@/lib/bancoImagens";

type Item = { id: string; nome: string; url: string; category_id: string | null; auto_tipo: TipoImagem | null };

/**
 * Folha com todas as imagens do banco de imagens da marca, em miniaturas
 * pequenas e com o filtro por categoria que a própria pessoa criou. A pessoa
 * toca numa e ela é usada na hora, sem enviar de novo.
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
  const supabase = useMemo(() => clienteBanco(), []);
  const [itens, setItens] = useState<Item[] | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filtro, setFiltro] = useState<string>("todas");
  const [tipo, setTipo] = useState<"todos" | TipoImagem>("todos");
  const [erro, setErro] = useState<string | null>(null);
  const [organizando, setOrganizando] = useState(false);
  const [quebradas, setQuebradas] = useState<Set<string>>(new Set());
  const arquivo = useRef<HTMLInputElement>(null);
  const [subindo, setSubindo] = useState(0);

  async function subir(files: FileList | null) {
    const lista = Array.from(files ?? []).slice(0, 20);
    if (lista.length === 0) return;
    setErro(null);
    setSubindo(lista.length);
    for (const f of lista) {
      try {
        const nova = await enviarImagem(supabase, businessId, f, null);
        setItens((p) => [{ id: nova.id, nome: nova.path, url: nova.url, category_id: nova.category_id, auto_tipo: nova.auto_tipo }, ...(p ?? [])]);
      } catch {
        setErro("Algumas fotos não subiram. Tente de novo.");
      }
      setSubindo((n) => n - 1);
    }
    if (arquivo.current) arquivo.current.value = "";
  }

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await sincronizarBiblioteca(supabase, businessId);
        const [{ data: cats }, { data: imgs, error }] = await Promise.all([
          supabase.from("image_categories").select("id, name, position").eq("business_id", businessId).order("position"),
          supabase.from("image_library").select("id, path, category_id, auto_tipo").eq("business_id", businessId).order("created_at", { ascending: false }).limit(1000),
        ]);
        if (!vivo) return;
        if (error) throw error;
        setCategorias((cats as Categoria[]) ?? []);
        const lista = ((imgs as { id: string; path: string; category_id: string | null; auto_tipo: TipoImagem | null }[]) ?? []).map((o) => ({ id: o.id, nome: o.path, category_id: o.category_id, auto_tipo: o.auto_tipo, url: urlDaImagem(supabase, o.path) }));
        setItens(lista);
        // As fotos sem tipo são classificadas aqui mesmo, em lotes, sem precisar abrir o Banco de imagens.
        const pendentes = lista.filter((i) => !i.auto_tipo).map((i) => i.id);
        if (pendentes.length > 0) {
          setOrganizando(true);
          for (let n = 0; n < pendentes.length && vivo; n += 8) {
            const res = await classificarImagens(businessId, pendentes.slice(n, n + 8));
            if (Object.keys(res).length === 0) break;
            if (vivo) setItens((p) => (p ?? []).map((i) => (res[i.id] ? { ...i, auto_tipo: res[i.id] } : i)));
          }
          if (vivo) setOrganizando(false);
        }
      } catch {
        if (!vivo) return;
        setErro("Não consegui abrir sua galeria agora.");
        setItens([]);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [supabase, businessId]);

  const visiveis = (itens ?? []).filter((i) => !quebradas.has(i.nome) && (filtro === "todas" ? true : filtro === "sem" ? !i.category_id : i.category_id === filtro) && (tipo === "todos" ? true : i.auto_tipo === tipo));
  const temTipos = (itens ?? []).some((i) => i.auto_tipo) || organizando;
  const contagemTipo = (t: TipoImagem) => (itens ?? []).filter((i) => i.auto_tipo === t).length;
  const temSem = (itens ?? []).some((i) => !i.category_id);
  const chip = (ativo: boolean) => `shrink-0 min-h-[36px] rounded-full px-3.5 text-[13px] font-medium ${ativo ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center" onClick={onFechar}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-[28px] bg-surface-white sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-2 px-5 pt-5">
          <div>
            <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold">Minha galeria</p>
            <p className="text-[12.5px] text-text-tertiary">Seu banco de imagens. Toque numa pra usar.</p>
          </div>
          <button onClick={onFechar} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[14px]" aria-label="Fechar">
            ✕
          </button>
        </div>

        {categorias.length > 0 && (
          <div className="no-scrollbar mt-3 flex shrink-0 gap-2 overflow-x-auto px-5 py-0.5">
            <button type="button" onClick={() => setFiltro("todas")} className={chip(filtro === "todas")}>Todas</button>
            {categorias.map((c) => (
              <button key={c.id} type="button" onClick={() => setFiltro(c.id)} className={chip(filtro === c.id)}>{c.name}</button>
            ))}
            {temSem && <button type="button" onClick={() => setFiltro("sem")} className={chip(filtro === "sem")}>Sem categoria</button>}
          </div>
        )}

        {temTipos && (
          <>
          <div className="no-scrollbar mt-2 flex shrink-0 gap-2 overflow-x-auto px-5 py-0.5">
            <button type="button" onClick={() => setTipo("todos")} className={chip(tipo === "todos")}>Todos os tipos</button>
            {TIPOS_IMAGEM.map((t) => (
              <button key={t.id} type="button" onClick={() => setTipo(t.id)} className={chip(tipo === t.id)}>{t.nome} {contagemTipo(t.id)}</button>
            ))}
          </div>
          {organizando && <p className="mt-1.5 px-5 text-[12px] text-text-tertiary">Organizando suas fotos por tipo…</p>}
          </>
        )}

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          {itens === null && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="aspect-square animate-pulse rounded-xl bg-surface-soft" />
              ))}
            </div>
          )}
          {erro && <p className="text-[13px] text-red-600">{erro}</p>}
          {itens && !erro && visiveis.length === 0 && subindo === 0 && (
            <div className="rounded-[20px] border border-dashed border-divider p-6 text-center">
              <p className="text-[14px] font-medium">Sua galeria está vazia</p>
              <p className="mt-1 text-[13px] text-text-tertiary">{filtro === "todas" ? "As fotos que você enviar aparecem aqui para usar de novo." : "Nenhuma foto nesta categoria ainda."}</p>
            </div>
          )}
          <input ref={arquivo} type="file" accept="image/*" multiple className="hidden" onChange={(e) => subir(e.target.files)} />
          {itens && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              <button
                type="button"
                onClick={() => arquivo.current?.click()}
                disabled={subindo > 0}
                aria-label="Subir fotos para a galeria"
                className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-text-tertiary/50 bg-surface-soft/60 text-text-secondary transition-transform active:scale-[0.96]"
              >
                {subindo > 0 ? <span className="text-[12px] font-medium">{subindo}…</span> : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
                )}
              </button>
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
