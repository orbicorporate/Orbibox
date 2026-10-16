"use client";

import { useEffect, useMemo, useState } from "react";
import { estiloFoto, pesoLegivel, precoCardapio, textoSobre, type CardapioPdf, type CardapioSecao, type LayoutItens } from "@/lib/cardapio";
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
  layoutInicial = "lista",
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
  /** Como o dono quer mostrar os pratos (o cliente pode alternar). */
  layoutInicial?: LayoutItens;
  /** O dono olhando a própria página: mostra orientação em vez do aviso do cliente. */
  donoVendo?: boolean;
  onPedir?: () => void;
  onBack: () => void;
}) {
  const [ativa, setAtiva] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutItens>(layoutInicial);
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());
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
        <div className="mt-5">
          <p className="px-1 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">{unico ? "Cardápio em PDF" : "Cardápios em PDF"}</p>
          {unico ? (
            <ul className="mt-2 grid grid-cols-1 gap-2">
              {pdfs.map((p) => (
                <li key={p.id}>
                  <a href={p.url} target="_blank" rel="noopener" download onClick={() => trackClick({ businessId: business.id, kind: "link", sessionId, targetUrl: p.url })} className="flex h-full min-h-[56px] items-center gap-3 rounded-[18px] bg-white/70 px-3 py-2 ring-1 ring-black/[0.04] transition-transform active:scale-[0.98]">
                    <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-[9.5px] font-bold leading-none tracking-wide" style={corBotoes ? { backgroundColor: `${corBotoes}1A`, color: `color-mix(in srgb, ${corBotoes} 75%, black)` } : { backgroundColor: "#FDECEC", color: "#B42318" }}>
                      <span className="text-[11px]">PDF</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-medium leading-snug">Baixar cardápio</span>
                      <span className="mt-0.5 block text-[12px] text-text-tertiary">PDF{p.bytes ? ` · ${pesoLegivel(p.bytes)}` : ""} · Baixar</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            // Vários PDFs: bolinhas de destaque, como as da home, com o nome embaixo.
            <ul className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-4 pb-1">
              {pdfs.map((p) => {
                const cor = corBotoes ?? "#C0392B";
                return (
                  <li key={p.id} className="flex w-[84px] flex-col items-center">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener"
                      download
                      aria-label={`Baixar ${p.nome.trim() || "PDF"}${p.bytes ? `, ${pesoLegivel(p.bytes)}` : ""}`}
                      onClick={() => trackClick({ businessId: business.id, kind: "link", sessionId, targetUrl: p.url })}
                      style={{ background: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0) 48%), ${cor}`, boxShadow: `inset 0 -7px 12px -5px rgba(0,0,0,0.22), inset 0 1.5px 2px rgba(255,255,255,0.28), 0 6px 16px -6px ${cor}99`, color: textoSobre(cor) }}
                      className="flex h-[64px] w-[64px] flex-col items-center justify-center rounded-full transition-transform active:scale-95"
                    >
                      <span className="text-[14px] font-bold leading-none tracking-[0.08em]">PDF</span>
                    </a>
                    <span className="mt-1.5 line-clamp-2 w-full break-words text-center text-[12px] font-medium leading-tight">{p.nome.trim() || "PDF"}</span>
                    {p.bytes ? <span className="mt-0.5 text-[10.5px] leading-none text-text-tertiary">{pesoLegivel(p.bytes)}</span> : null}
                  </li>
                );
              })}
            </ul>
          )}
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
        <div className="no-scrollbar -mx-6 mt-7 flex gap-2 overflow-x-auto px-6" aria-label="Categorias">
          <button type="button" onClick={() => setAtiva(null)} className={`shrink-0 min-h-[40px] rounded-full px-4 text-[13.5px] font-medium ${ativa === null ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>Tudo</button>
          {nomeadas.map((s) => (
            <button key={s.id} type="button" onClick={() => setAtiva(s.id)} className={`shrink-0 min-h-[40px] rounded-full px-4 text-[13.5px] font-medium ${ativa === s.id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{s.nome}</button>
          ))}
        </div>
      )}

      {preenchidas.length > 0 && (
        <div className="mt-5 flex justify-end">
          <div role="radiogroup" aria-label="Como ver os pratos" className="flex rounded-full bg-black/[0.05] p-1">
            {([["lista", "Ver em lista", "M4 6h16M4 12h16M4 18h16"], ["cards", "Ver em cards grandes", "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"]] as const).map(([v, r, d]) => (
              <button key={v} type="button" role="radio" aria-checked={layout === v} aria-label={r} onClick={() => setLayout(v)} className={`flex h-10 w-11 items-center justify-center rounded-full transition-colors ${layout === v ? "bg-white text-on-background shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-text-tertiary"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {visiveis.map((s) => {
        const est = estiloCategoria(s.nome);
        const cor = corBotoes ?? est.cor;
        return (
          <section key={s.id} className="relative isolate mt-8" aria-label={s.nome || "Pratos"}>
            {/* Brilho de cor bem espalhado atrás dos cartões. Cada brilho termina dentro da caixa (nunca encosta na borda), para não aparecer corte. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-x-8 -inset-y-6 -z-10"
              style={{ background: [`radial-gradient(ellipse 40% 11% at 28% 14%, ${cor}38, transparent 100%)`, `radial-gradient(ellipse 40% 11% at 74% 38%, ${est.cor}30, transparent 100%)`, `radial-gradient(ellipse 40% 11% at 26% 62%, ${cor}30, transparent 100%)`, `radial-gradient(ellipse 40% 11% at 72% 86%, ${est.cor}38, transparent 100%)`].join(", ") }}
            />
            {s.nome.trim() && (
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 ring-1 ring-white/80 backdrop-blur-md shadow-[0_2px_10px_rgba(17,19,24,0.06)]" style={{ color: cor }}>
                  <IconeCategoria chave={est.chave} />
                </span>
                <h3 className="min-w-0 flex-1 truncate font-[family-name:var(--font-manrope)] text-[20px] font-medium tracking-[-0.01em]">{s.nome}</h3>
                <span className="shrink-0 rounded-full bg-white/60 px-2.5 py-1 text-[12px] font-medium text-text-secondary ring-1 ring-white/80 backdrop-blur-md">{s.itens.length}</span>
              </div>
            )}
            {layout === "cards" ? (
              <ul className="mt-3.5 grid grid-cols-2 gap-3">
                {s.itens.map((i, n) => {
                  const preco = precoCardapio(i);
                  const longa = (i.descricao?.trim().length ?? 0) > 70;
                  const aberto = abertos.has(i.id);
                  return (
                    <li
                      key={i.id}
                      style={{ animationDelay: `${Math.min(n, 8) * 45}ms` }}
                      className="cardapio-item-in cardapio-vidro flex flex-col rounded-[24px] p-2.5"
                    >
                      <span className="relative block aspect-square w-full overflow-hidden rounded-[18px] bg-surface-soft ring-1 ring-white/80">
                        {i.foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.foto} alt="" loading="lazy" style={estiloFoto(i.fotoAjuste)} className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center opacity-60 [&_svg]:h-9 [&_svg]:w-9" style={{ color: cor }}><IconeCategoria chave={est.chave} /></span>
                        )}
                      </span>
                      <span className="mt-2.5 block break-words px-1 text-[14.5px] font-semibold leading-snug">{i.nome}</span>
                      {i.descricao?.trim() && (
                        longa ? (
                          <button type="button" aria-expanded={aberto} onClick={() => setAbertos((p) => { const q = new Set(p); if (q.has(i.id)) q.delete(i.id); else q.add(i.id); return q; })} className="px-1 text-left">
                            <span className={`mt-0.5 block whitespace-pre-line break-words text-[12.5px] leading-snug text-text-secondary ${aberto ? "" : "line-clamp-3"}`}>{i.descricao}</span>
                            <span className="mt-0.5 inline-block text-[12px] font-medium" style={{ color: `color-mix(in srgb, ${cor} 75%, black)` }}>{aberto ? "ver menos" : "ver mais"}</span>
                          </button>
                        ) : (
                          <span className="mt-0.5 block whitespace-pre-line break-words px-1 text-[12.5px] leading-snug text-text-secondary">{i.descricao}</span>
                        )
                      )}
                      {preco && (
                        <span className="mt-auto pt-2.5">
                          <span className="inline-block rounded-full px-3 py-1.5 text-[13.5px] font-semibold tabular-nums" style={{ backgroundColor: `${cor}1A`, color: `color-mix(in srgb, ${cor} 75%, black)` }}>{preco}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
            <ul className="mt-3.5 flex flex-col gap-2.5">
              {s.itens.map((i, n) => {
                const preco = precoCardapio(i);
                return (
                  <li
                    key={i.id}
                    style={{ animationDelay: `${Math.min(n, 8) * 45}ms` }}
                    className="cardapio-item-in cardapio-vidro flex w-full items-center gap-3.5 rounded-[24px] p-3.5"
                  >
                    {i.foto && (
                      <span className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[18px] bg-surface-soft ring-1 ring-white/80">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={i.foto} alt="" loading="lazy" style={estiloFoto(i.fotoAjuste)} className="h-full w-full object-cover" />
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
            )}
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
