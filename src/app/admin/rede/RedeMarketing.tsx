"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { LogoApp } from "@/components/delivery/LogoApp";
import { appPorId, type AppDeliveryId } from "@/lib/delivery";

// As funções da rede ainda não estão nos tipos gerados do banco, por isso o cliente sem tipos.
function cliente() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

type VoucherLinha = {
  business_id: string;
  loja: string;
  voucher_id: string;
  titulo: string;
  tipo_desconto: string;
  valor_desconto: number | null;
  ofertados: number | null;
  emitidos: number;
  resgatados: number;
};
type ProdutoLinha = {
  business_id: string;
  loja: string;
  item_id: string;
  titulo: string;
  image_url: string | null;
  cliques: number;
  sugestoes: number;
};

type Aba = "resumo" | "vouchers" | "produtos" | "delivery";
type AcaoLinha = { business_id: string; loja: string; tipo: string; toques: number };
const PERIODOS = [7, 30, 90] as const;

const nf = (n: number) => n.toLocaleString("pt-BR");
const taxa = (resg: number, emit: number) => (emit > 0 ? Math.round((resg / emit) * 100) : 0);

function rotuloOferta(v: Pick<VoucherLinha, "tipo_desconto" | "valor_desconto">) {
  const val = Number(v.valor_desconto ?? 0);
  if (v.tipo_desconto === "percent") return `${val}% de desconto`;
  if (v.tipo_desconto === "fixed") return `R$ ${val.toLocaleString("pt-BR")} de desconto`;
  return "Brinde";
}

function Barra({ pct, cor = "#6DB300" }: { pct: number; cor?: string }) {
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-soft" aria-hidden>
      <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(pct, pct > 0 ? 4 : 0))}%`, backgroundColor: cor }} />
    </span>
  );
}

function Numero({ rotulo, valor, fundo, cor }: { rotulo: string; valor: string; fundo: string; cor: string }) {
  return (
    <div className="rounded-[22px] p-4" style={{ backgroundColor: fundo, color: cor }}>
      <p className="text-[12.5px] opacity-80">{rotulo}</p>
      <p className="mt-1 font-[family-name:var(--font-manrope)] text-[28px] font-medium leading-none tabular-nums">{valor}</p>
    </div>
  );
}

/**
 * Marketing da rede com números de verdade: vouchers por loja e por campanha,
 * produtos que mais geraram toque e que mais a Orbi sugeriu.
 * O dono da rede recebe só totais, nunca conversas, nomes ou contatos de clientes.
 */
export function RedeMarketing() {
  const [carregando, setCarregando] = useState(true);
  const [redeId, setRedeId] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("resumo");
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [vouchers, setVouchers] = useState<VoucherLinha[]>([]);
  const [produtos, setProdutos] = useState<ProdutoLinha[]>([]);
  const [acoes, setAcoes] = useState<AcaoLinha[]>([]);
  const [acoesIndisponivel, setAcoesIndisponivel] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await cliente().from("networks").select("id").maybeSingle();
      if (!vivo) return;
      setRedeId((data as { id: string } | null)?.id ?? null);
      if (!data) setCarregando(false);
    })();
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!redeId) return;
    let vivo = true;
    (async () => {
      setAtualizando(true);
      const sb = cliente();
      const [v, p, a] = await Promise.all([
        sb.rpc("listar_vouchers_da_rede", { p_network_id: redeId, p_dias: dias }),
        sb.rpc("listar_produtos_da_rede", { p_network_id: redeId, p_dias: dias }),
        sb.rpc("listar_acoes_da_rede", { p_network_id: redeId, p_dias: dias }),
      ]);
      if (!vivo) return;
      if (v.error || p.error) setErro("Não consegui carregar os números agora. Tente de novo.");
      else setErro(null);
      setVouchers(Array.isArray(v.data) ? (v.data as VoucherLinha[]).map((x) => ({ ...x, emitidos: Number(x.emitidos), resgatados: Number(x.resgatados) })) : []);
      setProdutos(Array.isArray(p.data) ? (p.data as ProdutoLinha[]).map((x) => ({ ...x, cliques: Number(x.cliques), sugestoes: Number(x.sugestoes) })) : []);
      setAcoesIndisponivel(!!a.error);
      setAcoes(Array.isArray(a.data) ? (a.data as AcaoLinha[]).map((x) => ({ ...x, toques: Number(x.toques) })) : []);
      setAtualizando(false);
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [redeId, dias]);

  const totais = useMemo(() => {
    const emitidos = vouchers.reduce((t, v) => t + v.emitidos, 0);
    const resgatados = vouchers.reduce((t, v) => t + v.resgatados, 0);
    const cliques = produtos.reduce((t, p) => t + p.cliques, 0);
    const sugestoes = produtos.reduce((t, p) => t + p.sugestoes, 0);
    return { emitidos, resgatados, cliques, sugestoes };
  }, [vouchers, produtos]);

  const porLoja = useMemo(() => {
    const m = new Map<string, { id: string; nome: string; campanhas: number; emitidos: number; resgatados: number }>();
    for (const v of vouchers) {
      const x = m.get(v.business_id) ?? { id: v.business_id, nome: v.loja, campanhas: 0, emitidos: 0, resgatados: 0 };
      x.campanhas += 1;
      x.emitidos += v.emitidos;
      x.resgatados += v.resgatados;
      m.set(v.business_id, x);
    }
    return [...m.values()].sort((a, b) => b.resgatados - a.resgatados || b.emitidos - a.emitidos);
  }, [vouchers]);

  const campanhas = useMemo(
    () => [...vouchers].filter((v) => v.emitidos > 0).sort((a, b) => taxa(b.resgatados, b.emitidos) - taxa(a.resgatados, a.emitidos) || b.resgatados - a.resgatados || b.emitidos - a.emitidos),
    [vouchers],
  );

  const porTipo = useMemo(() => {
    const m = new Map<string, { nome: string; emitidos: number; resgatados: number }>();
    for (const v of vouchers) {
      const chave = v.tipo_desconto === "percent" ? "Desconto em porcentagem" : v.tipo_desconto === "fixed" ? "Desconto em reais" : "Brinde";
      const x = m.get(chave) ?? { nome: chave, emitidos: 0, resgatados: 0 };
      x.emitidos += v.emitidos;
      x.resgatados += v.resgatados;
      m.set(chave, x);
    }
    return [...m.values()].filter((x) => x.emitidos > 0).sort((a, b) => taxa(b.resgatados, b.emitidos) - taxa(a.resgatados, a.emitidos));
  }, [vouchers]);

  const deliveryPorApp = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of acoes) if (x.tipo.startsWith("delivery_")) m.set(x.tipo.slice(9), (m.get(x.tipo.slice(9)) ?? 0) + x.toques);
    return [...m.entries()].map(([id, toques]) => ({ id, toques })).sort((a, b) => b.toques - a.toques);
  }, [acoes]);
  const deliveryPorLoja = useMemo(() => {
    const m = new Map<string, { nome: string; toques: number; apps: Map<string, number> }>();
    for (const x of acoes) {
      if (!x.tipo.startsWith("delivery_")) continue;
      const l = m.get(x.business_id) ?? { nome: x.loja, toques: 0, apps: new Map<string, number>() };
      l.toques += x.toques;
      l.apps.set(x.tipo.slice(9), (l.apps.get(x.tipo.slice(9)) ?? 0) + x.toques);
      m.set(x.business_id, l);
    }
    return [...m.values()].sort((a, b) => b.toques - a.toques);
  }, [acoes]);
  const totalDelivery = deliveryPorApp.reduce((t, d) => t + d.toques, 0);
  const totalCardapio = acoes.filter((x) => x.tipo === "cardapio").reduce((t, x) => t + x.toques, 0);

  const maisToques = useMemo(() => [...produtos].filter((p) => p.cliques > 0).sort((a, b) => b.cliques - a.cliques), [produtos]);
  const maisSugeridos = useMemo(() => [...produtos].filter((p) => p.sugestoes > 0).sort((a, b) => b.sugestoes - a.sugestoes), [produtos]);

  if (!redeId) return null;
  if (carregando) return <p className="mt-4 text-[13px] text-text-tertiary">Carregando o marketing da rede...</p>;

  const melhorCampanha = campanhas[0];
  const melhorProduto = maisToques[0];
  const maisSugerido = maisSugeridos[0];
  const maxToques = maisToques[0]?.cliques ?? 1;
  const maxSug = maisSugeridos[0]?.sugestoes ?? 1;
  const semNada = vouchers.length === 0 && produtos.length === 0;

  return (
    <section className="mt-4 rounded-[24px] border border-divider bg-surface-white p-4" aria-labelledby="titulo-marketing">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="titulo-marketing" className="font-[family-name:var(--font-manrope)] text-[18px] font-medium">Marketing da rede</h2>
          <p className="mt-1 text-[13px] leading-snug text-text-tertiary">Números reais dos negócios que já entraram. Você vê só os totais, nunca conversas nem dados de clientes.</p>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5" role="group" aria-label="Período">
        {PERIODOS.map((d) => (
          <button key={d} type="button" aria-pressed={dias === d} onClick={() => setDias(d)} className={`min-h-[40px] rounded-full px-4 text-[13px] ${dias === d ? "bg-on-background text-white" : "border border-divider text-text-secondary"}`}>
            {d} dias
          </button>
        ))}
        {atualizando && <span className="self-center pl-1 text-[12px] text-text-tertiary">Atualizando...</span>}
      </div>

      <div role="tablist" aria-label="Marketing da rede" className="mt-3 flex gap-1.5 rounded-full bg-surface-soft p-1">
        {([["resumo", "Resumo"], ["vouchers", "Vouchers"], ["produtos", "Produtos"], ["delivery", "Delivery"]] as const).map(([id, rot]) => (
          <button key={id} role="tab" aria-selected={aba === id} onClick={() => setAba(id)} className={`min-h-[40px] flex-1 rounded-full px-2 text-[13px] transition-colors ${aba === id ? "bg-on-background text-white" : "text-text-secondary"}`}>
            {rot}
          </button>
        ))}
      </div>

      {erro && <p role="alert" className="mt-3 text-[13px] text-red-600">{erro}</p>}

      {semNada && !erro && (
        <p className="mt-4 rounded-2xl bg-surface-soft p-4 text-[13.5px] leading-snug text-text-secondary">
          Ainda não há vouchers nem produtos nas lojas da rede. Quando as lojas criarem e começarem a receber visitas, os números aparecem aqui.
        </p>
      )}

      {!semNada && aba === "resumo" && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            <Numero rotulo="Vouchers pegos" valor={nf(totais.emitidos)} fundo="#F4F1FF" cor="#6A3FC4" />
            <Numero rotulo="Vouchers usados" valor={nf(totais.resgatados)} fundo="#E4F7EA" cor="#1F7A3D" />
            <Numero rotulo="Toques em produtos" valor={nf(totais.cliques)} fundo="#DDF8F4" cor="#0A7F74" />
            <Numero rotulo="Vezes que a Orbi sugeriu" valor={nf(totais.sugestoes)} fundo="#FFF1C9" cor="#7A5A00" />
            {!acoesIndisponivel && <Numero rotulo="Toques em apps de delivery" valor={nf(totalDelivery)} fundo="#FDEEDF" cor="#C2650A" />}
            {!acoesIndisponivel && <Numero rotulo="Aberturas do cardápio" valor={nf(totalCardapio)} fundo="#E2EAFE" cor="#1D4ED8" />}
          </div>
          {melhorCampanha && (
            <div className="rounded-2xl bg-[#F1FCDC] p-4">
              <p className="text-[11.5px] uppercase tracking-[0.1em] text-[#4C7F00]">Campanha que mais converte</p>
              <p className="mt-1 font-[family-name:var(--font-manrope)] text-[17px] font-medium leading-tight">{melhorCampanha.titulo}</p>
              <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">{melhorCampanha.loja}: {nf(melhorCampanha.resgatados)} de {nf(melhorCampanha.emitidos)} vouchers usados ({taxa(melhorCampanha.resgatados, melhorCampanha.emitidos)}%).</p>
            </div>
          )}
          {melhorProduto && (
            <div className="rounded-2xl bg-[#DDF8F4] p-4">
              <p className="text-[11.5px] uppercase tracking-[0.1em] text-[#0A7F74]">Produto mais tocado</p>
              <p className="mt-1 font-[family-name:var(--font-manrope)] text-[17px] font-medium leading-tight">{melhorProduto.titulo}</p>
              <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">{melhorProduto.loja}: {nf(melhorProduto.cliques)} {melhorProduto.cliques === 1 ? "toque" : "toques"} em {dias} dias.</p>
            </div>
          )}
          {maisSugerido && (
            <div className="rounded-2xl bg-[#FFF1C9] p-4">
              <p className="text-[11.5px] uppercase tracking-[0.1em] text-[#7A5A00]">Produto que a Orbi mais sugeriu</p>
              <p className="mt-1 font-[family-name:var(--font-manrope)] text-[17px] font-medium leading-tight">{maisSugerido.titulo}</p>
              <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">{maisSugerido.loja}: sugerido {nf(maisSugerido.sugestoes)} {maisSugerido.sugestoes === 1 ? "vez" : "vezes"} nas conversas.</p>
            </div>
          )}
        </div>
      )}

      {!semNada && aba === "vouchers" && (
        <div className="mt-4 flex flex-col gap-5">
          <div>
            <p className="text-[14.5px] font-medium">Por negócio</p>
            <p className="text-[12.5px] text-text-tertiary">Pego é quando o cliente garante o voucher. Usado é quando ele resgata no negócio.</p>
            {porLoja.length === 0 ? (
              <p className="mt-2 text-[13px] text-text-tertiary">Nenhum negócio criou vouchers ainda.</p>
            ) : (
              <ul className="mt-2 flex flex-col divide-y divide-divider">
                {porLoja.map((l) => (
                  <li key={l.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[14px]">{l.nome}</span>
                      <span className="shrink-0 text-[13px] tabular-nums text-text-secondary">{taxa(l.resgatados, l.emitidos)}% usados</span>
                    </div>
                    <div className="mt-1.5"><Barra pct={taxa(l.resgatados, l.emitidos)} /></div>
                    <p className="mt-1.5 text-[12.5px] text-text-tertiary">{nf(l.emitidos)} pegos, {nf(l.resgatados)} usados, {l.campanhas} {l.campanhas === 1 ? "campanha" : "campanhas"}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {porTipo.length > 0 && (
            <div>
              <p className="text-[14.5px] font-medium">Que tipo de oferta funciona mais</p>
              <ul className="mt-2 flex flex-col gap-2">
                {porTipo.map((t, i) => (
                  <li key={t.nome} className="rounded-2xl bg-surface-soft px-3.5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px]">{i === 0 && porTipo.length > 1 ? `${t.nome}, a que mais converte` : t.nome}</span>
                      <span className="shrink-0 text-[13px] tabular-nums">{taxa(t.resgatados, t.emitidos)}%</span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-text-tertiary">{nf(t.resgatados)} usados de {nf(t.emitidos)} pegos</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-[14.5px] font-medium">Campanhas que mais convertem</p>
            <p className="text-[12.5px] text-text-tertiary">Em ordem de quantos vouchers pegos viraram uso no negócio.</p>
            {campanhas.length === 0 ? (
              <p className="mt-2 text-[13px] text-text-tertiary">Nenhum voucher foi pego neste período.</p>
            ) : (
              <ol className="mt-2 flex flex-col gap-2">
                {campanhas.map((v, i) => (
                  <li key={v.voucher_id} className="flex gap-3 rounded-2xl border border-divider p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[13px] tabular-nums">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px]">{v.titulo}</p>
                      <p className="truncate text-[12.5px] text-text-tertiary">{v.loja} · {rotuloOferta(v)}</p>
                      <div className="mt-2"><Barra pct={taxa(v.resgatados, v.emitidos)} /></div>
                      <p className="mt-1.5 text-[12.5px] tabular-nums text-text-secondary">{taxa(v.resgatados, v.emitidos)}% usados, {nf(v.resgatados)} de {nf(v.emitidos)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {aba === "delivery" && (
        <div className="mt-4 flex flex-col gap-5">
          {acoesIndisponivel ? (
            <p className="rounded-2xl bg-surface-soft p-4 text-[13.5px] leading-snug text-text-secondary">Os números de delivery ainda não estão disponíveis para a rede.</p>
          ) : totalDelivery === 0 ? (
            <p className="rounded-2xl bg-surface-soft p-4 text-[13.5px] leading-snug text-text-secondary">Ninguém tocou nos apps de delivery neste período. Quando as lojas ligarem o botão de delivery e os clientes começarem a pedir, os números aparecem aqui.</p>
          ) : (
            <>
              <div>
                <p className="text-[14.5px] font-medium">Por app</p>
                <p className="text-[12.5px] text-text-tertiary">Quantos toques cada app recebeu em toda a rede.</p>
                <ol className="mt-2 flex flex-col gap-2.5">
                  {deliveryPorApp.map((d) => (
                    <li key={d.id} className="flex items-center gap-3">
                      {appPorId(d.id) ? <LogoApp id={d.id as AppDeliveryId} tamanho={38} /> : <span className="h-[38px] w-[38px] rounded-[12px] bg-surface-soft" aria-hidden />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[14px]">{appPorId(d.id)?.nome ?? d.id}</p>
                          <p className="shrink-0 text-[13px] tabular-nums">{nf(d.toques)} <span className="text-text-tertiary">{d.toques === 1 ? "toque" : "toques"}</span></p>
                        </div>
                        <div className="mt-1.5"><Barra pct={(d.toques / deliveryPorApp[0].toques) * 100} cor="#C2650A" /></div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="text-[14.5px] font-medium">Por negócio</p>
                <p className="text-[12.5px] text-text-tertiary">Quais negócios mais levam clientes para pedir por app.</p>
                <ol className="mt-2 flex flex-col gap-2.5">
                  {deliveryPorLoja.map((l, i) => (
                    <li key={l.nome + i} className="rounded-2xl bg-surface-soft px-3.5 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[14px] font-medium">{l.nome}</p>
                        <p className="shrink-0 text-[13px] tabular-nums">{nf(l.toques)} <span className="text-text-tertiary">{l.toques === 1 ? "toque" : "toques"}</span></p>
                      </div>
                      <p className="mt-1 text-[12.5px] text-text-tertiary">
                        {[...l.apps.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => `${appPorId(id)?.nome ?? id} ${n}`).join(" · ")}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      )}

      {!semNada && aba === "produtos" && (
        <div className="mt-4 flex flex-col gap-5">
          <div>
            <p className="text-[14.5px] font-medium">Mais tocados</p>
            <p className="text-[12.5px] text-text-tertiary">Quantas vezes visitantes tocaram no produto.</p>
            {maisToques.length === 0 ? (
              <p className="mt-2 text-[13px] text-text-tertiary">Nenhum toque em produtos neste período.</p>
            ) : (
              <ol className="mt-2 flex flex-col gap-2.5">
                {maisToques.slice(0, 10).map((p, i) => (
                  <ItemRanking key={p.item_id} pos={i + 1} p={p} valor={p.cliques} unidade={p.cliques === 1 ? "toque" : "toques"} max={maxToques} cor="#0A9C8E" />
                ))}
              </ol>
            )}
          </div>
          <div>
            <p className="text-[14.5px] font-medium">Mais sugeridos pela Orbi</p>
            <p className="text-[12.5px] text-text-tertiary">Quantas vezes a Orbi recomendou o produto numa conversa.</p>
            {maisSugeridos.length === 0 ? (
              <p className="mt-2 text-[13px] text-text-tertiary">A Orbi ainda não sugeriu produtos neste período.</p>
            ) : (
              <ol className="mt-2 flex flex-col gap-2.5">
                {maisSugeridos.slice(0, 10).map((p, i) => (
                  <ItemRanking key={p.item_id} pos={i + 1} p={p} valor={p.sugestoes} unidade={p.sugestoes === 1 ? "sugestão" : "sugestões"} max={maxSug} cor="#E0A800" extra={p.sugestoes > 0 ? `${nf(p.cliques)} ${p.cliques === 1 ? "toque" : "toques"} no produto` : undefined} />
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ItemRanking({ pos, p, valor, unidade, max, cor, extra }: { pos: number; p: ProdutoLinha; valor: number; unidade: string; max: number; cor: string; extra?: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-5 shrink-0 text-center text-[12.5px] tabular-nums text-text-tertiary">{pos}</span>
      {p.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image_url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="h-11 w-11 shrink-0 rounded-xl bg-surface-soft" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[14px]">{p.titulo}</p>
          <p className="shrink-0 text-[13px] tabular-nums">{nf(valor)} <span className="text-text-tertiary">{unidade}</span></p>
        </div>
        <p className="truncate text-[12.5px] text-text-tertiary">{p.loja}{extra ? ` · ${extra}` : ""}</p>
        <div className="mt-1.5"><Barra pct={(valor / max) * 100} cor={cor} /></div>
      </div>
    </li>
  );
}
