"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ImageUpload } from "@/components/ui/ImageUpload";
import CampoPreco from "@/components/ui/CampoPreco";
import type { Ratio } from "@/components/ui/ImageCropModal";

export type ItemNovo = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  price_type: string;
  brand_label: string | null;
};

type Passo = "nome" | "foto" | "descricao" | "preco" | "categoria";
const PASSOS: Passo[] = ["nome", "foto", "descricao", "preco", "categoria"];

const TITULO: Record<Passo, string> = {
  nome: "Como se chama esse item?",
  foto: "Quer colocar uma foto?",
  descricao: "Quer escrever uma descrição?",
  preco: "Qual é o preço?",
  categoria: "Em qual categoria ele fica?",
};

const APOIO: Record<Passo, string> = {
  nome: "Só isto é obrigatório. O resto você pode pular e completar depois.",
  foto: "Uma foto boa faz o cliente tocar no item.",
  descricao: "Conte o que é, para quem serve e o que inclui. A Orbi pode escrever por você.",
  preco: "Se o valor depende do pedido, escolha Sob consulta.",
  categoria: "Cada categoria vira uma seção com título no Catálogo.",
};

/**
 * Cadastro de item novo em passos, uma pergunta por vez. Só o nome é obrigatório;
 * foto, descrição, preço e categoria têm "Pular". "Ver todos os campos" abre o
 * editor completo. O item já existe como rascunho (precisa de id para subir foto).
 */
export function NovoItemPassos({
  item,
  businessId,
  ratio,
  categorias,
  salvar,
  alterar,
  onNovaCategoria,
  onMelhorar,
  melhorando,
  onVerTudo,
  onCancelar,
  onConcluir,
}: {
  item: ItemNovo;
  businessId: string;
  ratio: Ratio;
  categorias: string[];
  salvar: (campos: Record<string, unknown>) => Promise<void>;
  alterar: (campos: Record<string, unknown>) => void;
  onNovaCategoria: (nome: string) => void;
  onMelhorar: () => void;
  melhorando: boolean;
  onVerTudo: () => void;
  onCancelar: () => void;
  onConcluir: (publicar: boolean) => void;
}) {
  const [indice, setIndice] = useState(0);
  const passo = PASSOS[indice];
  const ultimo = indice === PASSOS.length - 1;
  const [nome, setNome] = useState("");
  const [tipoPreco, setTipoPreco] = useState<"exato" | "consulta" | "sem">("exato");
  const [preco, setPreco] = useState<number | null>(null);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function avancar() {
    setSalvando(true);
    try {
      if (passo === "nome") await salvar({ title: nome.trim() });
      if (passo === "preco") await salvar({ price_type: tipoPreco, price: tipoPreco === "exato" ? preco : null });
    } finally {
      setSalvando(false);
    }
    setIndice((i) => Math.min(i + 1, PASSOS.length - 1));
  }

  async function verTudo() {
    if (nome.trim() && passo !== "nome") await salvar({ title: nome.trim() });
    if (passo === "nome" && nome.trim()) await salvar({ title: nome.trim() });
    if (passo === "preco") await salvar({ price_type: tipoPreco, price: tipoPreco === "exato" ? preco : null });
    onVerTudo();
  }

  function pular() {
    setIndice((i) => Math.min(i + 1, PASSOS.length - 1));
  }

  async function escolherCategoria(valor: string | null) {
    await salvar({ brand_label: valor });
  }

  async function criarCategoria() {
    const n = novaCategoria.trim();
    if (!n) return;
    onNovaCategoria(n);
    setNovaCategoria("");
    await salvar({ brand_label: n });
  }

  const nomeVazio = passo === "nome" && nome.trim().length === 0;
  const chip = (ativo: boolean) =>
    `min-h-[44px] rounded-full px-4 text-[14px] font-medium transition-colors ${ativo ? "bg-on-background text-white" : "bg-surface-soft text-on-background"}`;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Novo item">
      <div className="flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-background-main sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <p className="text-[12.5px] font-medium text-text-secondary">Passo {indice + 1} de {PASSOS.length}</p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => void verTudo()} className="min-h-[44px] rounded-full px-3 text-[13px] font-medium text-text-secondary underline-offset-2 active:opacity-60">Ver todos os campos</button>
            <button type="button" onClick={onCancelar} aria-label="Cancelar" className="flex h-11 w-11 items-center justify-center rounded-full text-[18px] text-text-secondary active:opacity-60">✕</button>
          </div>
        </div>
        <div className="mx-5 mt-1 flex gap-1.5" aria-hidden>
          {PASSOS.map((p, n) => (
            <span key={p} className={`h-1 flex-1 rounded-full ${n <= indice ? "bg-on-background" : "bg-divider"}`} />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-5">
          <h2 className="font-[family-name:var(--font-manrope)] text-[22px] font-medium leading-tight tracking-[-0.01em]">{TITULO[passo]}</h2>
          <p className="mt-1.5 text-[13.5px] leading-snug text-text-secondary">{APOIO[passo]}</p>

          <div className="mt-5">
            {passo === "nome" && (
              <input
                data-guia="nome-item"
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do item"
                className="w-full rounded-2xl border border-divider bg-surface-white px-4 py-3.5 text-[16px] outline-none focus:border-on-background"
              />
            )}

            {passo === "foto" && (
              <div data-guia="foto-item">
                <ImageUpload
                  value={item.image_url}
                  businessId={businessId}
                  lockedRatio={ratio}
                  promptSubject={nome.trim() || item.title}
                  onChange={(url) => { void salvar({ image_url: url, image_is_placeholder: false, box_style: url ? "foto" : "cor" }); }}
                />
              </div>
            )}

            {passo === "descricao" && (
              <div>
                <textarea
                  value={item.description ?? ""}
                  onChange={(e) => alterar({ description: e.target.value })}
                  onBlur={(e) => { void salvar({ description: e.target.value || null }); }}
                  rows={5}
                  placeholder="Conte o que é, para quem serve, o que inclui"
                  className="w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
                />
                <button type="button" onClick={onMelhorar} disabled={melhorando} className="mt-3 min-h-[44px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium disabled:opacity-60">
                  {melhorando ? "Pensando…" : item.description?.trim() ? "✦ Melhorar texto com a Orbi" : "✦ Escrever com a Orbi"}
                </button>
              </div>
            )}

            {passo === "preco" && (
              <div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setTipoPreco("exato")} className={chip(tipoPreco === "exato")}>Com valor</button>
                  <button type="button" onClick={() => setTipoPreco("consulta")} className={chip(tipoPreco === "consulta")}>Sob consulta</button>
                  <button type="button" onClick={() => setTipoPreco("sem")} className={chip(tipoPreco === "sem")}>Sem preço</button>
                </div>
                {tipoPreco === "exato" && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-divider bg-surface-white px-4">
                    <span className="text-[15px] text-text-secondary">R$</span>
                    <CampoPreco
                      valor={preco}
                      onValor={setPreco}
                      placeholder="0,00"
                      aria-label="Preço"
                      className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {passo === "categoria" && (
              <div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void escolherCategoria(null)} className={chip(!item.brand_label?.trim())}>Sem categoria</button>
                  {categorias.map((c) => (
                    <button key={c} type="button" onClick={() => void escolherCategoria(c)} className={chip(item.brand_label?.trim() === c)}>{c}</button>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    placeholder="Nova categoria"
                    className="min-w-0 flex-1 rounded-full border border-divider bg-surface-white px-4 py-3 text-[14.5px] outline-none focus:border-on-background"
                  />
                  <button type="button" onClick={() => void criarCategoria()} disabled={!novaCategoria.trim()} className="min-h-[44px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium disabled:opacity-40">Criar</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-divider px-5 pb-5 pt-4">
          {!ultimo ? (
            <>
              <button type="button" onClick={() => void avancar()} disabled={nomeVazio || salvando} className="min-h-[52px] w-full rounded-full bg-button-primary text-[15px] font-medium text-white disabled:opacity-40">
                {salvando ? "Salvando…" : "Continuar"}
              </button>
              {passo !== "nome" && (
                <button type="button" onClick={pular} className="min-h-[44px] w-full rounded-full text-[14px] font-medium text-text-secondary active:opacity-60">Pular</button>
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={() => onConcluir(true)} className="min-h-[52px] w-full rounded-full bg-button-primary text-[15px] font-medium text-white">Publicar item</button>
              <button type="button" onClick={() => onConcluir(false)} className="min-h-[44px] w-full rounded-full bg-surface-soft text-[14px] font-medium">Salvar como rascunho</button>
            </>
          )}
          {indice > 0 && (
            <button type="button" onClick={() => setIndice((i) => Math.max(0, i - 1))} className="min-h-[44px] w-full rounded-full text-[13.5px] text-text-tertiary active:opacity-60">Voltar</button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
