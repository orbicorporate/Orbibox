"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { numeroWa } from "@/lib/whatsapp";
import { MAX_CONVITES, STATUS_CONVITE, type LinhaLida, formatarCodigo, lerLista, linkConvite, mascararWhatsapp, mensagemConvite, paraCsv } from "@/lib/convites";
import { voucherTheme } from "@/lib/voucherThemes";

type Convite = {
  id: string; codigo: string; nome: string | null; whatsapp: string | null; status: string; tentativas: number;
  redemption_code: string | null; ativado_em: string | null; usado_em: string | null; created_at: string;
};
type Verificacao = "nenhuma" | "numero" | "codigo";

const PLURAL: Record<string, string> = { pendente: "Aguardando", ativado: "Liberados", usado: "Usados", bloqueado: "Bloqueados", cancelado: "Cancelados" };

const MODOS: { v: Verificacao; t: string; d: string; tag?: string }[] = [
  { v: "numero", t: "Código e WhatsApp da lista", d: "A pessoa digita o número em que recebeu o convite. Se repassar o link, o amigo não consegue liberar.", tag: "Recomendado" },
  { v: "codigo", t: "Código enviado por WhatsApp", d: "Mais seguro: enviamos 6 números para o WhatsApp da lista e a pessoa confirma. Precisa do envio por WhatsApp ativo na conta." },
  { v: "nenhuma", t: "Só o código", d: "Sem lista de números. O primeiro aparelho que abrir fica com o voucher." },
];

function dia(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "";
}

export function ConvitesPanel({
  voucherId, voucherTitulo, negocioNome, slug, cor, verificacaoInicial, onVerificacao,
}: {
  voucherId: string; voucherTitulo: string; negocioNome: string; slug: string; cor: string;
  verificacaoInicial: string; onVerificacao: (v: Verificacao) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const tema = voucherTheme(cor);
  const acento = tema.ctaText;
  const [lista, setLista] = useState<Convite[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [verificacao, setVerificacao] = useState<Verificacao>((verificacaoInicial as Verificacao) || "numero");
  const [colar, setColar] = useState("");
  const [gerar, setGerar] = useState("");
  const [aba, setAba] = useState<"lista" | "novos">("lista");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const base = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("voucher_convites")
      .select("id, codigo, nome, whatsapp, status, tentativas, redemption_code, ativado_em, usado_em, created_at")
      .eq("voucher_id", voucherId)
      .order("created_at", { ascending: true })
      .limit(1000);
    setLista((data ?? []) as Convite[]);
    setCarregando(false);
  }, [supabase, voucherId]);

  useEffect(() => {
    let vivo = true;
    supabase
      .from("voucher_convites")
      .select("id, codigo, nome, whatsapp, status, tentativas, redemption_code, ativado_em, usado_em, created_at")
      .eq("voucher_id", voucherId)
      .order("created_at", { ascending: true })
      .limit(1000)
      .then(({ data }) => {
        if (!vivo) return;
        setLista((data ?? []) as Convite[]);
        setCarregando(false);
      });
    return () => { vivo = false; };
  }, [supabase, voucherId]);

  const leitura = useMemo(() => {
    const todas: LinhaLida[] = lerLista(colar);
    return { itens: todas.filter((l) => !l.erro).map((l) => ({ nome: l.nome, whatsapp: l.whatsapp })), erros: todas.map((l, i) => ({ linha: i + 1, motivo: l.erro })).filter((e) => e.motivo) as { linha: number; motivo: "numero_invalido" | "repetido" | "vazia" }[] };
  }, [colar]);
  const contagem = useMemo(() => {
    const c: Record<string, number> = { pendente: 0, ativado: 0, usado: 0, bloqueado: 0, cancelado: 0 };
    for (const i of lista) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [lista]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter((i) => {
      if (filtro !== "todos" && i.status !== filtro) return false;
      if (!q) return true;
      return (i.nome ?? "").toLowerCase().includes(q) || (i.whatsapp ?? "").includes(q.replace(/\D/g, "") || "§") || i.codigo.toLowerCase().includes(q.replace(/-/g, ""));
    });
  }, [lista, busca, filtro]);

  async function trocarModo(v: Verificacao) {
    setVerificacao(v);
    const { error } = await supabase.from("vouchers").update({ verificacao: v }).eq("id", voucherId);
    if (error) { setAviso({ tipo: "erro", texto: "Não consegui salvar a forma de confirmação. Tente de novo." }); return; }
    onVerificacao(v);
  }

  async function criar(itens: { nome: string | null; whatsapp: string | null }[], n: number) {
    setOcupado(true); setAviso(null);
    try {
      const r = await fetch("/api/convites/criar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voucherId, itens, gerar: n }) });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setAviso({ tipo: "erro", texto: j.erro === "voucher_nao_privado" ? "Deixe o voucher como privado antes de criar convites." : "Não consegui criar os convites. Confira a internet e tente de novo." });
        return;
      }
      const criados = Number(j.criados ?? 0);
      setAviso({ tipo: "ok", texto: criados > 0 ? `${criados} ${criados === 1 ? "convite criado" : "convites criados"}.` : "Nenhum convite novo. Os números já estavam na lista." });
      setColar(""); setGerar(""); setAba("lista");
      await carregar();
    } catch {
      setAviso({ tipo: "erro", texto: "Sem conexão. Tente de novo." });
    } finally {
      setOcupado(false);
    }
  }

  async function acao(c: Convite, a: "liberar" | "cancelar") {
    if (a === "cancelar" && !window.confirm(`Cancelar o convite de ${c.nome || "esta pessoa"}? A vaga volta para o voucher.`)) return;
    setOcupado(true); setAviso(null);
    const r = await fetch("/api/convites/acao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conviteId: c.id, acao: a }) });
    const j = await r.json().catch(() => ({}));
    setOcupado(false);
    if (!r.ok || j.ok === false) { setAviso({ tipo: "erro", texto: "Não consegui fazer isso agora. Tente de novo." }); return; }
    setAviso({ tipo: "ok", texto: a === "liberar" ? "Pronto, a pessoa pode usar o link de novo." : "Convite cancelado." });
    await carregar();
  }

  async function copiar(chave: string, txt: string) {
    try { await navigator.clipboard.writeText(txt); setCopiado(chave); setTimeout(() => setCopiado(null), 1600); } catch { /* sem clipboard */ }
  }

  const link = (c: Convite) => linkConvite(base, slug, voucherId, c.codigo);
  const mensagem = (c: Convite) => mensagemConvite({ nome: c.nome, nomeNegocio: negocioNome, titulo: voucherTitulo, link: link(c) });

  function baixarCsv() {
    const blob = new Blob([paraCsv(lista.map((i) => ({ nome: i.nome, whatsapp: i.whatsapp, codigo: i.codigo, link: link(i), status: STATUS_CONVITE[i.status as keyof typeof STATUS_CONVITE]?.rotulo ?? i.status })))], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "convites.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  const chip = "min-h-[44px] rounded-full px-4 text-[13.5px] font-semibold transition-colors";

  return (
    <section aria-label="Convites" className="mt-6">
      <div className="rounded-[26px] border p-5" style={{ borderColor: `${acento}33`, backgroundImage: `linear-gradient(160deg, ${acento}12 0%, transparent 60%)` }}>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl text-white" style={{ backgroundColor: acento }} aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" /></svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold leading-tight">Convites do voucher</h2>
            <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">Cada pessoa recebe um link com código próprio. Vale uma vez só.</p>
          </div>
        </div>

        {/* Resumo */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {(["pendente", "ativado", "usado", "bloqueado"] as const).map((s) => (
            <button key={s} type="button" onClick={() => { setFiltro(filtro === s ? "todos" : s); setAba("lista"); }} aria-pressed={filtro === s}
              className="min-h-[64px] rounded-2xl p-3 text-left transition-transform active:scale-[0.98]"
              style={{ backgroundColor: STATUS_CONVITE[s].fundo, outline: filtro === s ? `2px solid ${STATUS_CONVITE[s as "pendente"].cor}` : "none" }}>
              <span className="block text-[22px] font-bold leading-none" style={{ color: STATUS_CONVITE[s as "pendente"].cor }}>{contagem[s] ?? 0}</span>
              <span className="mt-1 block text-[12px] font-medium" style={{ color: STATUS_CONVITE[s as "pendente"].cor }}>{PLURAL[s]}</span>
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-[12.5px] text-text-tertiary">{lista.length} de {MAX_CONVITES} convites possíveis neste voucher.</p>

        {aviso && (
          <p role="status" className={`mt-3 rounded-2xl px-4 py-3 text-[13.5px] font-medium ${aviso.tipo === "ok" ? "bg-[#DEF3E3] text-[#17753A]" : "bg-[#FCE4E1] text-[#8C1D18]"}`}>{aviso.texto}</p>
        )}

        {/* Abas */}
        <div className="mt-4 flex gap-2" role="tablist" aria-label="Convites">
          {([["lista", `Convidados (${lista.length})`], ["novos", "Adicionar pessoas"]] as const).map(([k, t]) => (
            <button key={k} role="tab" aria-selected={aba === k} type="button" onClick={() => setAba(k)} className={chip}
              style={aba === k ? { backgroundColor: acento, color: "#fff" } : { backgroundColor: "#F1F2F4", color: "#4B5059" }}>{t}</button>
          ))}
        </div>

        {aba === "novos" && (
          <div className="mt-4">
            <p className="text-[14px] font-semibold">Como conferir quem é a pessoa</p>
            <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label="Forma de confirmação">
              {MODOS.map((m) => (
                <button key={m.v} type="button" role="radio" aria-checked={verificacao === m.v} onClick={() => trocarModo(m.v)}
                  className="min-h-[56px] rounded-2xl border-2 p-3.5 text-left transition-colors"
                  style={{ borderColor: verificacao === m.v ? acento : "#E4E6EA", backgroundColor: verificacao === m.v ? `${acento}0F` : "#fff" }}>
                  <span className="flex items-center gap-2 text-[14.5px] font-semibold">
                    <span className="grid h-5 w-5 flex-none place-items-center rounded-full border-2" style={{ borderColor: verificacao === m.v ? acento : "#C5C8CE" }}>
                      {verificacao === m.v && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: acento }} />}
                    </span>
                    {m.t}
                    {m.tag && <span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase" style={{ backgroundColor: `${acento}1F`, color: acento }}>{m.tag}</span>}
                  </span>
                  <span className="mt-1 block pl-7 text-[12.5px] leading-snug text-text-secondary">{m.d}</span>
                </button>
              ))}
            </div>

            <label htmlFor="colar" className="mt-5 block text-[14px] font-semibold">Cole sua lista</label>
            <p className="mt-0.5 text-[12.5px] leading-snug text-text-secondary">Uma pessoa por linha: nome, número com DDD. Pode colar direto de uma planilha. Exemplo: Maria Souza, (15) 99999-7777</p>
            <textarea id="colar" value={colar} onChange={(e) => setColar(e.target.value)} rows={6} placeholder={"Maria Souza, (15) 99999-7777\nJoão Lima, 11988887777"}
              className="mt-2 w-full rounded-2xl border-2 border-divider bg-white p-3.5 text-[14.5px] outline-none focus:border-on-background" />
            {colar.trim() && (
              <div className="mt-2 rounded-2xl bg-surface-soft p-3.5 text-[13px] leading-relaxed">
                <p className="font-semibold">{leitura.itens.length} {leitura.itens.length === 1 ? "pessoa pronta" : "pessoas prontas"} para convidar</p>
                {leitura.erros.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 text-[#8C1D18]">
                    {leitura.erros.slice(0, 5).map((e) => (
                      <li key={e.linha}>Linha {e.linha}: {e.motivo === "numero_invalido" ? "número com problema" : e.motivo === "repetido" ? "número repetido" : "linha vazia"}</li>
                    ))}
                    {leitura.erros.length > 5 && <li>e mais {leitura.erros.length - 5} linhas com problema.</li>}
                  </ul>
                )}
              </div>
            )}
            <button type="button" disabled={ocupado || leitura.itens.length === 0} onClick={() => criar(leitura.itens, 0)}
              className="mt-3 min-h-[52px] w-full rounded-full text-[15px] font-bold text-white disabled:opacity-50" style={{ backgroundColor: acento }}>
              {ocupado ? "Criando…" : leitura.itens.length > 0 ? `Criar ${leitura.itens.length} ${leitura.itens.length === 1 ? "convite" : "convites"}` : "Criar convites"}
            </button>

            <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-divider" /><span className="text-[12px] text-text-tertiary">ou</span><span className="h-px flex-1 bg-divider" /></div>

            <label htmlFor="gerar" className="block text-[14px] font-semibold">Gerar códigos sem lista</label>
            <p className="mt-0.5 text-[12.5px] leading-snug text-text-secondary">Para quando você ainda não tem os números. Cada código vale para uma pessoa.</p>
            <div className="mt-2 flex gap-2">
              <input id="gerar" value={gerar} onChange={(e) => setGerar(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="Quantos?"
                className="min-h-[52px] w-full rounded-2xl border-2 border-divider bg-white px-4 text-[16px] outline-none focus:border-on-background" />
              <button type="button" disabled={ocupado || !Number(gerar)} onClick={() => criar([], Number(gerar))}
                className="min-h-[52px] flex-none rounded-full px-6 text-[14.5px] font-bold text-white disabled:opacity-50" style={{ backgroundColor: acento }}>Gerar</button>
            </div>
          </div>
        )}

        {aba === "lista" && (
          <div className="mt-4">
            {carregando ? (
              <p className="py-6 text-center text-[13.5px] text-text-tertiary" role="status">Carregando convites…</p>
            ) : lista.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-divider p-6 text-center">
                <p className="text-[15px] font-semibold">Nenhum convite ainda</p>
                <p className="mx-auto mt-1 max-w-[280px] text-[13px] leading-snug text-text-secondary">Adicione as pessoas que podem usar este voucher. Cada uma recebe um link só dela.</p>
                <button type="button" onClick={() => setAba("novos")} className="mt-4 min-h-[48px] rounded-full px-6 text-[14.5px] font-bold text-white" style={{ backgroundColor: acento }}>Adicionar pessoas</button>
              </div>
            ) : (
              <>
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, número ou código" aria-label="Buscar convite"
                  className="min-h-[48px] w-full rounded-2xl border border-divider bg-white px-4 text-[14px] outline-none focus:border-on-background" />
                <div className="no-scrollbar -mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-1">
                  {["todos", "pendente", "ativado", "usado", "bloqueado", "cancelado"].map((s) => (
                    <button key={s} type="button" onClick={() => setFiltro(s)} aria-pressed={filtro === s}
                      className="min-h-[40px] flex-none rounded-full px-3.5 text-[13px] font-medium"
                      style={filtro === s ? { backgroundColor: acento, color: "#fff" } : { backgroundColor: "#F1F2F4", color: "#4B5059" }}>
                      {s === "todos" ? "Todos" : PLURAL[s]}
                    </button>
                  ))}
                </div>

                <ul className="mt-3 flex flex-col gap-2.5">
                  {visiveis.length === 0 && <li className="py-5 text-center text-[13.5px] text-text-tertiary">Ninguém encontrado com esse filtro.</li>}
                  {visiveis.map((c) => {
                    const st = STATUS_CONVITE[c.status as keyof typeof STATUS_CONVITE] ?? STATUS_CONVITE.pendente;
                    const wa = c.whatsapp ? `https://wa.me/${numeroWa(c.whatsapp)}?text=${encodeURIComponent(mensagem(c))}` : null;
                    const ativo = c.status === "pendente" || c.status === "ativado";
                    return (
                      <li key={c.id} className="rounded-[20px] border border-divider bg-surface-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold">{c.nome || "Sem nome"}</p>
                            <p className="mt-0.5 text-[12.5px] text-text-tertiary">
                              {c.whatsapp ? mascararWhatsapp(c.whatsapp) : "Sem número"} · <span className="font-mono tracking-wider">{formatarCodigo(c.codigo)}</span>
                            </p>
                          </div>
                          <span className="flex-none rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ backgroundColor: st.fundo, color: st.cor }}>{st.rotulo}</span>
                        </div>
                        {(c.ativado_em || c.usado_em || c.tentativas > 0) && (
                          <p className="mt-1.5 text-[12px] text-text-secondary">
                            {c.usado_em ? `Usado em ${dia(c.usado_em)}` : c.ativado_em ? `Liberado em ${dia(c.ativado_em)}` : ""}
                            {c.tentativas > 0 && c.status !== "usado" ? `${c.ativado_em ? " · " : ""}${c.tentativas} ${c.tentativas === 1 ? "erro" : "erros"} de código` : ""}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {ativo && wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#DEF3E3] px-4 text-[13px] font-semibold text-[#17753A]">Enviar no WhatsApp</a>
                          )}
                          {ativo && (
                            <button type="button" onClick={() => copiar(c.id, link(c))} className="min-h-[44px] rounded-full bg-surface-soft px-4 text-[13px] font-semibold text-text-secondary">
                              {copiado === c.id ? "Link copiado" : "Copiar link"}
                            </button>
                          )}
                          {(c.status === "bloqueado" || c.status === "ativado") && (
                            <button type="button" disabled={ocupado} onClick={() => acao(c, "liberar")} className="min-h-[44px] rounded-full px-4 text-[13px] font-semibold" style={{ backgroundColor: `${acento}16`, color: acento }}>
                              {c.status === "bloqueado" ? "Desbloquear" : "Liberar outro aparelho"}
                            </button>
                          )}
                          {ativo || c.status === "bloqueado" ? (
                            <button type="button" disabled={ocupado} onClick={() => acao(c, "cancelar")} className="min-h-[44px] rounded-full bg-[#FDECEE] px-4 text-[13px] font-semibold text-[#B4321F]">Cancelar</button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <button type="button" onClick={baixarCsv} className="mt-4 min-h-[48px] w-full rounded-full border border-divider bg-white text-[14px] font-semibold">Baixar lista (CSV)</button>
              </>
            )}
          </div>
        )}
      </div>
          </section>
  );
}
