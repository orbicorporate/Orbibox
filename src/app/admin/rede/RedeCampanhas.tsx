"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

// As funções da rede ainda não estão nos tipos gerados do banco, por isso o cliente sem tipos.
function cliente() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

type Linha = {
  page_id: string; page_title: string; page_ativa: boolean;
  campaign_id: string | null; title: string | null; description: string | null; discount_type: string | null; discount_value: number | null; image_url: string | null; aceitar_ate: string | null; is_active: boolean | null;
  business_id: string | null; loja: string | null; aceitou: boolean | null; quantidade: number | null; voucher_id: string | null; voucher_ativo: boolean | null; emitidos: number | null; resgatados: number | null;
};
type Campanha = { id: string; title: string; description: string | null; tipo: string; valor: number; aceitarAte: string | null; parceiros: Linha[] };
type Pagina = { id: string; titulo: string; ativa: boolean; campanhas: Campanha[] };

export function rotuloDesconto(tipo: string | null, valor: number | null) {
  const v = Number(valor ?? 0);
  if (tipo === "percent") return `${v}% de desconto`;
  if (tipo === "fixed") return `R$ ${v.toLocaleString("pt-BR")} de desconto`;
  return "Brinde";
}

const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background";
const cereja = "bg-[linear-gradient(110deg,#A80F28,#C4122F_50%,#E4264C)] text-white shadow-[0_8px_18px_-10px_rgba(196,18,47,0.9)]";

function agrupar(linhas: Linha[]): Pagina[] {
  const paginas = new Map<string, Pagina>();
  for (const l of linhas) {
    let p = paginas.get(l.page_id);
    if (!p) { p = { id: l.page_id, titulo: l.page_title, ativa: l.page_ativa, campanhas: [] }; paginas.set(l.page_id, p); }
    if (!l.campaign_id) continue;
    let c = p.campanhas.find((x) => x.id === l.campaign_id);
    if (!c) { c = { id: l.campaign_id, title: l.title ?? "", description: l.description, tipo: l.discount_type ?? "percent", valor: Number(l.discount_value ?? 0), aceitarAte: l.aceitar_ate, parceiros: [] }; p.campanhas.push(c); }
    if (l.business_id) c.parceiros.push(l);
  }
  return [...paginas.values()];
}

/**
 * Campanhas da rede: o dono monta uma página com um ou vários vouchers, compartilha o link no WhatsApp
 * e cada parceiro aceita os que quiser, escolhendo quantos vouchers distribuir. Depois de aceito,
 * o voucher é do negócio do parceiro, que pausa ou encerra por conta própria.
 */
export function RedeCampanhas() {
  const [redeId, setRedeId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [novaPagina, setNovaPagina] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const [addEm, setAddEm] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const carregar = useCallback(async (id: string) => {
    const { data, error } = await cliente().rpc("listar_campanhas_da_rede", { p_network_id: id });
    if (!error && Array.isArray(data)) setPaginas(agrupar(data as Linha[]));
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await cliente().from("networks").select("id").maybeSingle();
      if (!vivo) return;
      if (data) { setRedeId((data as { id: string }).id); await carregar((data as { id: string }).id); }
      if (vivo) setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [carregar]);

  const link = (id: string) => `${typeof window !== "undefined" ? window.location.origin : "https://orbibox.app"}/admin/rede/campanhas/${id}`;

  async function criarPagina() {
    if (!redeId || !titulo.trim()) return;
    setOcupado(true); setErro(null);
    const { data, error } = await cliente().rpc("criar_pagina_campanhas_rede", { p_network_id: redeId, p_title: titulo, p_description: descricao });
    setOcupado(false);
    if (error || !data) { setErro("Não consegui criar a página agora. Tente de novo."); return; }
    setTitulo(""); setDescricao(""); setNovaPagina(false);
    await carregar(redeId);
    setAberta(data as string); setAddEm(data as string);
  }

  async function alternar(p: Pagina) {
    if (!redeId) return;
    await cliente().rpc("alternar_pagina_campanhas_rede", { p_page_id: p.id, p_ativa: !p.ativa });
    await carregar(redeId);
  }

  async function compartilhar(p: Pagina) {
    const texto = `Campanhas da rede: ${p.titulo}. Toque para escolher as que você quer ativar no seu Orbibox: ${link(p.id)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  }
  async function copiar(p: Pagina) {
    try { await navigator.clipboard.writeText(link(p.id)); setCopiado(p.id); setTimeout(() => setCopiado(null), 1800); } catch { /* sem permissão da área de transferência */ }
  }

  if (carregando || !redeId) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-[family-name:var(--font-manrope)] text-[22px] font-medium leading-tight">Campanhas da rede</h2>
          <p className="mt-0.5 text-[13.5px] text-text-secondary">Monte uma página com vouchers e compartilhe. Cada parceiro aceita os que quiser.</p>
        </div>
        {!novaPagina && (
          <button type="button" onClick={() => setNovaPagina(true)} className={`min-h-[44px] shrink-0 rounded-full px-5 text-[14px] font-semibold active:scale-[0.97] ${cereja}`}>Nova página</button>
        )}
      </div>

      {novaPagina && (
        <div className="orbi-linha-entra mt-4 rounded-[22px] bg-surface-white p-4 shadow-[0_6px_24px_-14px_rgba(17,19,24,0.3)]">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nome da página (ex: Campanhas de Natal)" className={campo} />
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Recado para os parceiros (opcional)" rows={2} className={`${campo} mt-2`} />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={criarPagina} disabled={ocupado || !titulo.trim()} className={`min-h-[44px] flex-1 rounded-full text-[14px] font-semibold disabled:opacity-50 ${cereja}`}>{ocupado ? "Criando..." : "Criar e adicionar vouchers"}</button>
            <button type="button" onClick={() => setNovaPagina(false)} className="min-h-[44px] rounded-full bg-surface-soft px-5 text-[14px] text-text-secondary">Cancelar</button>
          </div>
        </div>
      )}
      {erro && <p className="mt-3 rounded-2xl bg-[#FFF6DB] px-3.5 py-2 text-[13px] text-[#6B4A00]">{erro}</p>}

      {paginas.length === 0 && !novaPagina && (
        <p className="mt-4 rounded-[22px] bg-surface-soft px-4 py-5 text-[14px] text-text-secondary">Nenhuma página ainda. Crie uma, adicione os vouchers e mande o link no WhatsApp para a rede.</p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {paginas.map((p) => {
          const vinculados = new Set(p.campanhas.flatMap((c) => c.parceiros.map((x) => x.business_id))).size;
          const aberto = aberta === p.id;
          return (
            <div key={p.id} className="rounded-[22px] bg-surface-white p-4 shadow-[0_6px_24px_-14px_rgba(17,19,24,0.3)]">
              <button type="button" onClick={() => setAberta(aberto ? null : p.id)} className="flex w-full items-center gap-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-medium">{p.titulo}</span>
                  <span className="block text-[13px] text-text-tertiary">{p.campanhas.length} {p.campanhas.length === 1 ? "voucher" : "vouchers"}{vinculados > 0 ? ` · ${vinculados} parceiros na rede` : ""}{p.ativa ? "" : " · pausada"}</span>
                </span>
                <span aria-hidden className="text-text-tertiary">{aberto ? "−" : "+"}</span>
              </button>

              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => compartilhar(p)} disabled={p.campanhas.length === 0} className={`min-h-[44px] flex-1 rounded-full text-[14px] font-semibold disabled:opacity-50 ${cereja}`}>Compartilhar no WhatsApp</button>
                <button type="button" onClick={() => copiar(p)} className="min-h-[44px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium">{copiado === p.id ? "Copiado" : "Copiar link"}</button>
              </div>

              {aberto && (
                <div className="orbi-linha-entra mt-4 flex flex-col gap-3">
                  {p.campanhas.map((c) => {
                    const aceitaram = c.parceiros.filter((x) => x.aceitou).length;
                    return (
                      <div key={c.id} className="rounded-2xl bg-surface-soft p-3.5">
                        <p className="text-[14.5px] font-medium">{c.title}</p>
                        <p className="text-[13px] text-text-secondary">{rotuloDesconto(c.tipo, c.valor)}{c.aceitarAte ? ` · aceitar até ${new Date(c.aceitarAte).toLocaleDateString("pt-BR")}` : ""}</p>
                        <p className="mt-2 text-[13px] text-text-tertiary">{aceitaram} de {c.parceiros.length} aceitaram</p>
                        <ul className="mt-2 flex flex-col gap-1.5">
                          {c.parceiros.map((x) => (
                            <li key={x.business_id!} className="flex items-center gap-2 text-[13px]">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${x.aceitou ? (x.voucher_ativo ? "bg-[#1F9E4C]" : "bg-[#C9A227]") : "bg-black/20"}`} aria-hidden />
                              <span className="min-w-0 flex-1 truncate">{x.loja}</span>
                              <span className="shrink-0 text-text-tertiary">
                                {x.aceitou ? `${x.quantidade} vouchers · ${x.emitidos ?? 0} pegos · ${x.resgatados ?? 0} usados${x.voucher_ativo ? "" : " · pausado"}` : "ainda não aceitou"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}

                  {addEm === p.id ? (
                    <NovoVoucher paginaId={p.id} aoSalvar={async () => { setAddEm(null); if (redeId) await carregar(redeId); }} aoCancelar={() => setAddEm(null)} />
                  ) : (
                    <button type="button" onClick={() => setAddEm(p.id)} className="min-h-[44px] rounded-full border border-divider text-[14px] font-medium">+ Adicionar voucher</button>
                  )}

                  <button type="button" onClick={() => alternar(p)} className="self-start text-[13px] text-text-tertiary underline underline-offset-2">{p.ativa ? "Pausar esta página (ninguém novo consegue aceitar)" : "Reativar esta página"}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NovoVoucher({ paginaId, aoSalvar, aoCancelar }: { paginaId: string; aoSalvar: () => void; aoCancelar: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"percent" | "fixed" | "gift">("percent");
  const [valor, setValor] = useState("");
  const [horas, setHoras] = useState("");
  const [ate, setAte] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const pronto = useMemo(() => titulo.trim() && (tipo === "gift" || Number(valor.replace(",", ".")) > 0), [titulo, tipo, valor]);

  async function salvar() {
    if (!pronto) return;
    setOcupado(true); setErro(null);
    const { error } = await cliente().rpc("criar_campanha_rede", {
      p_page_id: paginaId, p_title: titulo, p_description: descricao, p_discount_type: tipo,
      p_discount_value: tipo === "gift" ? 0 : Number(valor.replace(",", ".")),
      p_image_url: null, p_expires_hours: horas ? Number(horas) : null, p_aceitar_ate: ate ? new Date(`${ate}T23:59:59`).toISOString() : null,
    });
    setOcupado(false);
    if (error) { setErro("Não consegui salvar agora. Tente de novo."); return; }
    aoSalvar();
  }

  return (
    <div className="orbi-linha-entra rounded-2xl border border-divider p-3.5">
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nome do voucher (ex: Sundae em dobro)" className={campo} />
      <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Regras e detalhes (opcional)" rows={2} className={`${campo} mt-2`} />
      <div className="mt-2 flex gap-1.5">
        {([["percent", "Porcentagem"], ["fixed", "Valor em R$"], ["gift", "Brinde"]] as const).map(([k, r]) => (
          <button key={k} type="button" onClick={() => setTipo(k)} className={`min-h-[40px] flex-1 rounded-full text-[13px] ${tipo === k ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{r}</button>
        ))}
      </div>
      {tipo !== "gift" && <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={tipo === "percent" ? "Quantos % de desconto" : "Quantos reais de desconto"} className={`${campo} mt-2`} />}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input inputMode="numeric" value={horas} onChange={(e) => setHoras(e.target.value.replace(/\D/g, ""))} placeholder="Validade (horas)" className={campo} />
        <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} aria-label="Aceitar até" className={campo} />
      </div>
      <p className="mt-1.5 text-[12px] text-text-tertiary">Validade: por quantas horas o voucher vale depois de pego. Data: último dia para os parceiros aceitarem.</p>
      {erro && <p className="mt-2 text-[13px] text-[#C4122F]">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={salvar} disabled={ocupado || !pronto} className={`min-h-[44px] flex-1 rounded-full text-[14px] font-semibold disabled:opacity-50 ${cereja}`}>{ocupado ? "Salvando..." : "Salvar voucher"}</button>
        <button type="button" onClick={aoCancelar} className="min-h-[44px] rounded-full bg-surface-soft px-5 text-[14px] text-text-secondary">Cancelar</button>
      </div>
    </div>
  );
}
