"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  aceitarWhatsapp, atualizarPerfil, confirmarCodigo, confirmarVinculo, curtirMarca, deixarDeSerFa, enviarAvaliacao, enviarCodigoWhatsapp,
  entrarComGoogle, getAvaliacoes, getContatos, getEu, getFas, getMarcasDoFa, getResumo, normalizarTelefone, pedirRevisao, responderAvaliacao,
  sairDoClube, vincularTelefone, virarFa,
  type Avaliacao, type ContatoWhats, type Eu, type FaLite, type MarcaDoFa, type Resumo,
} from "@/lib/clube";
import { OrbiAvatar, lerEsfera } from "@/components/orbi/OrbiAvatar";
import { Cabecalho, Estrela, Folha, IcBalao, IcChev, IcCoracao, Orbita, Rosto, useReduzido, type ItemOrbita } from "./pecas";

type Pendente = "fa" | "curtir" | "avaliar";
type Aberta = { tipo: "avaliacoes" | "fas" | "entrar"; origem: DOMRect | null; modo?: "entrar" | "vincular" } | null;

const GRAD_NOTA: Record<number, string> = { 5: "var(--cl-teal)", 4: "var(--cl-lime)", 3: "var(--cl-orange)", 2: "var(--cl-pink)", 1: "var(--cl-blue)" };
const fmtNota = (n: number) => n.toFixed(1).replace(".", ",");
const chave = (slug: string) => `clube-pendente-${slug}`;

/* =====================================================================
   Bloco da Home: Virar fã, curtir e as pílulas coloridas
   ===================================================================== */
export function ClubeBloco({ businessId, slug, nome, logoUrl, heroAvatar = null, isOwner }: { businessId: string; slug: string; nome: string; logoUrl: string | null; heroAvatar?: string | null; isOwner: boolean }) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [eu, setEu] = useState<Eu | null>(null);
  const [aberta, setAberta] = useState<Aberta>(null);

  const recarregar = useCallback(async () => {
    const [r, e] = await Promise.all([getResumo(businessId), getEu(businessId)]);
    setResumo(r);
    setEu(e);
    return e;
  }, [businessId]);

  const executar = useCallback(async (p: Pendente, e: Eu) => {
    if (!e.userId) return;
    if (p === "fa") await virarFa(businessId, e.userId);
    if (p === "curtir") await curtirMarca(businessId, e.userId, true);
    await recarregar();
    if (p === "avaliar") setAberta({ tipo: "avaliacoes", origem: null });
  }, [businessId, recarregar]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const e = await recarregar();
      if (!vivo || !e.logado) return;
      let p: string | null = null;
      try { p = sessionStorage.getItem(chave(slug)); sessionStorage.removeItem(chave(slug)); } catch { /* ignora */ }
      if (p === "fa" || p === "curtir" || p === "avaliar") await executar(p, e);
    })();
    return () => { vivo = false; };
  }, [recarregar, executar, slug]);

  function pedirLogin(p: Pendente, origem: DOMRect | null) {
    try { sessionStorage.setItem(chave(slug), p); } catch { /* ignora */ }
    setAberta({ tipo: "entrar", origem, modo: "entrar" });
  }
  const rect = (el: HTMLElement) => el.getBoundingClientRect();

  async function alternarFa(el: HTMLElement) {
    if (!eu?.logado || !eu.userId) return pedirLogin("fa", rect(el));
    if (eu.ehFa) await deixarDeSerFa(businessId, eu.userId); else await virarFa(businessId, eu.userId);
    await recarregar();
  }
  async function alternarCurtida(el: HTMLElement) {
    if (!eu?.logado || !eu.userId) return pedirLogin("curtir", rect(el));
    await curtirMarca(businessId, eu.userId, !eu.curtiu);
    await recarregar();
  }

  if (!resumo || !eu) return null;
  const temNota = resumo.avaliacoes > 0 && resumo.nota != null;
  const vazio = resumo.fas === 0 && resumo.avaliacoes === 0 && resumo.curtidas === 0;

  return (
    <div className="mt-5 flex w-full min-w-0 flex-col items-center gap-3">
      {!isOwner && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={(e) => alternarFa(e.currentTarget)}
            aria-pressed={eu.ehFa}
            className={`min-h-[44px] rounded-full px-6 text-[15px] font-semibold transition active:scale-[0.97] ${eu.ehFa ? "bg-surface-soft text-on-background ring-1 ring-divider" : "bg-button-primary text-white"}`}
          >
            {eu.ehFa ? "Você é fã" : "Virar fã"}
          </button>
          <button
            type="button"
            onClick={(e) => alternarCurtida(e.currentTarget)}
            aria-pressed={eu.curtiu}
            aria-label={eu.curtiu ? "Descurtir" : "Curtir"}
            className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-surface-white px-4 text-[14px] font-semibold text-on-background ring-1 ring-divider active:scale-[0.97]"
          >
            <IcCoracao cheio={eu.curtiu} />
            <span className="tabular-nums">{resumo.curtidas}</span>
          </button>
        </div>
      )}

      {(temNota || resumo.fas > 0) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {temNota && (
            <button type="button" className="cl-pill" style={{ background: "var(--cl-orange)" }} onClick={(e) => setAberta({ tipo: "avaliacoes", origem: rect(e.currentTarget) })}>
              <span className="cl-pill-ic"><Estrela cheia tam={22} cor="#fff" /></span>
              <span><span className="cl-pill-num">{fmtNota(resumo.nota!)}</span><span className="cl-pill-lab">Nota geral</span></span>
            </button>
          )}
          {resumo.avaliacoes > 0 && (
            <button type="button" className="cl-pill" style={{ background: "var(--cl-pink)" }} onClick={(e) => setAberta({ tipo: "avaliacoes", origem: rect(e.currentTarget) })}>
              <span className="cl-pill-ic"><IcBalao /></span>
              <span><span className="cl-pill-num">{resumo.avaliacoes}</span><span className="cl-pill-lab">{resumo.avaliacoes === 1 ? "Avaliação" : "Avaliações"}</span></span>
              <IcChev />
            </button>
          )}
          {resumo.fas > 0 && (
            <button type="button" className="cl-pill" style={{ background: "var(--cl-teal)" }} onClick={(e) => setAberta({ tipo: "fas", origem: rect(e.currentTarget) })}>
              <span className="flex pl-1">
                {resumo.recentes.slice(0, 3).map((f, i) => (
                  <Rosto key={f.id} url={f.foto} nome={f.nome} size={34} className={i ? "-ml-3 ring-2 ring-white/70" : "ring-2 ring-white/70"} />
                ))}
              </span>
              <span><span className="cl-pill-num">{resumo.fas}</span><span className="cl-pill-lab">{resumo.fas === 1 ? "Fã" : "Fãs"}</span></span>
              <IcChev />
            </button>
          )}
        </div>
      )}

      {isOwner && vazio && <p className="max-w-[300px] text-center text-[13px] text-text-tertiary">Quando seus clientes virarem fãs e avaliarem, os números aparecem aqui.</p>}
      {isOwner && resumo.fas === 0 && resumo.avaliacoes > 0 ? null : null}
      {!isOwner && eu.logado && eu.ehFa && !eu.aceiteWhatsapp && (
        <button
          type="button"
          onClick={(e) => setAberta({ tipo: eu.telefoneVerificado ? "fas" : "entrar", origem: rect(e.currentTarget), modo: "vincular" })}
          className="text-[13px] font-medium text-text-secondary underline underline-offset-4"
        >
          Receber novidades no WhatsApp
        </button>
      )}

      {aberta?.tipo === "avaliacoes" && (
        <AvaliacoesFolha
          origem={aberta.origem}
          businessId={businessId}
          eu={eu}
          isOwner={isOwner}
          resumo={resumo}
          aoFechar={() => setAberta(null)}
          aoMudar={recarregar}
          pedirLogin={() => pedirLogin("avaliar", null)}
        />
      )}
      {aberta?.tipo === "fas" && (
        <FasFolha
          origem={aberta.origem}
          businessId={businessId}
          slug={slug}
          nome={nome}
          logoUrl={logoUrl}
          heroAvatar={heroAvatar}
          eu={eu}
          isOwner={isOwner}
          resumo={resumo}
          aoFechar={() => setAberta(null)}
          aoMudar={recarregar}
          pedirLogin={(el) => pedirLogin("fa", el)}
          confirmarWhats={() => setAberta({ tipo: "entrar", origem: null, modo: "vincular" })}
        />
      )}
      {aberta?.tipo === "entrar" && (
        <EntrarFolha
          slug={slug}
          businessId={businessId}
          modo={aberta.modo ?? "entrar"}
          aoFechar={() => setAberta(null)}
          aoConcluir={async () => {
            setAberta(null);
            const e = await recarregar();
            if (aberta.modo === "vincular" && e.userId && e.telefoneVerificado) {
              if (!e.ehFa) await virarFa(businessId, e.userId);
              await aceitarWhatsapp(businessId, e.userId, true);
              await recarregar();
              return;
            }
            let p: string | null = null;
            try { p = sessionStorage.getItem(chave(slug)); sessionStorage.removeItem(chave(slug)); } catch { /* ignora */ }
            if ((p === "fa" || p === "curtir" || p === "avaliar") && e.logado) await executar(p, e);
          }}
        />
      )}
    </div>
  );
}

/** Botão de virar fã usado fora da Home (ex.: voucher exclusivo para fãs). */
export function BotaoVirarFa({ businessId, slug, aoVirarFa, className, children }: { businessId: string; slug: string; aoVirarFa: () => void; className?: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  async function clique() {
    const e = await getEu(businessId);
    if (e.logado && e.userId) { await virarFa(businessId, e.userId); aoVirarFa(); return; }
    try { sessionStorage.setItem(chave(slug), "fa"); } catch { /* ignora */ }
    setAberto(true);
  }
  return (
    <>
      <button type="button" onClick={clique} className={className}>{children}</button>
      {aberto && (
        <EntrarFolha
          slug={slug}
          businessId={businessId}
          modo="entrar"
          aoFechar={() => setAberto(false)}
          aoConcluir={async () => {
            setAberto(false);
            const e = await getEu(businessId);
            try { sessionStorage.removeItem(chave(slug)); } catch { /* ignora */ }
            if (e.userId) { await virarFa(businessId, e.userId); aoVirarFa(); }
          }}
        />
      )}
    </>
  );
}

/* =====================================================================
   Entrar: Google ou código por WhatsApp
   ===================================================================== */
function EntrarFolha({ slug, businessId, modo, aoFechar, aoConcluir }: { slug: string; businessId: string; modo: "entrar" | "vincular"; aoFechar: () => void; aoConcluir: () => void }) {
  const [passo, setPasso] = useState<"inicio" | "codigo" | "nome">("inicio");
  const [tel, setTel] = useState("");
  const [cod, setCod] = useState("");
  const [nomeTxt, setNomeTxt] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [eu, setEu] = useState<Eu | null>(null);
  const reduzido = useReduzido();
  const vincular = modo === "vincular";
  const telefone = normalizarTelefone(tel);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") aoFechar(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [aoFechar]);

  async function google() {
    setOcupado(true);
    setErro(await entrarComGoogle(slug));
    setOcupado(false);
  }
  async function enviar() {
    if (tel.replace(/\D/g, "").length < 10) return setErro("Digite o número com DDD.");
    setOcupado(true); setErro(null);
    const e = vincular ? await vincularTelefone(telefone) : await enviarCodigoWhatsapp(telefone);
    setOcupado(false);
    if (e) return setErro(e);
    setPasso("codigo");
  }
  async function confirmar() {
    setOcupado(true); setErro(null);
    const e = vincular ? await confirmarVinculo(telefone, cod) : await confirmarCodigo(telefone, cod);
    if (e) { setOcupado(false); return setErro(e); }
    const eu2 = await getEu(businessId);
    setOcupado(false);
    setEu(eu2);
    if (!eu2.nome) return setPasso("nome");
    aoConcluir();
  }
  async function salvarNome() {
    if (!nomeTxt.trim() || !eu?.userId) return;
    setOcupado(true);
    await atualizarPerfil(eu.userId, { nome: nomeTxt.trim() });
    setOcupado(false);
    aoConcluir();
  }

  const campo = "min-h-[48px] w-full rounded-full border border-divider bg-surface-white px-4 text-[16px] outline-none focus:border-on-background";
  const botao = "min-h-[48px] w-full rounded-full bg-button-primary text-[15px] font-semibold text-white disabled:opacity-50 active:scale-[0.98]";

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/40" onClick={aoFechar} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Entrar no clube"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-t-[32px] bg-background-main px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-12px_40px_rgba(0,0,0,0.2)]"
        style={reduzido ? undefined : { animation: "cl-sobe .42s cubic-bezier(.22,1,.36,1) both" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-manrope)] text-[20px] font-extrabold tracking-[-0.02em]">
              {vincular ? "Confirmar seu WhatsApp" : passo === "nome" ? "Como quer ser chamado?" : "Entrar no clube"}
            </h2>
            <p className="mt-1 text-[14px] text-text-secondary">
              {vincular
                ? "A marca só vê seu número se você confirmar aqui e aceitar receber novidades."
                : passo === "nome" ? "Esse nome aparece nas suas avaliações e na lista de fãs." : "Vire fã, ganhe vantagens exclusivas e avalie com rosto e nome."}
            </p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="cl-x active:scale-95">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {passo === "inicio" && (
            <>
              {!vincular && (
                <>
                  <button type="button" onClick={google} disabled={ocupado} className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full bg-surface-white text-[15px] font-semibold ring-1 ring-divider active:scale-[0.98] disabled:opacity-50">
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
                    Continuar com Google
                  </button>
                  <p className="text-center text-[12.5px] text-text-tertiary">ou receba um código por WhatsApp</p>
                </>
              )}
              <label className="sr-only" htmlFor="clube-tel">Seu WhatsApp com DDD</label>
              <input id="clube-tel" className={campo} inputMode="tel" autoComplete="tel" placeholder="(11) 90000-0000" value={tel} onChange={(e) => setTel(e.target.value)} />
              <button type="button" onClick={enviar} disabled={ocupado} className={botao}>{ocupado ? "Enviando..." : "Enviar código"}</button>
            </>
          )}
          {passo === "codigo" && (
            <>
              <p className="text-[14px] text-text-secondary">Enviamos um código para {telefone}.</p>
              <label className="sr-only" htmlFor="clube-cod">Código de 6 dígitos</label>
              <input id="clube-cod" className={`${campo} text-center tracking-[0.3em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={cod} onChange={(e) => setCod(e.target.value)} />
              <button type="button" onClick={confirmar} disabled={ocupado || cod.trim().length < 6} className={botao}>{ocupado ? "Confirmando..." : "Confirmar"}</button>
              <button type="button" onClick={() => { setPasso("inicio"); setCod(""); }} className="min-h-[44px] text-[14px] font-medium text-text-secondary">Trocar o número</button>
            </>
          )}
          {passo === "nome" && (
            <>
              <label className="sr-only" htmlFor="clube-nome">Seu nome</label>
              <input id="clube-nome" className={campo} autoComplete="name" placeholder="Seu nome" value={nomeTxt} onChange={(e) => setNomeTxt(e.target.value)} />
              <button type="button" onClick={salvarNome} disabled={ocupado || !nomeTxt.trim()} className={botao}>Salvar e continuar</button>
            </>
          )}
          {erro && <p role="alert" className="text-center text-[13.5px] text-[#C2362E]">{erro}</p>}
          <p className="text-center text-[12px] leading-snug text-text-tertiary">
            Seu WhatsApp nunca aparece para outros clientes. Só a marca vê, e só se você aceitar receber novidades.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* =====================================================================
   Avaliações
   ===================================================================== */
function AvaliacoesFolha({ origem, businessId, eu, isOwner, resumo, aoFechar, aoMudar, pedirLogin }: {
  origem: DOMRect | null; businessId: string; eu: Eu; isOwner: boolean; resumo: Resumo; aoFechar: () => void; aoMudar: () => Promise<Eu>; pedirLogin: () => void;
}) {
  const [lista, setLista] = useState<Avaliacao[] | null>(null);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [textoResp, setTextoResp] = useState("");
  const [revisadas, setRevisadas] = useState<string[]>([]);
  const [nota, setNota] = useState(eu.minhaAvaliacao?.nota ?? 0);
  const [coment, setComent] = useState(eu.minhaAvaliacao?.comentario ?? "");
  const [completo, setCompleto] = useState(false);
  const [foto, setFoto] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => setLista(await getAvaliacoes(businessId)), [businessId]);
  useEffect(() => {
    let vivo = true;
    getAvaliacoes(businessId).then((l) => { if (vivo) setLista(l); });
    return () => { vivo = false; };
  }, [businessId]);

  const max = Math.max(1, ...resumo.distribuicao);

  async function enviar() {
    if (!eu.userId || nota < 1) return setMsg("Escolha de 1 a 5 estrelas.");
    setEnviando(true);
    const ok = await enviarAvaliacao(businessId, eu.userId, { nota, comentario: coment, completo, foto });
    setEnviando(false);
    if (!ok) return setMsg("Não consegui enviar. Só quem resgatou um voucher pode avaliar.");
    setMsg("Obrigado! Sua avaliação já aparece na lista.");
    await Promise.all([carregar(), aoMudar()]);
  }
  async function enviarResposta(id: string) {
    if (!textoResp.trim()) return;
    await responderAvaliacao(id, textoResp);
    setRespondendo(null); setTextoResp("");
    await carregar();
  }

  return (
    <Folha origem={origem} aoFechar={aoFechar} rotulo="Avaliações">
      {(fechar) => (
        <>
          <Cabecalho titulo="Avaliações" sub="Todas de quem resgatou um voucher" fechar={fechar} />
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-1">
            <div className="cl-entra grid grid-cols-[auto_1fr] items-center gap-5 rounded-[28px] bg-surface-white p-5 ring-1 ring-divider" style={{ ["--i" as string]: 1 }}>
              <div>
                <div className="font-[family-name:var(--font-manrope)] text-[54px] font-extrabold leading-none tracking-[-0.04em] tabular-nums" style={{ background: "var(--cl-orange)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                  {resumo.nota != null ? fmtNota(resumo.nota) : "-"}
                </div>
                <div className="mt-1.5 flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Estrela key={n} cheia={n <= Math.round(resumo.nota ?? 0)} />)}</div>
                <p className="mt-1.5 text-[12.5px] text-text-tertiary">{resumo.avaliacoes} {resumo.avaliacoes === 1 ? "avaliação" : "avaliações"}</p>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map((n, k) => (
                  <div key={n} className="grid grid-cols-[12px_1fr_26px] items-center gap-2 text-[12px] tabular-nums text-text-tertiary">
                    <span>{n}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-surface-soft"><span className="cl-fill block" style={{ ["--w" as string]: resumo.distribuicao[n - 1] / max, ["--i" as string]: k, background: GRAD_NOTA[n] }} /></span>
                    <span>{resumo.distribuicao[n - 1]}</span>
                  </div>
                ))}
              </div>
            </div>

            {lista === null && <p className="py-6 text-center text-[14px] text-text-tertiary">Carregando...</p>}
            {lista?.map((r, k) => (
              <article key={r.id} className={`cl-rev cl-entra ${r.nota === 4 ? "escuro" : ""}`} style={{ background: GRAD_NOTA[r.nota], ["--i" as string]: k + 3 }}>
                <Rosto url={r.foto_url} nome={r.nome} size={48} className="ring-2 ring-white/60" />
                <div className="min-w-0 text-[15px] font-bold leading-tight">
                  <span className="block truncate">{r.nome || "Cliente"}</span>
                  <small className="mt-0.5 block text-[11.5px] font-semibold opacity-85">Voucher resgatado · {new Date(r.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</small>
                </div>
                <div className="font-[family-name:var(--font-manrope)] text-[30px] font-extrabold tabular-nums tracking-[-0.03em]">{r.nota}</div>
                {r.comentario ? <p className="col-span-full mt-1 text-[14px] leading-snug">{r.comentario}</p> : null}
                {r.resposta_dono ? (
                  <div className="cl-resp"><b className="mb-0.5 block text-[11.5px] uppercase tracking-wide opacity-80">Resposta da marca</b>{r.resposta_dono}</div>
                ) : null}
                {isOwner && respondendo !== r.id && (
                  <div className="col-span-full mt-1.5 flex flex-wrap gap-2">
                    {!r.resposta_dono && <button type="button" className="cl-mini" onClick={() => { setRespondendo(r.id); setTextoResp(""); }}>Responder</button>}
                    <button type="button" className="cl-mini" disabled={revisadas.includes(r.id)} onClick={async () => { await pedirRevisao(r.id); setRevisadas((v) => [...v, r.id]); }}>
                      {revisadas.includes(r.id) ? "Revisão pedida" : "Pedir revisão"}
                    </button>
                  </div>
                )}
                {isOwner && respondendo === r.id && (
                  <div className="col-span-full mt-1.5 flex gap-2">
                    <input aria-label="Sua resposta" autoFocus maxLength={300} value={textoResp} onChange={(e) => setTextoResp(e.target.value)} placeholder="Escreva a resposta" className="min-h-[40px] min-w-0 flex-1 rounded-full bg-white/90 px-4 text-[14px] text-[#14161A] outline-none" />
                    <button type="button" onClick={() => enviarResposta(r.id)} className="min-h-[40px] rounded-full bg-[#14161A] px-4 text-[13px] font-bold text-white">Enviar</button>
                  </div>
                )}
              </article>
            ))}
            {lista?.length === 0 && <p className="py-4 text-center text-[14px] text-text-tertiary">Ainda não há avaliações. A primeira pode ser sua.</p>}

            {!isOwner && (
              <div className="cl-entra rounded-[28px] bg-surface-white p-5 ring-1 ring-divider" style={{ ["--i" as string]: 8 }}>
                <p className="text-[15px] font-bold">{eu.minhaAvaliacao ? "Sua avaliação" : "Avaliar esta marca"}</p>
                {!eu.logado ? (
                  <>
                    <p className="mt-1 text-[13.5px] text-text-secondary">Entre para avaliar. Só quem resgatou um voucher da marca pode deixar nota.</p>
                    <button type="button" onClick={pedirLogin} className="mt-3 min-h-[48px] w-full rounded-full bg-button-primary text-[15px] font-semibold text-white active:scale-[0.98]">Entrar para avaliar</button>
                  </>
                ) : !eu.podeAvaliar && !eu.minhaAvaliacao ? (
                  <p className="mt-1 text-[13.5px] text-text-secondary">Você poderá avaliar depois de resgatar um voucher desta marca. Se já resgatou usando seu WhatsApp, confirme o número no seu perfil de fã.</p>
                ) : (
                  <>
                    <div className="mt-2 flex justify-center gap-1" role="radiogroup" aria-label="Sua nota">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`} onClick={() => setNota(n)} className="grid h-11 w-11 place-items-center rounded-full active:scale-90">
                          <Estrela cheia={n <= nota} tam={30} />
                        </button>
                      ))}
                    </div>
                    <label htmlFor="clube-coment" className="sr-only">Comentário</label>
                    <textarea id="clube-coment" rows={3} maxLength={400} value={coment} onChange={(e) => setComent(e.target.value)} placeholder="Conte como foi (opcional)" className="mt-2 w-full resize-none rounded-2xl border border-divider bg-background-main px-4 py-3 text-[15px] outline-none focus:border-on-background" />
                    <div className="mt-2 flex flex-col gap-1">
                      <label className="flex min-h-[44px] items-center justify-between gap-3 text-[14px]">Aparecer com meu nome completo<input type="checkbox" checked={completo} onChange={(e) => setCompleto(e.target.checked)} className="h-5 w-5 accent-[#14161A]" /></label>
                      <label className="flex min-h-[44px] items-center justify-between gap-3 text-[14px]">Mostrar minha foto<input type="checkbox" checked={foto} onChange={(e) => setFoto(e.target.checked)} className="h-5 w-5 accent-[#14161A]" /></label>
                    </div>
                    <button type="button" onClick={enviar} disabled={enviando || nota < 1} className="mt-2 min-h-[48px] w-full rounded-full bg-button-primary text-[15px] font-semibold text-white disabled:opacity-50 active:scale-[0.98]">
                      {enviando ? "Enviando..." : eu.minhaAvaliacao ? "Atualizar avaliação" : "Enviar avaliação"}
                    </button>
                  </>
                )}
                {msg && <p role="status" className="mt-2 text-center text-[13.5px] text-text-secondary">{msg}</p>}
              </div>
            )}
          </div>
        </>
      )}
    </Folha>
  );
}

/* =====================================================================
   Fãs: órbita de rostos, e as marcas de cada fã
   ===================================================================== */
const ANEIS = [
  { r: 0.34, velocidade: 0.12, cor: "#F2556B" },
  { r: 0.6, velocidade: -0.08, cor: "#9B59D9" },
  { r: 0.84, velocidade: 0.055, cor: "#3E8BEA" },
];
/** Do mais perto da marca (vermelho) ao que só virou fã (azul). */
const NIVEIS = [
  { cor: "#3E8BEA", nome: "Só viraram fã" },
  { cor: "#1DB8A4", nome: "Curtiram" },
  { cor: "#FF9A3C", nome: "Compraram" },
  { cor: "#F2556B", nome: "Avaliaram" },
];
const ANEIS_MARCAS = [{ r: 0.5, velocidade: 0.14 }, { r: 0.8, velocidade: -0.09 }];
const CAP_ANEL = [6, 9, 12];
const TAM = [46, 40, 36];

function FasFolha({ origem, businessId, slug, nome, logoUrl, heroAvatar, eu, isOwner, resumo, aoFechar, aoMudar, pedirLogin, confirmarWhats }: {
  origem: DOMRect | null; businessId: string; slug: string; nome: string; logoUrl: string | null; heroAvatar: string | null; eu: Eu; isOwner: boolean; resumo: Resumo;
  aoFechar: () => void; aoMudar: () => Promise<Eu>; pedirLogin: (el: DOMRect) => void; confirmarWhats: () => void;
}) {
  const [fas, setFas] = useState<FaLite[] | null>(null);
  const [fa, setFa] = useState<FaLite | null>(null);
  const [marcas, setMarcas] = useState<MarcaDoFa[] | null>(null);
  const [marcaSel, setMarcaSel] = useState<MarcaDoFa | null>(null);
  const [contatos, setContatos] = useState<ContatoWhats[] | null>(null);
  const [verContatos, setVerContatos] = useState(false);

  useEffect(() => {
    let vivo = true;
    getFas(businessId).then((l) => { if (vivo) setFas(l); });
    if (isOwner) getContatos(businessId).then((c) => { if (vivo) setContatos(c); });
    return () => { vivo = false; };
  }, [businessId, isOwner]);

  async function abrirFa(f: FaLite) {
    setFa(f); setMarcas(null); setMarcaSel(null);
    setMarcas(await getMarcasDoFa(f.id));
  }

  const itens: ItemOrbita[] = useMemo(() => {
    const lista = fas ?? [];
    const out: ItemOrbita[] = [];
    let anel = 0, noAnel = 0;
    for (const f of lista) {
      if (noAnel >= CAP_ANEL[anel]) { anel++; noAnel = 0; }
      if (anel > 2) break;
      const s = TAM[anel] - (noAnel % 3) * 3;
      out.push({ key: f.id, size: s, anel, rotulo: `Fã ${f.nome ?? ""}`, aoTocar: () => void abrirFa(f), node: <Rosto url={f.foto_url} nome={f.nome} size={s} blob aro={f.nivel != null ? NIVEIS[Math.min(3, Math.max(0, f.nivel))].cor : undefined} /> });
      noAnel++;
    }
    const resto = resumo.fas - out.length;
    if (resto > 0 && out.length > 0) {
      out.push({
        key: "mais", size: 40, anel: Math.min(anel, 2), rotulo: `Mais ${resto} fãs`, aoTocar: () => {},
        node: <span className="cl-av cl-blob bg-surface-soft text-[12px] text-on-background" style={{ width: 40, height: 40, background: "var(--surface-soft)", color: "var(--on-background)" }}>+{resto}</span>,
      });
    }
    return out;
  }, [fas, resumo.fas]);

  const contagem = useMemo(() => {
    const c = [0, 0, 0, 0];
    for (const f of fas ?? []) c[Math.min(3, Math.max(0, f.nivel ?? 0))]++;
    return c;
  }, [fas]);
  const temNivel = (fas ?? []).some((f) => f.nivel != null);
  const esfera = lerEsfera(heroAvatar);

  const itensMarcas: ItemOrbita[] = useMemo(() => {
    const lista = (marcas ?? []).slice(0, 12);
    return lista.map((m, i) => ({
      key: m.id, size: 58, anel: i < 3 ? 0 : 1, rotulo: m.name, aoTocar: () => setMarcaSel(m),
      node: <Rosto url={m.logo_url} nome={m.name} size={58} blob />,
    }));
  }, [marcas]);

  return (
    <Folha origem={origem} aoFechar={aoFechar} rotulo="Fãs da marca">
      {(fechar) => (
        <>
          <Cabecalho titulo={`${resumo.fas} ${resumo.fas === 1 ? "fã" : "fãs"}`} sub={`O clube de ${nome}`} fechar={fechar} />
          <div className="flex min-h-0 flex-1 flex-col justify-center px-2">
            {fas === null ? (
              <p className="text-center text-[14px] text-text-tertiary">Carregando...</p>
            ) : fas.length === 0 ? (
              <p className="px-8 text-center text-[15px] text-text-secondary">Ainda não há fãs visíveis. Seja o primeiro.</p>
            ) : (
              <Orbita
                itens={itens}
                aneis={ANEIS}
                centro={logoUrl ? <OrbiAvatar logoUrl={logoUrl} size={96} esfera={esfera?.tom} escala={esfera?.escala} /> : <Rosto nome={nome} size={92} className="shadow-[0_10px_34px_rgba(0,0,0,0.25)]" />}
              />
            )}
          </div>
          <div className="cl-entra px-6 text-center" style={{ ["--i" as string]: 5 }}>
            {temNivel && (
              <div className="mx-auto mb-3 max-w-[340px]">
                <div className="h-1.5 rounded-full" style={{ background: "linear-gradient(90deg,#F2556B,#FF9A3C,#1DB8A4,#3E8BEA)" }} aria-hidden />
                <div className="mt-1.5 flex justify-between text-[11.5px] font-semibold text-text-tertiary">
                  <span>Mais perto da marca</span>
                  <span>Acabaram de chegar</span>
                </div>
                <ul className="mt-2.5 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {[3, 2, 1, 0].filter((n) => contagem[n] > 0).map((n) => (
                    <li key={n} className="flex items-center gap-1.5 text-[12.5px] text-text-secondary">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: NIVEIS[n].cor }} aria-hidden />
                      {NIVEIS[n].nome} <b className="font-bold text-on-background tabular-nums">{contagem[n]}</b>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <span className="text-[13px] text-text-tertiary">Toque em um fã para ver de quais marcas ele é fã</span>
          </div>
          <div className="cl-entra flex flex-col items-center gap-2 px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-2" style={{ ["--i" as string]: 6 }}>
            {isOwner ? (
              <button type="button" onClick={() => setVerContatos(true)} className="min-h-[48px] rounded-full bg-button-primary px-6 text-[15px] font-semibold text-white active:scale-[0.98]">
                Contatos no WhatsApp{contatos ? ` (${contatos.length})` : ""}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={async (e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    if (!eu.userId) return pedirLogin(r);
                    if (eu.ehFa) await deixarDeSerFa(businessId, eu.userId); else await virarFa(businessId, eu.userId);
                    await aoMudar();
                  }}
                  aria-pressed={eu.ehFa}
                  className={`min-h-[48px] rounded-full px-7 text-[15px] font-semibold active:scale-[0.98] ${eu.ehFa ? "bg-surface-soft text-on-background ring-1 ring-divider" : "bg-button-primary text-white"}`}
                >
                  {eu.ehFa ? "Você é fã" : "Virar fã"}
                </button>
                {eu.logado && eu.ehFa && (
                  <label className="flex min-h-[44px] items-center gap-3 text-[14px] text-text-secondary">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[#14161A]"
                      checked={eu.aceiteWhatsapp}
                      onChange={async (e) => {
                        if (!eu.userId) return;
                        if (e.target.checked && !eu.telefoneVerificado) return confirmarWhats();
                        await aceitarWhatsapp(businessId, eu.userId, e.target.checked);
                        await aoMudar();
                      }}
                    />
                    Receber novidades no WhatsApp
                  </label>
                )}
                {eu.logado && eu.ehFa && (
                  <label className="flex min-h-[44px] items-center gap-3 text-[14px] text-text-secondary">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[#14161A]"
                      checked={eu.mostrarMarcas}
                      onChange={async (e) => {
                        if (!eu.userId) return;
                        await atualizarPerfil(eu.userId, { mostrar_marcas: e.target.checked });
                        await aoMudar();
                      }}
                    />
                    Mostrar de quais marcas sou fã
                  </label>
                )}
                {eu.logado && (
                  <button type="button" onClick={async () => { await sairDoClube(); window.location.reload(); }} className="min-h-[36px] text-[12.5px] text-text-tertiary underline underline-offset-4">
                    Sair da minha conta de fã
                  </button>
                )}
              </>
            )}
          </div>

          {/* Marcas do fã */}
          <div className={`cl-camada ${fa ? "on" : ""}`} aria-hidden={!fa}>
            {fa && (
              <>
                <Cabecalho titulo={fa.nome || "Fã"} sub={marcas ? (marcas.length ? `Fã de ${marcas.length} ${marcas.length === 1 ? "marca" : "marcas"}` : "") : "Carregando..."} fechar={() => setFa(null)} rotuloFechar="Voltar aos fãs" />
                <div className="flex min-h-0 flex-1 flex-col justify-center px-2">
                  {marcas && marcas.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 px-8 text-center">
                      <Rosto url={fa.foto_url} nome={fa.nome} size={110} />
                      <p className="text-[15px] text-text-secondary">{fa.nome || "Esse fã"} prefere não mostrar de quais outras marcas é fã.</p>
                    </div>
                  ) : marcas ? (
                    <Orbita
                      key={fa.id}
                      itens={itensMarcas}
                      aneis={ANEIS_MARCAS}
                      centro={<span className="block rounded-full bg-[#D9D2F4] p-1.5"><Rosto url={fa.foto_url} nome={fa.nome} size={104} /></span>}
                    />
                  ) : null}
                </div>
                <div className="min-h-[64px] px-6 text-center">
                  {marcaSel ? (
                    <>
                      <b className="block text-[18px] font-extrabold tracking-[-0.02em]">{marcaSel.name}</b>
                      {marcaSel.slug === slug ? <span className="text-[13px] text-text-tertiary">Você está aqui</span> : <a href={`/${marcaSel.slug}`} className="text-[13.5px] font-semibold underline underline-offset-4">Abrir o Orbibox desta marca</a>}
                    </>
                  ) : marcas && marcas.length > 0 ? (
                    <span className="text-[13px] text-text-tertiary">Toque em uma marca. Só aparecem as que {fa.nome || "o fã"} deixou visíveis.</span>
                  ) : null}
                </div>
                <div className="flex justify-center px-5 pb-[max(22px,env(safe-area-inset-bottom))]">
                  <button type="button" onClick={() => setFa(null)} className="min-h-[44px] rounded-full bg-surface-soft px-6 text-[14px] font-semibold active:scale-95">Voltar aos fãs</button>
                </div>
              </>
            )}
          </div>

          {/* Contatos de WhatsApp (só o dono) */}
          <div className={`cl-camada ${verContatos ? "on" : ""}`} aria-hidden={!verContatos}>
            {verContatos && (
              <>
                <Cabecalho titulo="Contatos no WhatsApp" sub="Só de fãs que aceitaram e confirmaram o número" fechar={() => setVerContatos(false)} rotuloFechar="Voltar" />
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-8 pt-2">
                  {contatos?.length ? contatos.map((c) => (
                    <div key={c.telefone} className="flex items-center gap-3 rounded-full bg-surface-white py-2 pl-2 pr-3 ring-1 ring-divider">
                      <Rosto nome={c.nome} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold">{c.nome || "Fã"}</p>
                        <p className="text-[12.5px] text-text-tertiary">+{c.telefone.replace(/\D/g, "")}</p>
                      </div>
                      <a href={`https://wa.me/${c.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex min-h-[40px] items-center rounded-full bg-[#25D366] px-4 text-[13px] font-bold text-white">Chamar</a>
                    </div>
                  )) : <p className="px-6 pt-8 text-center text-[14px] text-text-secondary">Nenhum fã aceitou receber no WhatsApp ainda.</p>}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </Folha>
  );
}
