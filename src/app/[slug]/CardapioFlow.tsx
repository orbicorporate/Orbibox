"use client";

import { useEffect, useMemo, useState } from "react";
import { precoCardapio, textoSobre, type CardapioPdf, type CardapioSecao } from "@/lib/cardapio";
import { AbrirEditor } from "@/components/mobile/EditarNoLugar";
import { trackClick } from "@/lib/track";
import { estiloCategoria, IconeCategoria } from "./categoriaCardapio";

/**
 * Cardápio da loja: os pratos cadastrados no cardápio (separado do Catálogo),
 * por categoria. Com foto mostra a foto ao lado; sem foto mostra só nome,
 * descrição e preço.
 */
export function CardapioFlow({
  business,
  secoes,
  sessionId,
  titulo,
  subtitulo,
  pdfs = [],
  corBotoes = null,
  donoVendo = false,
  onPedir,
  onBack,
}: {
  business: { id: string; name: string };
  secoes: CardapioSecao[];
  sessionId: string | null;
  titulo: string;
  subtitulo: string;
  /** PDFs do cardápio para baixar, se o dono enviou (Cardápio, Bebidas...). */
  pdfs?: CardapioPdf[];
  /** Cor que o dono escolheu para os botões principais (#RRGGBB). */
  corBotoes?: string | null;
  /** O dono olhando a própria página: mostra orientação em vez do aviso do cliente. */
  donoVendo?: boolean;
  onPedir?: () => void;
  onBack: () => void;
}) {
  const [ativa, setAtiva] = useState<string | null>(null);
  const temPdf = pdfs.length > 0;
  const unico = pdfs.length === 1;
  const estiloBotao = corBotoes ? { backgroundColor: corBotoes, color: textoSobre(corBotoes) } : undefined;

  useEffect(() => {
    trackClick({ businessId: business.id, kind: "cardapio", sessionId });
    // Conta uma abertura por visita à tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preenchidas = useMemo(() => secoes.map((s) => ({ ...s, itens: s.itens.filter((i) => i.nome.trim()) })).filter((s) => s.itens.length > 0), [secoes]);
  const nomeadas = preenchidas.filter((s) => s.nome.trim());
  const visiveis = ativa ? preenchidas.filter((s) => s.id === ativa) : preenchidas;

  return (
    <div className={`w-full ${onPedir ? "pb-24" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onBack} className="text-[14px] text-text-tertiary hover:underline">← voltar</button>
        {donoVendo && preenchidas.length > 0 && (
          <AbrirEditor href="/admin/cardapio" rotulo="Editar cardápio" className="flex items-center gap-1.5 rounded-full bg-on-background px-3.5 py-2 text-[13px] font-medium text-white shadow-lg">
            <span aria-hidden>✎</span> Editar
          </AbrirEditor>
        )}
      </div>
      <h2 className="font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.01em]">{titulo}</h2>
      <p className="mt-1 text-[14px] text-text-secondary">{subtitulo}</p>
      {temPdf && preenchidas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {pdfs.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noopener" download onClick={() => trackClick({ businessId: business.id, kind: "link", sessionId, targetUrl: p.url })} className="inline-flex min-h-[44px] items-center rounded-full border border-divider bg-surface-white px-4 text-[13.5px] font-medium text-text-secondary active:scale-[0.98]">
              {unico ? "Baixar cardápio em PDF" : `Baixar ${p.nome.trim() || "PDF"}`}
            </a>
          ))}
        </div>
      )}

      {preenchidas.length === 0 && donoVendo && (
        <div className="mt-6 rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Só você vê este aviso</p>
          <p className="mt-1.5 text-[16px] font-semibold leading-snug">
            {temPdf ? (unico ? "Seu cardápio está só em PDF, e tudo bem." : "Seu cardápio está só em PDFs, e tudo bem.") : "Seu cardápio ainda está vazio."}
          </p>
          <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">
            {temPdf
              ? (unico ? "Seus clientes veem o botão de abrir o PDF. Se quiser mostrar os pratos também, monte a lista:" : "Seus clientes veem um botão para cada PDF. Se quiser mostrar os pratos também, monte a lista:")
              : "Você tem dois caminhos, e pode usar só um deles:"}
          </p>
          <ul className="mt-3 flex flex-col gap-2.5 text-[13.5px] leading-snug">
            <li className="flex gap-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[11px] font-semibold">1</span><span><span className="font-medium">Montar pelos pratos.</span> Cole o texto do seu cardápio e a Orbi monta sozinha, ou inclua categorias e pratos um por um.</span></li>
            {!temPdf && <li className="flex gap-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[11px] font-semibold">2</span><span><span className="font-medium">Deixar só o PDF.</span> Envie o arquivo e ele vira o cardápio, sem cadastrar nenhum prato.</span></li>}
          </ul>
          <AbrirEditor href="/admin/cardapio" rotulo="Editar cardápio" className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-on-background px-5 text-[14px] font-semibold text-white active:scale-[0.98]">
            {temPdf ? "Montar pratos" : "Montar meu cardápio"}
          </AbrirEditor>
        </div>
      )}

      {preenchidas.length === 0 && !donoVendo && (
        temPdf ? (
          <div className="mt-6 rounded-[24px] bg-surface-white p-5 text-center ring-1 ring-black/[0.05]">
            <p className="text-[15px] font-medium">{unico ? "Nosso cardápio completo está em PDF." : "Nossos cardápios estão em PDF."}</p>
            <div className="mt-4 flex flex-col gap-2.5">
              {pdfs.map((p) => (
                <a key={p.id} href={p.url} target="_blank" rel="noopener" onClick={() => trackClick({ businessId: business.id, kind: "link", sessionId, targetUrl: p.url })} style={estiloBotao} className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-on-background text-[15px] font-semibold text-white active:scale-[0.98]">
                  {unico ? "Abrir cardápio em PDF" : `Abrir ${p.nome.trim() || "PDF"}`}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-8 rounded-[22px] border border-dashed border-divider p-6 text-center text-[14px] text-text-tertiary">Em breve o cardápio estará por aqui.</p>
        )
      )}

      {nomeadas.length > 1 && (
        <div className="no-scrollbar -mx-6 mt-5 flex gap-2 overflow-x-auto px-6">
          <button type="button" onClick={() => setAtiva(null)} className={`shrink-0 min-h-[40px] rounded-full px-4 text-[13.5px] font-medium ${ativa === null ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>Tudo</button>
          {nomeadas.map((s) => (
            <button key={s.id} type="button" onClick={() => setAtiva(s.id)} className={`shrink-0 min-h-[40px] rounded-full px-4 text-[13.5px] font-medium ${ativa === s.id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{s.nome}</button>
          ))}
        </div>
      )}

      {visiveis.map((s) => {
        const est = estiloCategoria(s.nome);
        const cor = corBotoes ?? est.cor;
        return (
          <section key={s.id} className="relative isolate mt-8" aria-label={s.nome || "Pratos"}>
            {/* Manchas de cor suaves atrás dos cartões: é o que faz o vidro aparecer. */}
            <span aria-hidden className="pointer-events-none absolute -left-10 top-10 -z-10 h-40 w-40 rounded-full opacity-30 blur-3xl" style={{ backgroundColor: cor }} />
            <span aria-hidden className="pointer-events-none absolute -right-12 bottom-6 -z-10 h-44 w-44 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: est.cor }} />
            {s.nome.trim() && (
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 ring-1 ring-white/80 backdrop-blur-md shadow-[0_2px_10px_rgba(17,19,24,0.06)]" style={{ color: cor }}>
                  <IconeCategoria chave={est.chave} />
                </span>
                <h3 className="min-w-0 flex-1 truncate font-[family-name:var(--font-manrope)] text-[20px] font-medium tracking-[-0.01em]">{s.nome}</h3>
                <span className="shrink-0 rounded-full bg-white/60 px-2.5 py-1 text-[12px] font-medium text-text-secondary ring-1 ring-white/80 backdrop-blur-md">{s.itens.length}</span>
              </div>
            )}
            <ul className="mt-3.5 flex flex-col gap-2.5">
              {s.itens.map((i, n) => {
                const preco = precoCardapio(i);
                return (
                  <li
                    key={i.id}
                    style={{ animationDelay: `${Math.min(n, 8) * 45}ms` }}
                    className="cardapio-item-in flex w-full items-center gap-3.5 rounded-[24px] bg-white/55 p-3.5 ring-1 ring-white/80 backdrop-blur-xl shadow-[0_6px_24px_rgba(17,19,24,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]"
                  >
                    {i.foto && (
                      <span className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[18px] bg-surface-soft ring-1 ring-white/80">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={i.foto} alt="" loading="lazy" className="h-full w-full object-cover" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 px-0.5">
                      <span className="block break-words text-[15.5px] font-semibold leading-snug">{i.nome}</span>
                      {i.descricao?.trim() && <span className="mt-0.5 block whitespace-pre-line break-words text-[13px] leading-snug text-text-secondary">{i.descricao}</span>}
                    </span>
                    {preco && (
                      <span className="shrink-0 self-center rounded-full px-3 py-1.5 text-[13.5px] font-semibold tabular-nums" style={{ backgroundColor: `${cor}1A`, color: `color-mix(in srgb, ${cor} 75%, black)` }}>{preco}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {onPedir && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[440px] bg-gradient-to-t from-background-main via-background-main/95 to-transparent px-6 pb-6 pt-8">
          <button type="button" onClick={onPedir} style={estiloBotao} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-on-background text-[15px] font-semibold text-white shadow-[0_10px_30px_rgba(17,19,24,0.25)] active:scale-[0.98]">
            Pedir por delivery <span aria-hidden>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
