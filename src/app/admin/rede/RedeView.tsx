"use client";

import { useEffect, useMemo, useState } from "react";
import { LOJAS_DEMO, METRICAS, REDE_DEMO, nf, soma, type LojaDemo, type Metrica } from "@/lib/rede/demo";
import { FAIXAS, NOME_PLANO, PRECO_MENSAL, brl, calcularRede, descontoPara, type PlanoRede } from "@/lib/rede/preco";

type Aba = "geral" | "lojas" | "convite";

/** Anima de 0 até o valor (respeita "reduzir movimento"). */
function useContagem(alvo: number, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const ini = performance.now();
    const passo = (t: number) => {
      const p = reduzir ? 1 : Math.min(1, (t - ini) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(alvo * e));
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, ms]);
  return v;
}

/** true um instante depois de montar, pra barras crescerem com transição. */
function useEntrou() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOk(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return ok;
}

function Delta({ v }: { v: number }) {
  const sobe = v >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11.5px] tabular-nums ${sobe ? "bg-[#E3F9C9] text-[#2B6B00]" : "bg-[#FFE1E1] text-[#B3261E]"}`}>
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden className={sobe ? "" : "rotate-180"}><path d="M5 1.5l3.5 5h-7z" fill="currentColor" /></svg>
      {Math.abs(v)}%
    </span>
  );
}

function Spark({ dados, cor, h = 28, w = 84 }: { dados: number[]; cor: string; h?: number; w?: number }) {
  const max = Math.max(...dados);
  const min = Math.min(...dados);
  const pts = dados.map((d, i) => `${(i / (dados.length - 1)) * w},${h - 3 - ((d - min) / (max - min || 1)) * (h - 6)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export function RedeView() {
  const [aba, setAba] = useState<Aba>("geral");
  const [foco, setFoco] = useState<string | null>(null);

  const lojas = LOJAS_DEMO;
  const totais = useMemo(() => Object.fromEntries(METRICAS.map((m) => [m.id, soma(lojas, m.id)])) as Record<Metrica, number>, [lojas]);
  const serieRede = useMemo(() => DIAS.map((_, i) => lojas.reduce((a, l) => a + l.serie[i], 0)), [lojas]);
  const deltaRede = Math.round((lojas.reduce((a, l) => a + l.delta * l.visitas, 0) / totais.visitas) * 10) / 10;

  function irParaLoja(id: string) {
    setFoco(id);
    setAba("lojas");
  }

  return (
    <div className="relative flex flex-col pb-10">
      <div className="mt-3 flex items-center gap-2">
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-medium leading-tight tracking-[-0.02em]">{REDE_DEMO.nome}</h1>
      </div>
      <p className="mt-1 text-[13.5px] text-text-secondary">Todas as suas lojas num só lugar.</p>
      <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#FFF1C9] px-3 py-1 text-[12px] text-[#7A5A00]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#E0A800]" aria-hidden />
        Prévia com dados de exemplo
      </p>

      <div role="tablist" aria-label="Seções da rede" className="mt-5 flex gap-1.5 rounded-full bg-surface-soft p-1">
        {([["geral", "Visão geral"], ["lojas", "Lojas"], ["convite", "Convite e cobrança"]] as const).map(([id, rot]) => (
          <button
            key={id}
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`min-h-[40px] flex-1 rounded-full px-2 text-[13px] transition-colors ${aba === id ? "bg-on-background text-white" : "text-text-secondary"}`}
          >
            {rot}
          </button>
        ))}
      </div>

      {aba === "geral" && <Geral lojas={lojas} totais={totais} serieRede={serieRede} deltaRede={deltaRede} onVerLoja={irParaLoja} />}
      {aba === "lojas" && <Lojas lojas={lojas} foco={foco} />}
      {aba === "convite" && <Convite />}
    </div>
  );
}

/* ───────────────────────── Visão geral ───────────────────────── */

function Geral({ lojas, totais, serieRede, deltaRede, onVerLoja }: { lojas: LojaDemo[]; totais: Record<Metrica, number>; serieRede: number[]; deltaRede: number; onVerLoja: (id: string) => void }) {
  const entrou = useEntrou();
  const visitas = useContagem(totais.visitas);
  const maxSerie = Math.max(...serieRede);

  const destaque = [...lojas].sort((a, b) => b.delta - a.delta)[0];
  const atencao = [...lojas].sort((a, b) => a.delta - b.delta)[0];
  const porUf = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lojas) m.set(l.uf, (m.get(l.uf) ?? 0) + l.toques);
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [lojas]);
  const lojasNaUf = lojas.filter((l) => l.uf === porUf[0]).length;

  return (
    <div className="mt-5 flex flex-col gap-4">
      {/* Número principal */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#111318] p-6 text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full orbi-gradient opacity-30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-[#C3A6FF] opacity-20 blur-3xl" aria-hidden />
        <p className="relative text-[12px] uppercase tracking-[0.12em] text-white/55">Visitas na rede, 7 dias</p>
        <div className="relative mt-2 flex items-end gap-3">
          <p className="font-[family-name:var(--font-manrope)] text-[52px] font-medium leading-none tracking-[-0.03em] tabular-nums">{nf(visitas)}</p>
          <span className="mb-1.5"><Delta v={deltaRede} /></span>
        </div>
        <p className="relative mt-1.5 text-[13.5px] text-white/65">{lojas.length} lojas ativas na rede</p>
        <div className="relative mt-5 flex h-16 items-end gap-1.5" aria-hidden>
          {serieRede.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full origin-bottom rounded-t-lg orbi-gradient transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ height: `${(v / maxSerie) * 100}%`, transform: entrou ? "scaleY(1)" : "scaleY(0.05)", transitionDelay: `${i * 50}ms` }} />
            </div>
          ))}
        </div>
        <div className="relative mt-1.5 flex gap-1.5 text-[10.5px] text-white/45" aria-hidden>
          {DIAS.map((d) => <span key={d} className="flex-1 text-center">{d}</span>)}
        </div>
      </section>

      {/* Quatro números coloridos */}
      <section className="grid grid-cols-2 gap-3">
        {METRICAS.map((m) => {
          const dados = lojas.reduce((acc, l) => acc.map((x, i) => x + l.serie[i] * (l[m.id] / l.visitas)), [0, 0, 0, 0, 0, 0, 0]);
          return (
            <div key={m.id} className="rounded-[22px] p-4" style={{ backgroundColor: m.fundo, color: m.cor }}>
              <p className="text-[12.5px] opacity-80">{m.nome}</p>
              <p className="mt-1 font-[family-name:var(--font-manrope)] text-[28px] font-medium leading-none tabular-nums">{nf(totais[m.id])}</p>
              <div className="mt-3"><Spark dados={dados} cor={m.cor} /></div>
            </div>
          );
        })}
      </section>

      {/* A Orbi lendo a rede */}
      <section className="relative overflow-hidden rounded-[26px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full orbi-gradient opacity-25 blur-2xl" aria-hidden />
        <p className="relative text-[12px] uppercase tracking-[0.12em] text-text-tertiary">A Orbi leu sua rede <span className="orbi-gradient-text">✦</span></p>
        <div className="relative mt-3 flex flex-col gap-2.5">
          <Insight cor="#6DB300" fundo="#F1FCDC" rotulo="Em destaque" titulo={destaque.nome} texto={`Visitas cresceram ${destaque.delta}% na semana. Vale entender o que ela está fazendo diferente e levar para as outras.`} acao="Ver loja" onAcao={() => onVerLoja(destaque.id)} />
          <Insight cor="#0A9C8E" fundo="#DDF8F4" rotulo="Onde gira" titulo={`${porUf[0]}, ${nf(porUf[1])} toques`} texto={`${lojasNaUf} ${lojasNaUf === 1 ? "loja concentra" : "lojas concentram"} o maior movimento da rede. É uma boa região para testar uma promoção.`} />
          <Insight cor="#D6453B" fundo="#FFEAE7" rotulo="Atenção" titulo={atencao.nome} texto={`Visitas caíram ${Math.abs(atencao.delta)}% contra a semana anterior. Pode ser hora de reativar a divulgação do link dessa loja.`} acao="Ver loja" onAcao={() => onVerLoja(atencao.id)} />
        </div>
      </section>

      {/* Mapa de calor */}
      <section className="rounded-[26px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
        <p className="text-[15px]">Movimento por dia</p>
        <p className="mt-0.5 text-[12.5px] text-text-secondary">Quanto mais forte a cor, mais visitas naquele dia.</p>
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="ml-[104px] flex gap-1">
            {DIAS.map((d) => <span key={d} className="flex-1 text-center text-[10.5px] text-text-tertiary">{d}</span>)}
          </div>
          {lojas.map((l) => {
            const max = Math.max(...l.serie);
            return (
              <div key={l.id} className="flex items-center gap-2">
                <span className="w-[96px] truncate text-[12px] text-text-secondary">{l.nome.replace("Aurora ", "")}</span>
                <div className="flex flex-1 gap-1">
                  {l.serie.map((v, i) => (
                    <span key={i} title={`${l.nome}, ${DIAS[i]}: ${v}`} className="h-6 flex-1 rounded-md" style={{ backgroundColor: l.cor, opacity: 0.18 + 0.82 * (v / max) }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Insight({ cor, fundo, rotulo, titulo, texto, acao, onAcao }: { cor: string; fundo: string; rotulo: string; titulo: string; texto: string; acao?: string; onAcao?: () => void }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: fundo }}>
      <p className="flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.1em]" style={{ color: cor }}>
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
        {rotulo}
      </p>
      <p className="mt-1 font-[family-name:var(--font-manrope)] text-[17px] font-medium leading-tight text-on-background">{titulo}</p>
      <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">{texto}</p>
      {acao && onAcao && (
        <button type="button" onClick={onAcao} className="mt-2.5 inline-flex min-h-[40px] items-center rounded-full bg-white px-4 text-[13px] text-on-background active:scale-[0.98]">
          {acao} →
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── Lojas ───────────────────────── */

function Lojas({ lojas, foco }: { lojas: LojaDemo[]; foco: string | null }) {
  const [metrica, setMetrica] = useState<Metrica>("visitas");
  const [aberta, setAberta] = useState<string | null>(foco);
  const entrou = useEntrou();
  const ordenadas = useMemo(() => [...lojas].sort((a, b) => b[metrica] - a[metrica]), [lojas, metrica]);
  const max = ordenadas[0][metrica];
  const m = METRICAS.find((x) => x.id === metrica)!;

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Ordenar por">
        {METRICAS.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={metrica === x.id}
            onClick={() => setMetrica(x.id)}
            className="min-h-[40px] rounded-full px-4 text-[13.5px] transition-colors"
            style={metrica === x.id ? { backgroundColor: x.cor, color: "#fff" } : { backgroundColor: x.fundo, color: x.cor }}
          >
            {x.nome}
          </button>
        ))}
      </div>

      <ol className="flex flex-col gap-2">
        {ordenadas.map((l, i) => {
          const sel = aberta === l.id;
          return (
            <li key={l.id} className={`rounded-[22px] bg-surface-white ring-1 transition-shadow ${sel || foco === l.id ? "ring-on-background" : "ring-black/[0.06]"}`}>
              <button type="button" onClick={() => setAberta(sel ? null : l.id)} aria-expanded={sel} className="flex w-full items-center gap-3 rounded-[22px] p-3.5 text-left active:opacity-80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] tabular-nums" style={{ backgroundColor: l.cor }}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[15px]">{l.nome}</span>
                    <span className="shrink-0 text-[15px] tabular-nums" style={{ color: m.cor }}>{nf(l[metrica])}</span>
                  </span>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-surface-soft">
                    <span className="block h-full origin-left rounded-full transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ width: `${(l[metrica] / max) * 100}%`, backgroundColor: l.cor, transform: entrou ? "scaleX(1)" : "scaleX(0)", transitionDelay: `${i * 40}ms` }} />
                  </span>
                </span>
                <Delta v={l.delta} />
              </button>
              <div className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${sel ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div className="px-4 pb-4">
                    <p className="text-[12.5px] text-text-secondary">{l.cidade}, {l.uf}</p>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {METRICAS.map((x) => (
                        <div key={x.id} className="rounded-xl px-2 py-2 text-center" style={{ backgroundColor: x.fundo, color: x.cor }}>
                          <p className="text-[16px] tabular-nums">{nf(l[x.id])}</p>
                          <p className="text-[10.5px] opacity-80">{x.nome}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-surface-soft px-3 py-2.5">
                      <p className="text-[12.5px] leading-snug text-text-secondary">
                        {l.delta >= 15 ? "Crescendo forte. Boa candidata para virar exemplo para a rede." : l.delta < 0 ? "Em queda. Vale reforçar a divulgação do link dessa loja." : "Estável. Uma promoção da semana pode dar um empurrão."}
                      </p>
                      <Spark dados={l.serie} cor={l.cor === "#E6E26B" || l.cor === "#B7F34A" ? "#6B8E00" : l.cor} />
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ───────────────────────── Convite e cobrança ───────────────────────── */

function Convite() {
  const [quem, setQuem] = useState<"loja" | "marca">("loja");
  const [qtd, setQtd] = useState(35);
  const [plano, setPlano] = useState<PlanoRede>("niobio");
  const [copiado, setCopiado] = useState<string | null>(null);
  const r = calcularRede(qtd, plano);
  const link = `orbibox.app/rede/${REDE_DEMO.slug}`;

  async function copiar(txt: string, id: string) {
    try {
      await navigator.clipboard.writeText(txt);
      setCopiado(id);
      setTimeout(() => setCopiado(null), 1600);
    } catch { /* sem permissão, segue */ }
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      {/* Como funciona */}
      <section className="rounded-[26px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
        <p className="text-[15px]">Como funciona</p>
        <ol className="mt-3 flex flex-col gap-3">
          {[
            ["#B7F34A", "Você compartilha o convite", "Cada loja recebe o seu link e o código da marca."],
            ["#6EE7D8", "A loja cria o Orbibox e aceita entrar", "Ela decide, na hora, compartilhar os números com a rede."],
            ["#C3A6FF", "Os números aparecem aqui", "Visitas, toques, conversas e vouchers de todas as lojas, num painel só."],
          ].map(([cor, t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px]" style={{ backgroundColor: cor }}>{i + 1}</span>
              <span>
                <span className="block text-[14.5px]">{t}</span>
                <span className="block text-[13px] leading-snug text-text-secondary">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Convite */}
      <section className="relative overflow-hidden rounded-[26px] bg-[#111318] p-5 text-white">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full orbi-gradient opacity-30 blur-3xl" aria-hidden />
        <p className="relative text-[12px] uppercase tracking-[0.12em] text-white/55">Seu convite</p>
        <div className="relative mt-3 flex items-center gap-2 rounded-2xl bg-white/10 py-2 pl-4 pr-2">
          <span className="min-w-0 flex-1 truncate text-[14px]">{link}</span>
          <button type="button" onClick={() => copiar(`https://${link}`, "link")} className="min-h-[40px] shrink-0 rounded-full bg-white px-4 text-[13px] text-on-background active:scale-[0.98]">{copiado === "link" ? "Copiado" : "Copiar"}</button>
        </div>
        <div className="relative mt-2 flex items-center gap-2 rounded-2xl bg-white/10 py-2 pl-4 pr-2">
          <span className="text-[12px] text-white/55">Código</span>
          <span className="min-w-0 flex-1 truncate text-[15px] tracking-[0.08em]">{REDE_DEMO.codigo}</span>
          <button type="button" onClick={() => copiar(REDE_DEMO.codigo, "cod")} className="min-h-[40px] shrink-0 rounded-full bg-white px-4 text-[13px] text-on-background active:scale-[0.98]">{copiado === "cod" ? "Copiado" : "Copiar"}</button>
        </div>
        <p className="relative mt-3 text-[12.5px] leading-snug text-white/60">Todo Orbibox novo que entrar com o link e o código aparece na sua rede.</p>
      </section>

      {/* Privacidade */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[22px] bg-[#EAFBC4] p-4 text-[#2F6B00]">
          <p className="text-[13px]">A marca vê</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-snug">
            {["Visitas e toques", "Quantas conversas a Orbi teve", "Vouchers resgatados", "Ranking entre as lojas"].map((t) => <li key={t} className="flex gap-1.5"><Marca ok />{t}</li>)}
          </ul>
        </div>
        <div className="rounded-[22px] bg-[#FFE6E3] p-4 text-[#A63A2E]">
          <p className="text-[13px]">A marca nunca vê</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-snug">
            {["O texto das conversas", "Nome e contato dos clientes", "Dados de pagamento da loja"].map((t) => <li key={t} className="flex gap-1.5"><Marca />{t}</li>)}
          </ul>
        </div>
      </section>

      {/* Cobrança */}
      <section className="rounded-[26px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
        <p className="text-[15px]">Quem paga o plano das lojas?</p>
        <p className="mt-0.5 text-[12.5px] text-text-secondary">Você escolhe o modelo da sua rede. Dá para mudar depois.</p>
        <div className="mt-4 flex flex-col gap-2.5" role="radiogroup" aria-label="Quem paga">
          <Opcao sel={quem === "loja"} onClick={() => setQuem("loja")} titulo="Cada loja paga a sua" texto="A loja cria a conta pelo seu link, escolhe Titânio ou Nióbio e paga no próprio cartão. A marca não recebe cobrança e acompanha tudo no painel." />
          <Opcao sel={quem === "marca"} onClick={() => setQuem("marca")} titulo="A marca paga todas" texto="Cada loja que entrar na rede já nasce com o plano ativo, sem precisar de cartão. A cobrança de todas vem para você, e quanto maior a rede, maior o desconto." destaque="Desconto por volume" />
        </div>

        {quem === "marca" && (
          <div className="mt-4 rounded-[22px] bg-[#F4F1FF] p-4">
            <p className="text-[14px]">Simule o valor da sua rede</p>
            <div className="mt-3 flex gap-1.5 rounded-full bg-white/70 p-1" role="group" aria-label="Plano">
              {(["titanio", "niobio"] as const).map((p) => (
                <button key={p} type="button" aria-pressed={plano === p} onClick={() => setPlano(p)} className={`min-h-[40px] flex-1 rounded-full text-[13.5px] ${plano === p ? "bg-on-background text-white" : "text-text-secondary"}`}>
                  {NOME_PLANO[p]} {brl(PRECO_MENSAL[p])}
                </button>
              ))}
            </div>
            <label className="mt-4 block">
              <span className="flex items-baseline justify-between">
                <span className="text-[13px] text-text-secondary">Número de lojas</span>
                <span className="font-[family-name:var(--font-manrope)] text-[24px] tabular-nums">{qtd}</span>
              </span>
              <input type="range" min={1} max={150} value={qtd} onChange={(e) => setQtd(Number(e.target.value))} className="mt-2 h-8 w-full accent-[#6A3FC4]" aria-label="Número de lojas" />
            </label>
            <div className="mt-3 rounded-2xl bg-white p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[12.5px] text-text-secondary">Total por mês</p>
                {r.desconto > 0 && <span className="rounded-full bg-[#E3F9C9] px-2.5 py-0.5 text-[12px] text-[#2B6B00]">{r.desconto}% de desconto</span>}
              </div>
              <p className="mt-1 font-[family-name:var(--font-manrope)] text-[34px] font-medium leading-none tabular-nums">{brl(r.total)}</p>
              <p className="mt-2 text-[13px] text-text-secondary">{brl(r.porLoja)} por loja{r.economia > 0 ? `, você economiza ${brl(r.economia)} por mês` : ""}.</p>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5">
              {FAIXAS.map((f) => {
                const ativa = descontoPara(qtd) === f.desconto;
                return (
                  <li key={f.de} className={`flex items-center justify-between rounded-xl px-3 py-2 text-[13px] ${ativa ? "bg-on-background text-white" : "bg-white/70 text-text-secondary"}`}>
                    <span>{f.ate === null ? `Acima de 100 lojas` : f.de === 1 ? "Até 20 lojas" : "De 21 a 100 lojas"}</span>
                    <span>{f.desconto === 0 ? "Preço normal" : `${f.desconto}% de desconto`}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[12.5px] leading-snug text-text-secondary">O desconto vale para todas as lojas assim que a rede passa da faixa. A cobrança vem numa fatura só, no seu cartão.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Opcao({ sel, onClick, titulo, texto, destaque }: { sel: boolean; onClick: () => void; titulo: string; texto: string; destaque?: string }) {
  return (
    <button type="button" role="radio" aria-checked={sel} onClick={onClick} className={`flex w-full items-start gap-3 rounded-[20px] border px-4 py-3.5 text-left transition-colors ${sel ? "border-on-background bg-surface-white shadow-[0_1px_4px_rgba(17,19,24,0.06)]" : "border-divider bg-surface-soft"}`}>
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${sel ? "border-on-background bg-on-background" : "border-text-tertiary"}`} aria-hidden>
        {sel && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px]">{titulo}</span>
          {destaque && <span className="rounded-full bg-[#EBE0FF] px-2 py-0.5 text-[11px] text-[#6A3FC4]">{destaque}</span>}
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-text-secondary">{texto}</span>
      </span>
    </button>
  );
}

function Marca({ ok = false }: { ok?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden>
      {ok ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6 6l12 12M18 6L6 18" />}
    </svg>
  );
}
