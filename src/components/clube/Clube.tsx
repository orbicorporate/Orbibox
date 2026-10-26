"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { carregarCurtidas } from "@/lib/clube-curtidas";
import type { PedidoFa } from "./CurtirItem";
import {
  aceitarWhatsapp, atualizarPerfil, curtirAlvo, curtirMarca, deixarDeSerFa, enviarAvaliacao, excluirAvaliacao, entrarComEmail, entrarComNumero,
  enviarFotoPerfil, entrarComGoogle, getAfinidade, getOrbiboxAtivos, getAvaliacoes, getContatos, getEu, getFas, getMarcasDoFa, getResumo, normalizarTelefone, pedirRevisao, responderAvaliacao,
  sairDoClube, salvarContatoWhatsapp, virarFa,
  type Avaliacao, type ContatoWhats, type Eu, type FaLite, type MarcaAfim, type MarcaDoFa, type OrbiboxAtivo, type Resumo,
} from "@/lib/clube";
import { OrbiAvatar, lerEsfera, lerLogoEscala } from "@/components/orbi/OrbiAvatar";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { BotaoCompartilhar } from "@/components/compartilhar/Compartilhar";
import { Cabecalho, Estrela, Folha, IcChev, IcCoracao, IcX, Orbita, Rosto, useReduzido, type ItemOrbita } from "./pecas";

type Aberta = { tipo: "avaliacoes" | "fas" | "entrar" | "contato"; origem: DOMRect | null } | null;

const fmtNota = (n: number) => n.toFixed(1).replace(".", ",");
const chave = (slug: string) => `clube-pendente-${slug}`;

/* =====================================================================
   Bloco da página inicial: Virar fã, curtir e as pílulas coloridas
   ===================================================================== */
export function ClubeBloco({ businessId, slug, nome, logoUrl, heroAvatar = null, isOwner, slotTopo = null }: { businessId: string; slug: string; nome: string; logoUrl: string | null; heroAvatar?: string | null; isOwner: boolean; slotTopo?: HTMLElement | null }) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [eu, setEu] = useState<Eu | null>(null);
  const [aberta, setAberta] = useState<Aberta>(null);
  const [contatoAberto, setContatoAberto] = useState(false);
  const [pedido, setPedido] = useState<PedidoFa | null>(null);
  const [notaHome, setNotaHome] = useState<number | null>(null);

  const recarregar = useCallback(async () => {
    const [r, e] = await Promise.all([getResumo(businessId), getEu(businessId)]);
    setResumo(r);
    setEu(e);
    void carregarCurtidas(businessId);
    return e;
  }, [businessId]);

  const executar = useCallback(async (p: string, e: Eu) => {
    if (!e.userId) return;
    if (p === "contato") return setAberta({ tipo: "contato", origem: null });
    if (p === "fa") { await virarFa(businessId, e.userId); await curtirMarca(businessId, e.userId, true); }
    if (p === "curtir") await curtirMarca(businessId, e.userId, true);
    if (p.startsWith("item|")) {
      const [, alvo, id] = p.split("|");
      await virarFa(businessId, e.userId);
      await curtirMarca(businessId, e.userId, true);
      if (alvo && id) await curtirAlvo(businessId, e.userId, alvo, id, true);
    }
    await recarregar();
    if (p === "avaliar") setAberta({ tipo: "avaliacoes", origem: null });
    if (p === "contato") setAberta({ tipo: "contato", origem: null });
  }, [businessId, recarregar]);

  // Atalhos por link: /slug?clube=fas abre a lista de fãs (dono); /slug?clube=avaliar abre direto a tela de avaliação (qualquer pessoa).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const alvo = new URLSearchParams(window.location.search).get("clube");
    if (alvo === "fas" && isOwner) queueMicrotask(() => setAberta({ tipo: "fas", origem: null }));
    if (alvo === "avaliar" && !isOwner) queueMicrotask(() => setAberta({ tipo: "avaliacoes", origem: null }));
  }, [isOwner]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const e = await recarregar();
      if (!vivo || !e.logado) return;
      // Ver as marcas dos outros fãs faz parte do Radar de fãs: fica sempre ligado.
      if (e.userId && !e.mostrarMarcas) void atualizarPerfil(e.userId, { mostrar_marcas: true });
      let p: string | null = null;
      try { p = sessionStorage.getItem(chave(slug)); sessionStorage.removeItem(chave(slug)); } catch { /* ignora */ }
      if (p === "fa" || p === "curtir" || p === "avaliar" || p === "contato" || p?.startsWith("item|")) await executar(p, e);
    })();
    return () => { vivo = false; };
  }, [recarregar, executar, slug]);

  useEffect(() => {
    if (isOwner) return;
    const ouvir = (ev: Event) => setPedido((ev as CustomEvent<PedidoFa>).detail);
    window.addEventListener("clube:pedir-fa", ouvir);
    return () => window.removeEventListener("clube:pedir-fa", ouvir);
  }, [isOwner]);

  function pedirLogin(p: string, origem: DOMRect | null) {
    try { sessionStorage.setItem(chave(slug), p); } catch { /* ignora */ }
    setAberta({ tipo: "entrar", origem });
  }
  const rect = (el: HTMLElement) => el.getBoundingClientRect();

  if (!resumo || !eu) return null;
  const temNota = resumo.avaliacoes > 0 && resumo.nota != null;
  const vazio = resumo.fas === 0 && resumo.avaliacoes === 0 && resumo.curtidas === 0;

  /** Toque no coração: vira fã ou deixa de ser (o coração volta a ser só linhas). */
  async function alternarFa(origem: DOMRect) {
    if (!eu?.logado || !eu.userId) { pedirLogin("fa", origem); return; }
    if (eu.ehFa) await deixarDeSerFa(businessId, eu.userId);
    else { await virarFa(businessId, eu.userId); await curtirMarca(businessId, eu.userId, true); }
    await recarregar();
  }

  // Faixa discreta lá em cima, sem fundo: rostos e contagem de fãs, coração, e a nota (estrela colorida) com o balão de avaliações.
  const abrirAvaliacoes = (e: React.MouseEvent<HTMLElement>) => setAberta({ tipo: "avaliacoes", origem: rect(e.currentTarget) });
  const cluster = !isOwner || resumo.fas > 0 || resumo.avaliacoes > 0 ? (
    <div className="flex min-h-[40px] items-center gap-3.5 text-[13.5px] font-normal text-on-background [filter:drop-shadow(0_1px_4px_rgba(0,0,0,0.14))]">
      {resumo.fas > 0 && (
        <button
          type="button"
          onClick={(e) => setAberta({ tipo: "fas", origem: rect(e.currentTarget) })}
          aria-label={isOwner ? `${resumo.fas} ${resumo.fas === 1 ? "fã" : "fãs"}, abrir radar` : eu.ehFa ? `Você é fã. ${resumo.fas} ${resumo.fas === 1 ? "fã" : "fãs"}, abrir painel` : "Virar fã, abrir painel"}
          className="flex min-h-[40px] items-center gap-2 transition active:scale-[0.96]"
        >
          {resumo.fas > 0 && (
            <>
              <span className="flex">
                {resumo.recentes.slice(0, 3).map((f, i) => (
                  <Rosto key={f.id} url={f.foto} nome={f.nome} size={26} className={i ? "-ml-2 ring-2 ring-white" : "ring-2 ring-white"} />
                ))}
              </span>
              <span className="tabular-nums">{resumo.fas}</span>
            </>
          )}
        </button>
      )}
      {!isOwner && (
        <button
          type="button"
          aria-pressed={eu.ehFa}
          aria-label={eu.ehFa ? "Você é fã. Toque para deixar de ser fã" : "Virar fã"}
          onClick={(e) => void alternarFa(rect(e.currentTarget))}
          className="flex min-h-[40px] items-center gap-2 transition active:scale-[0.96]"
        >
          <span className={`coracao-pulsa ${eu.ehFa ? "text-[#F2556B]" : "text-on-background/75"}`}><IcCoracao cheio={eu.ehFa} tamanho={22} /></span>
          <span>{eu.ehFa ? "Sou fã" : "Virar fã"}</span>
        </button>
      )}
      {temNota && (
        <button type="button" onClick={abrirAvaliacoes} aria-label={`Nota geral ${fmtNota(resumo.nota!)}. Ver avaliações`} className="flex min-h-[40px] items-center gap-1 tabular-nums transition active:scale-[0.96]">
          <Estrela cheia tam={20} />
          <span>{fmtNota(resumo.nota!)}</span>
        </button>
      )}
    </div>
  ) : null;

  /** Convite da língua e do painel: pede só o número, sem código. Quem não entrou passa antes pelo login. */
  function querContato() {
    if (eu?.logado && eu.userId) { setAberta({ tipo: "contato", origem: null }); return; }
    pedirLogin("contato", null);
  }

  async function confirmarPedido() {
    const pd = pedido;
    if (!pd) return;
    if (!eu?.logado || !eu.userId) {
      pedirLogin(`item|${pd.alvo}|${pd.id}`, null);
      setPedido(null);
      return;
    }
    await virarFa(businessId, eu.userId);
    await curtirMarca(businessId, eu.userId, true);
    await curtirAlvo(businessId, eu.userId, pd.alvo, pd.id, true);
    setPedido(null);
    await recarregar();
  }

  return (
    <div className="mt-5 flex w-full min-w-0 flex-col items-center gap-3">
      {cluster && (slotTopo ? createPortal(cluster, slotTopo) : <div className="flex flex-wrap items-center justify-center gap-2">{cluster}</div>)}

      {!isOwner && !eu.minhaAvaliacao && (
        <div className="nr-home flex items-center gap-1.5" aria-label="Avalie">
          <span className="text-[12px] text-text-tertiary">Avalie</span>
          <span className="flex" role="radiogroup" aria-label="Nota">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={false} aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
                onClick={() => { if (eu.logado && eu.userId) setNotaHome(n); else pedirLogin("avaliar", null); }}
                className="grid h-9 w-8 place-items-center active:scale-90">
                <Estrela cheia={false} tam={19} />
              </button>
            ))}
          </span>
        </div>
      )}
      {notaHome != null && eu.userId && (
        <NotaRapida businessId={businessId} userId={eu.userId} marca={nome} inicial={notaHome} comentarioInicial={eu.minhaAvaliacao?.comentario}
          aoFechar={() => setNotaHome(null)} aoSalvar={() => { void recarregar(); }} />
      )}

      {pedido && !isOwner && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setPedido(null)}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-[400px] rounded-3xl bg-surface-white p-6 text-center shadow-xl">
            <span className="mx-auto flex h-12 w-12 items-center justify-center text-[#F2556B]"><IcCoracao cheio /></span>
            <p className="mt-2 text-[18px] font-semibold text-on-background">Vire fã para curtir</p>
            <p className="mt-1 text-[14px] text-text-secondary">{pedido.titulo ? `Para curtir ${pedido.titulo}, você precisa ser fã de ${nome}.` : `Para curtir, você precisa ser fã de ${nome}.`} {nome} vê o que o público mais gosta.</p>
            <button type="button" onClick={confirmarPedido} className="mt-5 min-h-[48px] w-full rounded-full bg-button-primary text-[15px] font-semibold text-white active:scale-[0.98]">Virar fã e curtir</button>
            <button type="button" onClick={() => setPedido(null)} className="mt-2 min-h-[44px] w-full rounded-full text-[14px] font-medium text-text-secondary">Agora não</button>
          </div>
        </div>
      )}

      {isOwner && vazio && <p className="max-w-[300px] text-center text-[13px] text-text-tertiary">Quando seus clientes virarem fãs e avaliarem, os números aparecem aqui.</p>}
      {isOwner && resumo.fas === 0 && resumo.avaliacoes > 0 ? null : null}
      {!isOwner && eu.logado && eu.anonimo && <AvisoValidarPerfil slug={slug} />}
      {!isOwner && <LinguaContato nome={nome} slug={slug} ocupado={aberta !== null || pedido !== null} eu={eu} onQuero={querContato} />}

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
          confirmarWhats={() => setContatoAberto(true)}
        />
      )}
      {(aberta?.tipo === "contato" || contatoAberto) && eu?.userId && (
        <ContatoFolha
          businessId={businessId}
          userId={eu.userId}
          nome={nome}
          inicial={eu.contatoWhatsapp ?? eu.telefone}
          aoFechar={() => { setContatoAberto(false); if (aberta?.tipo === "contato") setAberta(null); }}
          aoConcluir={async () => { setContatoAberto(false); if (aberta?.tipo === "contato") setAberta(null); await recarregar(); }}
        />
      )}
      {aberta?.tipo === "entrar" && (
        <EntrarFolha
          slug={slug}
          businessId={businessId}
          aoFechar={() => setAberta(null)}
          aoConcluir={async () => {
            setAberta(null);
            const e = await recarregar();
            let p: string | null = null;
            try { p = sessionStorage.getItem(chave(slug)); sessionStorage.removeItem(chave(slug)); } catch { /* ignora */ }
            if ((p === "fa" || p === "curtir" || p === "avaliar" || p?.startsWith("item|")) && e.logado && p) await executar(p, e);
          }}
        />
      )}
    </div>
  );
}

/** Convite "vire fã para curtir" para páginas sem o bloco do clube (ex.: página do item). */
export function PedirFaFolha({ businessId, slug, nome }: { businessId: string; slug: string; nome: string }) {
  const [pedido, setPedido] = useState<PedidoFa | null>(null);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    const ouvir = (ev: Event) => setPedido((ev as CustomEvent<PedidoFa>).detail);
    window.addEventListener("clube:pedir-fa", ouvir);
    return () => window.removeEventListener("clube:pedir-fa", ouvir);
  }, []);

  async function concluir(pd: PedidoFa) {
    const e = await getEu(businessId);
    if (!e.logado || !e.userId) return false;
    await virarFa(businessId, e.userId);
    await curtirMarca(businessId, e.userId, true);
    await curtirAlvo(businessId, e.userId, pd.alvo, pd.id, true);
    await carregarCurtidas(businessId);
    return true;
  }
  async function confirmar() {
    if (!pedido) return;
    if (await concluir(pedido)) { setPedido(null); return; }
    try { sessionStorage.setItem(chave(slug), `item|${pedido.alvo}|${pedido.id}`); } catch { /* ignora */ }
    setEntrando(true);
  }

  return (
    <>
      {pedido && !entrando && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setPedido(null)}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-[400px] rounded-3xl bg-surface-white p-6 text-center shadow-xl">
            <span className="mx-auto flex h-12 w-12 items-center justify-center text-[#F2556B]"><IcCoracao cheio /></span>
            <p className="mt-2 text-[18px] font-semibold text-on-background">Vire fã para curtir</p>
            <p className="mt-1 text-[14px] text-text-secondary">{pedido.titulo ? `Para curtir ${pedido.titulo}, você precisa ser fã de ${nome}.` : `Para curtir, você precisa ser fã de ${nome}.`} {nome} vê o que o público mais gosta.</p>
            <button type="button" onClick={confirmar} className="mt-5 min-h-[48px] w-full rounded-full bg-button-primary text-[15px] font-semibold text-white active:scale-[0.98]">Virar fã e curtir</button>
            <button type="button" onClick={() => setPedido(null)} className="mt-2 min-h-[44px] w-full rounded-full text-[14px] font-medium text-text-secondary">Agora não</button>
          </div>
        </div>
      )}
      {entrando && (
        <EntrarFolha
          slug={slug}
          businessId={businessId}
          aoFechar={() => { setEntrando(false); setPedido(null); }}
          aoConcluir={async () => {
            let p: string | null = null;
            try { p = sessionStorage.getItem(chave(slug)); sessionStorage.removeItem(chave(slug)); } catch { /* ignora */ }
            setEntrando(false);
            const pd = pedido;
            setPedido(null);
            if (pd && p?.startsWith("item|")) await concluir(pd);
          }}
        />
      )}
    </>
  );
}

/** Botão de virar fã usado fora da página inicial (ex.: voucher exclusivo para fãs). */
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
function EntrarFolha({ slug, businessId, aoFechar, aoConcluir }: { slug: string; businessId: string; aoFechar: () => void; aoConcluir: () => void }) {
  const [tel, setTel] = useState("");
  const [nomeTxt, setNomeTxt] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [comEmail, setComEmail] = useState(false);
  const [emailTxt, setEmailTxt] = useState("");
  const [emailEnviado, setEmailEnviado] = useState(false);
  const reduzido = useReduzido();
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
  async function porEmail() {
    setOcupado(true); setErro(null);
    const e = await entrarComEmail(slug, emailTxt);
    setOcupado(false);
    if (e) return setErro(e);
    setEmailEnviado(true);
  }
  // Só nome e WhatsApp, sem código: já vira fã e fica reconhecido neste aparelho em todos os Orbiboxes.
  async function entrar() {
    if (!nomeTxt.trim()) return setErro("Diga como quer ser chamado.");
    if (tel.replace(/\D/g, "").length < 10) return setErro("Digite o número com DDD.");
    setOcupado(true); setErro(null);
    const e = await entrarComNumero(businessId, nomeTxt, telefone);
    setOcupado(false);
    if (e) return setErro(e);
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
        aria-label="Entrar no radar de fãs"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-t-[32px] bg-background-main px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-12px_40px_rgba(0,0,0,0.2)]"
        style={reduzido ? undefined : { animation: "cl-sobe .42s cubic-bezier(.22,1,.36,1) both" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-manrope)] text-[20px] font-extrabold tracking-[-0.02em]">
              Entrar no radar de fãs
            </h2>
            <p className="mt-1 text-[14px] text-text-secondary">
              Vire fã, ganhe vantagens exclusivas e avalie com rosto e nome.
            </p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="cl-x active:scale-95">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <button type="button" onClick={google} disabled={ocupado} className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full bg-surface-white text-[15px] font-semibold ring-1 ring-divider active:scale-[0.98] disabled:opacity-50">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
            Continuar com Google
          </button>
          {emailEnviado ? (
            <p className="rounded-2xl bg-surface-soft px-4 py-3 text-center text-[14px] leading-snug text-text-secondary">Enviamos um link para {emailTxt.trim()}. Abra o e-mail neste aparelho para concluir.</p>
          ) : comEmail ? (
            <>
              <p className="text-center text-[12.5px] text-text-tertiary">ou entre com seu e-mail</p>
              <label className="sr-only" htmlFor="clube-email">Seu e-mail</label>
              <input id="clube-email" type="email" className={campo} inputMode="email" autoComplete="email" placeholder="voce@email.com" value={emailTxt} onChange={(e) => setEmailTxt(e.target.value)} />
              <button type="button" onClick={porEmail} disabled={ocupado} className={botao}>{ocupado ? "Enviando..." : "Enviar link"}</button>
              <button type="button" onClick={() => { setComEmail(false); setErro(null); }} className="min-h-[40px] text-[14px] font-medium text-text-secondary">Usar WhatsApp</button>
            </>
          ) : (
            <>
              <p className="text-center text-[12.5px] text-text-tertiary">ou deixe seu WhatsApp</p>
              <label className="sr-only" htmlFor="clube-nome">Seu nome</label>
              <input id="clube-nome" className={campo} autoComplete="name" placeholder="Seu nome" value={nomeTxt} onChange={(e) => setNomeTxt(e.target.value)} />
              <label className="sr-only" htmlFor="clube-tel">Seu WhatsApp com DDD</label>
              <input id="clube-tel" className={campo} inputMode="tel" autoComplete="tel" placeholder="(11) 90000-0000" value={tel} onChange={(e) => setTel(e.target.value)} />
              <button type="button" onClick={entrar} disabled={ocupado} className={botao}>{ocupado ? "Entrando..." : "Entrar"}</button>
              <button type="button" onClick={() => { setComEmail(true); setErro(null); }} className="min-h-[40px] text-[14px] font-medium text-text-secondary">Entrar com e-mail</button>
            </>
          )}
          {erro && <p role="alert" className="text-center text-[13.5px] text-[#C2362E]">{erro}</p>}
          <p className="text-center text-[12px] leading-snug text-text-tertiary">
            Ao entrar, você aceita receber novidades da marca no WhatsApp. Seu número nunca aparece para outros clientes e você pode desligar quando quiser.
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
  const [confirmaExcluir, setConfirmaExcluir] = useState(false);

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
    if (!ok) return setMsg("Não consegui enviar a avaliação. Tente de novo.");
    setMsg("Obrigado! Sua avaliação já aparece na lista.");
    await Promise.all([carregar(), aoMudar()]);
  }
  async function excluir() {
    if (!eu.userId) return;
    setEnviando(true);
    const ok = await excluirAvaliacao(businessId, eu.userId);
    setEnviando(false);
    setConfirmaExcluir(false);
    if (!ok) return setMsg("Não consegui excluir. Tente de novo.");
    setNota(0); setComent("");
    setMsg("Avaliação excluída.");
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
          <Cabecalho titulo="Avaliações" sub="O que os fãs dizem" fechar={fechar} />
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-1">
            <div className="cl-entra grid grid-cols-[auto_1fr] items-center gap-5 rounded-[22px] bg-surface-white p-4 ring-1 ring-divider" style={{ ["--i" as string]: 1 }}>
              <div>
                <div className="font-[family-name:var(--font-manrope)] text-[44px] font-medium leading-none tracking-[-0.04em] tabular-nums" style={{ color: "#17181B" }}>
                  {resumo.nota != null ? fmtNota(resumo.nota) : "-"}
                </div>
                <div className="mt-1.5 flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Estrela key={n} cheia={n <= Math.round(resumo.nota ?? 0)} />)}</div>
                <p className="mt-1.5 text-[12.5px] text-text-tertiary">{resumo.avaliacoes} {resumo.avaliacoes === 1 ? "avaliação" : "avaliações"}</p>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map((n, k) => (
                  <div key={n} className="grid grid-cols-[12px_1fr_26px] items-center gap-2 text-[12px] tabular-nums text-text-tertiary">
                    <span>{n}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-surface-soft"><span className="cl-fill block" style={{ ["--w" as string]: resumo.distribuicao[n - 1] / max, ["--i" as string]: k, background: "#FF9A3C" }} /></span>
                    <span>{resumo.distribuicao[n - 1]}</span>
                  </div>
                ))}
              </div>
            </div>

            {lista === null && <p className="py-6 text-center text-[14px] text-text-tertiary">Carregando...</p>}
            {lista?.map((r, k) => (
              <article key={r.id} className="cl-entra rounded-[22px] bg-surface-white p-4 ring-1 ring-divider" style={{ ["--i" as string]: k + 3 }}>
                <div className="flex items-center gap-3">
                  <Rosto url={r.foto_url} nome={r.nome} size={38} />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium leading-tight">{r.nome || "Cliente"}</span>
                    <small className="mt-0.5 block text-[12px] text-text-tertiary">{new Date(r.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</small>
                  </div>
                  <div className="flex gap-0.5" role="img" aria-label={`${r.nota} de 5 estrelas`}>{[1, 2, 3, 4, 5].map((n) => <Estrela key={n} cheia={n <= r.nota} tam={15} />)}</div>
                </div>
                {r.comentario ? <p className="mt-2.5 text-[14px] leading-snug text-text-secondary">{r.comentario}</p> : null}
                {r.resposta_dono ? (
                  <div className="mt-2.5 rounded-2xl bg-surface-soft px-3 py-2.5 text-[13.5px] leading-snug">
                    <span className="mb-0.5 block text-[11.5px] uppercase tracking-wide text-text-tertiary">Resposta da marca</span>{r.resposta_dono}
                  </div>
                ) : null}
                {isOwner && respondendo !== r.id && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {!r.resposta_dono && <button type="button" className="min-h-[36px] rounded-full bg-surface-soft px-3.5 text-[13px]" onClick={() => { setRespondendo(r.id); setTextoResp(""); }}>Responder</button>}
                    <button type="button" className="min-h-[36px] rounded-full bg-surface-soft px-3.5 text-[13px] disabled:opacity-50" disabled={revisadas.includes(r.id)} onClick={async () => { await pedirRevisao(r.id); setRevisadas((v) => [...v, r.id]); }}>
                      {revisadas.includes(r.id) ? "Revisão pedida" : "Pedir revisão"}
                    </button>
                  </div>
                )}
                {isOwner && respondendo === r.id && (
                  <div className="mt-2.5 flex gap-2">
                    <input aria-label="Sua resposta" autoFocus maxLength={300} value={textoResp} onChange={(e) => setTextoResp(e.target.value)} placeholder="Escreva a resposta" className="min-h-[40px] min-w-0 flex-1 rounded-full border border-divider bg-background-main px-4 text-[14px] outline-none" />
                    <button type="button" onClick={() => enviarResposta(r.id)} className="min-h-[40px] rounded-full bg-[#14161A] px-4 text-[13px] text-white">Enviar</button>
                  </div>
                )}
              </article>
            ))}
            {lista?.length === 0 && <p className="py-4 text-center text-[14px] text-text-tertiary">Ainda não há avaliações. A primeira pode ser sua.</p>}

            {!isOwner && (
              <div className="cl-entra rounded-[22px] bg-surface-white p-4 ring-1 ring-divider" style={{ ["--i" as string]: 8 }}>
                <p className="text-[15px] font-medium">{eu.minhaAvaliacao ? "Sua avaliação" : "Avaliar esta marca"}</p>
                {!eu.logado ? (
                  <>
                    <p className="mt-1 text-[13.5px] text-text-secondary">Entre com Google ou WhatsApp para deixar sua nota e seu comentário.</p>
                    <button type="button" onClick={pedirLogin} className="mt-3 min-h-[48px] w-full rounded-full bg-button-primary text-[15px] font-semibold text-white active:scale-[0.98]">Entrar para avaliar</button>
                  </>
                ) : !eu.podeAvaliar && !eu.minhaAvaliacao ? (
                  <p className="mt-1 text-[13.5px] text-text-secondary">Não foi possível liberar a avaliação agora. Tente entrar de novo.</p>
                ) : (
                  <>
                    <div className="mt-2 flex justify-center gap-1" role="radiogroup" aria-label="Sua nota">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`} onClick={() => setNota(n)} className="grid h-10 w-10 place-items-center rounded-full active:scale-90">
                          <Estrela cheia={n <= nota} tam={26} />
                        </button>
                      ))}
                    </div>
                    <label htmlFor="clube-coment" className="sr-only">Comentário</label>
                    <textarea id="clube-coment" rows={2} maxLength={400} value={coment} onChange={(e) => setComent(e.target.value)} placeholder="Conte como foi (opcional)" className="mt-2 w-full resize-none rounded-2xl border border-divider bg-background-main px-4 py-3 text-[15px] outline-none focus:border-on-background" />
                    <div className="mt-2 flex flex-col gap-1">
                      <label className="flex min-h-[40px] items-center justify-between gap-3 text-[14px] text-text-secondary">Aparecer com meu nome completo<input type="checkbox" checked={completo} onChange={(e) => setCompleto(e.target.checked)} className="h-5 w-5 accent-[#14161A]" /></label>
                      <label className="flex min-h-[40px] items-center justify-between gap-3 text-[14px] text-text-secondary">Mostrar minha foto<input type="checkbox" checked={foto} onChange={(e) => setFoto(e.target.checked)} className="h-5 w-5 accent-[#14161A]" /></label>
                    </div>
                    <button type="button" onClick={enviar} disabled={enviando || nota < 1} className="mt-2 min-h-[46px] w-full rounded-full bg-button-primary text-[15px] font-medium text-white disabled:opacity-50 active:scale-[0.98]">
                      {enviando ? "Enviando..." : eu.minhaAvaliacao ? "Atualizar avaliação" : "Enviar avaliação"}
                    </button>
                    {eu.minhaAvaliacao && (confirmaExcluir ? (
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <span className="text-[13px] text-text-secondary">Excluir sua avaliação?</span>
                        <button type="button" onClick={excluir} disabled={enviando} className="min-h-[36px] rounded-full bg-[#E5484D] px-4 text-[13px] font-semibold text-white disabled:opacity-50">Excluir</button>
                        <button type="button" onClick={() => setConfirmaExcluir(false)} className="min-h-[36px] rounded-full bg-[#F2F2EE] px-4 text-[13px]">Cancelar</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmaExcluir(true)} className="mt-2 min-h-[40px] w-full rounded-full text-[13.5px] font-medium text-[#E5484D]">Excluir minha avaliação</button>
                    ))}
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
const CAP_ANEL = [6, 9, 12];
const TAM = [46, 40, 36];

/** Linha de ajuste com chave liga/desliga (um toque em qualquer parte da linha). */
function LinhaAjuste({ titulo, ligado, ocupado, aoAlternar }: { titulo: string; detalhe?: string; ligado: boolean; ocupado: boolean; aoAlternar: () => void; separador?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={titulo}
      disabled={ocupado}
      onClick={aoAlternar}
      className="flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1.5 px-2 py-2 text-center active:bg-surface-soft disabled:opacity-60"
    >
      <span aria-hidden className={`relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors ${ligado ? "bg-[#111318]" : "bg-[#E4E2DC]"}`}>
        <span className={`absolute top-[2.5px] h-[15px] w-[15px] rounded-full bg-white shadow transition-all ${ligado ? "left-[16.5px]" : "left-[2.5px]"}`} />
      </span>
      <span className="block text-[13px] font-normal leading-tight text-on-background">{titulo}</span>
    </button>
  );
}

function FasFolha({ origem, businessId, slug, nome, logoUrl, heroAvatar, eu, isOwner, resumo, aoFechar, aoMudar, pedirLogin, confirmarWhats }: {
  origem: DOMRect | null; businessId: string; slug: string; nome: string; logoUrl: string | null; heroAvatar: string | null; eu: Eu; isOwner: boolean; resumo: Resumo;
  aoFechar: () => void; aoMudar: () => Promise<Eu>; pedirLogin: (el: DOMRect) => void; confirmarWhats: () => void;
}) {
  const [fas, setFas] = useState<FaLite[] | null>(null);
  const [fa, setFa] = useState<FaLite | null>(null);
  // Radar de descobrir: logos de todos os Orbibox ativos.
  const router = useRouter();
  const [descobrindo, setDescobrindo] = useState(false);
  const [ativos, setAtivos] = useState<OrbiboxAtivo[] | null>(null);
  function abrirDescobrir() {
    setDescobrindo(true);
    if (ativos === null) getOrbiboxAtivos().then(setAtivos);
  }
  const itensAtivos: ItemOrbita[] = useMemo(() => {
    const out: ItemOrbita[] = [];
    let anel = 0, noAnel = 0;
    for (const b of (ativos ?? []).filter((x) => x.slug !== slug)) {
      if (noAnel >= CAP_ANEL[anel]) { anel++; noAnel = 0; }
      if (anel > 2) break;
      const s = TAM[anel] + 6 - (noAnel % 3) * 3;
      out.push({
        key: b.id, size: s, anel, legenda: b.name, rotulo: `Abrir ${b.name}`,
        aoTocar: () => router.push(`/${b.slug}`),
        node: (
          <span className="grid place-items-center overflow-hidden rounded-full bg-white shadow-[0_6px_16px_-8px_rgba(17,19,24,0.4)] ring-1 ring-divider" style={{ width: s, height: s }}>
            {b.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logo_url} alt="" className="h-full w-full object-contain p-1.5" />
            ) : <span className="text-[13px] text-text-secondary">{b.name.charAt(0).toUpperCase()}</span>}
          </span>
        ),
      });
      noAnel++;
    }
    return out;
  }, [ativos, slug, router]);
  const [marcas, setMarcas] = useState<MarcaDoFa[] | null>(null);
  /** Nota e texto que este fã deu a cada marca (id da marca → avaliação). */
  const [notasFa, setNotasFa] = useState<Record<string, { nota: number; comentario: string | null }>>({});
  const [notaMarca, setNotaMarca] = useState<{ marca: MarcaDoFa; nota: number } | null>(null);
  /** Avaliações de uma marca da lista do fã: a do dono do perfil vem primeiro e a nota média fica fixa no topo. */
  const [avMarca, setAvMarca] = useState<{ marca: MarcaDoFa; lista: Avaliacao[] | null; resumo: Resumo | null } | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [contatos, setContatos] = useState<ContatoWhats[] | null>(null);
  const [verContatos, setVerContatos] = useState(false);
  const [afins, setAfins] = useState<MarcaAfim[]>([]);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  // Foto de perfil: primeiro recorta (redondo), depois ajusta luz, contraste, cor etc.
  const [fotoParaCortar, setFotoParaCortar] = useState<File | null>(null);
  const [salvandoAjuste, setSalvandoAjuste] = useState<"whats" | "marcas" | null>(null);
  const [avisoAjuste, setAvisoAjuste] = useState<string | null>(null);

  async function enviarMinhaFoto(arq: File) {
    if (!eu.userId) return;
    setEnviandoFoto(true);
    try { await enviarFotoPerfil(eu.userId, arq); } catch { /* mantém a foto atual */ }
    setEnviandoFoto(false);
    await aoMudar();
    getFas(businessId).then(setFas);
  }

  async function alternarWhats() {
    if (!eu.userId || salvandoAjuste) return;
    const ligar = !eu.aceiteWhatsapp;
    if (ligar && !eu.telefoneVerificado && !eu.contatoWhatsapp) return confirmarWhats();
    setSalvandoAjuste("whats");
    setAvisoAjuste(null);
    await aceitarWhatsapp(businessId, eu.userId, ligar);
    const novo = await aoMudar();
    setSalvandoAjuste(null);
    if (novo.aceiteWhatsapp !== ligar) setAvisoAjuste("Não consegui salvar essa escolha agora. Tente de novo.");
  }

  useEffect(() => {
    let vivo = true;
    getAfinidade(businessId).then((l) => { if (vivo) setAfins(l); });
    getFas(businessId).then((l) => { if (vivo) setFas(l); });
    getAvaliacoes(businessId).then((l) => { if (vivo) setAvaliacoes(l); });
    if (isOwner) getContatos(businessId).then((c) => { if (vivo) setContatos(c); });
    return () => { vivo = false; };
  }, [businessId, isOwner]);

  async function abrirFa(f: FaLite) {
    setFa(f); setMarcas(null); setNotasFa({}); setAvMarca(null);
    const ms = await getMarcasDoFa(f.id);
    setMarcas(ms);
    // As avaliações são públicas: pega a de cada marca e fica com a deste fã.
    const pares = await Promise.all(ms.map(async (m) => {
      const r = (await getAvaliacoes(m.id)).find((a) => a.customer_id === f.id);
      return r ? ([m.id, { nota: r.nota, comentario: r.comentario }] as const) : null;
    }));
    setNotasFa(Object.fromEntries(pares.filter((x) => x !== null)));
  }

  async function abrirAvaliacoesMarca(m: MarcaDoFa) {
    if (!fa) return;
    const donoId = fa.id;
    setAvMarca({ marca: m, lista: null, resumo: null });
    const [todas, resumoM] = await Promise.all([getAvaliacoes(m.id), getResumo(m.id)]);
    const ordenada = [...todas.filter((a) => a.customer_id === donoId), ...todas.filter((a) => a.customer_id !== donoId)];
    setAvMarca((v) => (v && v.marca.id === m.id ? { marca: m, lista: ordenada, resumo: resumoM } : v));
  }

  const itens: ItemOrbita[] = useMemo(() => {
    const lista = fas ?? [];
    const out: ItemOrbita[] = [];
    let anel = 0, noAnel = 0;
    for (const f of lista) {
      if (noAnel >= CAP_ANEL[anel]) { anel++; noAnel = 0; }
      if (anel > 2) break;
      const s = TAM[anel] - (noAnel % 3) * 3;
      out.push({ key: f.id, size: s, anel, legenda: f.nome, rotulo: `Fã ${f.nome ?? ""}`, aoTocar: () => void abrirFa(f), node: <Rosto url={f.foto_url} nome={f.nome} size={s} blob aro={f.nivel != null ? NIVEIS[Math.min(3, Math.max(0, f.nivel))].cor : undefined} /> });
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

  const avaliacaoDoFa = fa ? avaliacoes.find((a) => a.customer_id === fa.id) ?? null : null;

  return (
    <Folha origem={origem} aoFechar={aoFechar} rotulo="Fãs da marca">
      {(fechar) => (
        <>
          <div className="cl-entra flex items-start justify-between gap-3 px-5 pb-3 pt-[max(18px,env(safe-area-inset-top))]" style={{ ["--i" as string]: 0 }}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] uppercase tracking-[0.16em] text-text-tertiary">{resumo.fas === 0 ? "Seja o primeiro fã" : `Radar de fãs de ${nome}`}</p>
              <div className="mt-2 flex items-center gap-4">
                <h2 className="flex items-baseline gap-2 font-[family-name:var(--font-manrope)] font-light tracking-[-0.03em] text-on-background">
                  <span className="text-[60px] leading-[0.9] tabular-nums">{resumo.fas}</span>
                  <span className="text-[18px] font-normal tracking-normal text-text-secondary">{resumo.fas === 1 ? "fã" : "fãs"}</span>
                </h2>
                {resumo.recentes.length > 0 && (
                  <div className="flex" aria-hidden>
                    {resumo.recentes.slice(0, 4).map((r, i) => (
                      <span key={r.id} className="-ml-2.5 rounded-full ring-2 ring-[var(--background-main,#fff)] first:ml-0" style={{ zIndex: 4 - i }}>
                        <Rosto url={r.foto} nome={r.nome} size={34} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button type="button" onClick={fechar} aria-label="Fechar" className="-mr-1 grid h-11 w-11 flex-none place-items-center rounded-full text-on-background active:scale-95">
              <IcX />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center px-2 pt-2">
            {fas === null ? (
              <p className="text-center text-[14px] text-text-tertiary">Carregando...</p>
            ) : fas.length === 0 ? (
              <p className="px-8 text-center text-[15px] text-text-secondary">Ainda não há fãs visíveis. Seja o primeiro.</p>
            ) : (
              <Orbita
                itens={itens}
                aneis={ANEIS}
                centro={logoUrl ? <OrbiAvatar logoUrl={logoUrl} size={96} esfera={esfera?.tom} escala={esfera?.escala ?? lerLogoEscala(heroAvatar) ?? 100} /> : <Rosto nome={nome} size={92} className="shadow-[0_10px_34px_rgba(0,0,0,0.25)]" />}
              />
            )}
          </div>
          <div className="cl-entra px-6 text-center" style={{ ["--i" as string]: 5 }}>
            {afins.length > 0 && (
              <div className="mx-auto mb-3 max-w-[340px]">
                <p className="text-[12.5px] text-text-secondary">
                  {afins[0].fas} {afins[0].fas === 1 ? "fã deste radar também gosta" : "fãs deste radar também gostam"} de <b className="font-semibold text-on-background">{afins[0].name}</b>
                  {afins.length > 1 ? <>{afins.length > 2 ? ", " : " e "}<b className="font-semibold text-on-background">{afins[1].name}</b></> : null}
                  {afins.length > 2 ? <> e <b className="font-semibold text-on-background">{afins[2].name}</b></> : null}
                </p>
                <ul className="mt-2 flex flex-wrap justify-center gap-2">
                  {afins.slice(0, 6).map((m) => (
                    <li key={m.id}>
                      <a href={`/${m.slug}`} className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-surface-white py-1 pl-1 pr-3 text-[12.5px] font-semibold ring-1 ring-divider active:scale-95">
                        <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-divider">
                          {m.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.logo_url} alt="" className="h-full w-full object-contain p-0.5" />
                          ) : <span className="text-[11px] font-extrabold">{m.name.charAt(0).toUpperCase()}</span>}
                        </span>
                        {m.name}<span className="text-text-tertiary tabular-nums">{m.fas}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
            
          </div>
          <div className="cl-entra relative z-10 flex flex-col items-center gap-2 px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-2" style={{ ["--i" as string]: 6 }}>
            {isOwner ? (
              <>
              <BotaoCompartilhar
                alvo={{ url: `/${slug}?clube=avaliar`, titulo: "Avaliação", rotulo: "Avaliação", marca: nome, imagem: logoUrl, logo: logoUrl, texto: `Queremos uma avaliação sua no nosso Orbibox. Leva 1 minuto:` }}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-surface-soft px-6 text-[15px] font-normal text-on-background ring-1 ring-divider active:scale-[0.98]"
              >
                <span>Pedir avaliação</span>
              </BotaoCompartilhar>
              <button type="button" onClick={() => setVerContatos(true)} className="min-h-[48px] rounded-full bg-button-primary px-6 text-[15px] font-semibold text-white active:scale-[0.98]">
                Contatos no WhatsApp{contatos ? ` (${contatos.length})` : ""}
              </button>
              </>
            ) : (
              <>
                {!eu.ehFa && <button
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
                </button>}
                <BotaoCompartilhar
                  alvo={{ url: `/${slug}`, titulo: nome, rotulo: "Radar de fãs", marca: nome, imagem: logoUrl, logo: logoUrl, texto: `Conhece ${nome}? Dá uma olhada:` }}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-[14px] font-normal text-text-secondary active:scale-[0.98]"
                >
                  <span>Convidar um amigo</span>
                </BotaoCompartilhar>
                {eu.logado && eu.userId && (
                  <div className="mt-2 flex w-full max-w-[360px] items-stretch divide-x divide-divider overflow-hidden rounded-[24px] bg-white ring-1 ring-divider">
                    {eu.ehFa && (
                      <>
                        <LinhaAjuste
                          titulo="WhatsApp"
                          detalhe={`Promoções e avisos de ${nome}`}
                          ligado={eu.aceiteWhatsapp}
                          ocupado={salvandoAjuste === "whats"}
                          aoAlternar={alternarWhats}
                        />
                      </>
                    )}
                    <label className="flex min-h-[64px] flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 px-2 py-2 text-center active:bg-surface-soft">
                      <Rosto url={eu.foto} nome={eu.nome} size={22} />
                      <span className="block text-[13px] font-normal leading-tight text-on-background">{enviandoFoto ? "Enviando…" : "Minha foto"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const arq = e.target.files?.[0];
                          e.target.value = "";
                          if (!arq || !eu.userId) return;
                          setFotoParaCortar(arq);
                        }}
                      />
                    </label>
                  </div>
                )}
                {avisoAjuste && <p role="alert" className="max-w-[340px] text-center text-[13px] text-[#C2362E]">{avisoAjuste}</p>}
                {fotoParaCortar && createPortal(
                  <ImageCropModal
                    file={fotoParaCortar}
                    lockedRatio="quadrado"
                    lockedReason="Sua foto aparece redonda. Arraste e aproxime para enquadrar."
                    redonda
                    camada="z-[160]"
                    onCancel={() => setFotoParaCortar(null)}
                    onConfirm={(blob) => {
                      const arquivo = new File([blob], blob.type === "image/webp" ? "minha-foto.webp" : "minha-foto.jpg", { type: blob.type || "image/jpeg" });
                      setFotoParaCortar(null);
                      void enviarMinhaFoto(arquivo);
                    }}
                  />,
                  document.body,
                )}
                {eu.logado && (
                  <button type="button" onClick={async () => { await sairDoClube(); window.location.reload(); }} className="mt-1 min-h-[44px] text-[13px] text-text-tertiary underline underline-offset-4">
                    Sair da minha conta de fã
                  </button>
                )}
              </>
            )}
          </div>

          {/* Painel do fã: marcas de que ele é fã e a avaliação dele */}
          <div className={`cl-camada ${fa ? "on" : ""}`} aria-hidden={!fa}>
            {fa && (
              <>
                <Cabecalho titulo="Perfil do fã" sub={`Radar de fãs de ${nome}`} fechar={() => setFa(null)} rotuloFechar="Voltar aos fãs" />
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
                  <div className="flex flex-col items-center px-1 pb-2 pt-4 text-center">
                    <Rosto url={fa.foto_url} nome={fa.nome} size={96} blob aro={fa.nivel != null ? NIVEIS[Math.min(3, Math.max(0, fa.nivel))].cor : undefined} />
                    {!!eu.userId && eu.userId === fa.id && (
                      <label className="mt-3 inline-flex min-h-[40px] cursor-pointer items-center rounded-full bg-surface-soft px-5 text-[14px] text-on-background active:scale-95">
                        {enviandoFoto ? "Enviando…" : "Trocar foto de perfil"}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const arq = e.target.files?.[0];
                            e.target.value = "";
                            if (!arq) return;
                            setFotoParaCortar(arq);
                          }}
                        />
                      </label>
                    )}
                    <p className="mt-3 max-w-full truncate font-[family-name:var(--font-manrope)] text-[24px] font-normal tracking-[-0.02em]">{fa.nome || "Fã"}</p>
                    <p className="mt-0.5 text-[13.5px] text-text-secondary">
                      Fã de {nome}{marcas && marcas.length > 1 ? ` e de mais ${marcas.length - 1} ${marcas.length - 1 === 1 ? "marca" : "marcas"}` : ""}
                    </p>
                    {fa.nivel != null && (
                      <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-normal" style={{ background: `${NIVEIS[Math.min(3, Math.max(0, fa.nivel))].cor}1F`, color: NIVEIS[Math.min(3, Math.max(0, fa.nivel))].cor }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: NIVEIS[Math.min(3, Math.max(0, fa.nivel))].cor }} aria-hidden />
                        {["Acabou de chegar", "Curtiu a marca", "Já comprou", "Já avaliou"][Math.min(3, Math.max(0, fa.nivel))]}
                      </span>
                    )}
                  </div>

                  {avaliacaoDoFa && (
                    <div className="mt-4 rounded-[28px] bg-surface-white p-5 ring-1 ring-divider">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-[13px] text-text-secondary">Avaliação de {nome}</p>
                        <span className="flex-none text-[22px] font-normal leading-none tracking-[-0.02em] tabular-nums">{avaliacaoDoFa.nota}<span className="text-[14px] text-text-tertiary">/5</span></span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5" aria-label={`Nota ${avaliacaoDoFa.nota} de 5`}>
                        {[1, 2, 3, 4, 5].map((n) => <Estrela key={n} cheia={n <= avaliacaoDoFa.nota} tam={24} />)}
                      </div>
                      {avaliacaoDoFa.comentario ? <p className="mt-4 border-t border-divider pt-4 text-[16px] leading-relaxed text-on-background">{avaliacaoDoFa.comentario}</p> : null}
                      {avaliacaoDoFa.resposta_dono ? (
                        <p className="mt-3 rounded-2xl bg-surface-soft px-4 py-3 text-[14px] leading-snug text-text-secondary"><span className="text-on-background">Resposta da marca:</span> {avaliacaoDoFa.resposta_dono}</p>
                      ) : null}
                    </div>
                  )}

                  <p className="mb-3 mt-8 border-t border-divider px-1 pt-6 text-[13px] text-text-secondary">Marcas que {fa.nome ? `o ${fa.nome}` : "esse fã"} é fã</p>
                  {marcas === null ? (
                    <p className="px-1 text-[14px] text-text-tertiary">Carregando...</p>
                  ) : marcas.length === 0 ? (
                    <p className="rounded-[24px] bg-surface-soft px-4 py-4 text-[14px] leading-snug text-text-secondary">{fa.nome || "Esse fã"} prefere não mostrar de quais outras marcas é fã.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {marcas.map((m) => {
                        const minha = !!eu.userId && eu.userId === fa.id;
                        const nt = notasFa[m.id];
                        return (
                          <li key={m.id} className="rounded-[28px] bg-surface-white p-2.5 ring-1 ring-divider">
                            <button type="button" onClick={() => void abrirAvaliacoesMarca(m)} aria-label={`Ver avaliações de ${m.name}`} className="flex w-full items-center gap-3 rounded-full text-left transition-transform active:scale-[0.99]">
                              <span className="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-full bg-white ring-1 ring-divider">
                                {m.logo_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={m.logo_url} alt="" className="h-full w-full object-contain p-1.5" />
                                ) : <span className="text-[16px] font-normal">{m.name.charAt(0).toUpperCase()}</span>}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[16.5px] font-normal">{m.name}</span>
                                <span className="mt-0.5 block text-[13.5px] text-text-secondary">{m.slug === slug ? "Você está aqui" : "Ver avaliações"}</span>
                              </span>
                              {!minha && nt ? (
                                <span className="flex flex-none items-center gap-0.5" aria-label={`Nota ${nt.nota} de 5`}>
                                  {[1, 2, 3, 4, 5].map((n) => <Estrela key={n} cheia={n <= nt.nota} tam={13} />)}
                                </span>
                              ) : null}
                              <span aria-hidden className="grid h-10 w-6 flex-none place-items-center text-text-tertiary"><IcChev /></span>
                            </button>
                            {minha ? (
                              <div className="mx-2 mt-1.5 flex items-center gap-2 border-t border-divider pt-1.5" role="radiogroup" aria-label={`Sua nota para ${m.name}`}>
                                <span className="mr-auto text-[13.5px] text-text-secondary">Sua nota</span>
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <button key={n} type="button" role="radio" aria-checked={nt?.nota === n} aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"} para ${m.name}`}
                                    onClick={() => setNotaMarca({ marca: m, nota: n })} className="grid h-9 w-8 place-items-center active:scale-90">
                                    <Estrela cheia={n <= (nt?.nota ?? 0)} tam={20} />
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="flex justify-center px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-2">
                  <button type="button" onClick={() => setFa(null)} className="min-h-[48px] rounded-full bg-surface-soft px-7 text-[15px] font-normal active:scale-95">Voltar aos fãs</button>
                </div>
              </>
            )}
          </div>

          {notaMarca && eu.userId && (
            <NotaRapida businessId={notaMarca.marca.id} userId={eu.userId} marca={notaMarca.marca.name} inicial={notaMarca.nota} comentarioInicial={notasFa[notaMarca.marca.id]?.comentario}
              aoFechar={() => setNotaMarca(null)}
              aoSalvar={(nota, comentario) => {
                setNotasFa((v) => ({ ...v, [notaMarca.marca.id]: { nota, comentario: comentario || null } }));
                if (notaMarca.marca.id === businessId) void aoMudar();
              }} />
          )}

          {/* Avaliações de uma marca da lista do fã: a do dono do perfil primeiro, nota média fixa no topo */}
          <div className={`cl-camada ${avMarca ? "on" : ""}`} aria-hidden={!avMarca}>
            {avMarca && (
              <>
                <Cabecalho titulo={avMarca.marca.name} sub="Avaliações" fechar={() => setAvMarca(null)} rotuloFechar="Voltar" />
                <div className="mx-4 mb-2 flex items-center gap-4 rounded-[28px] bg-surface-white px-5 py-3 ring-1 ring-divider">
                  <span className="font-[family-name:var(--font-manrope)] text-[44px] font-extrabold leading-none tracking-[-0.04em] tabular-nums" style={{ background: "var(--cl-orange)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                    {avMarca.resumo?.nota != null ? fmtNota(avMarca.resumo.nota) : "-"}
                  </span>
                  <span className="min-w-0">
                    <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Estrela key={n} cheia={n <= Math.round(avMarca.resumo?.nota ?? 0)} />)}</span>
                    <span className="mt-1 block text-[12.5px] text-text-tertiary">{avMarca.resumo ? `${avMarca.resumo.avaliacoes} ${avMarca.resumo.avaliacoes === 1 ? "avaliação" : "avaliações"}` : "Carregando..."}</span>
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-1">
                  {avMarca.lista === null && <p className="py-6 text-center text-[14px] text-text-tertiary">Carregando...</p>}
                  {avMarca.lista?.length === 0 && <p className="py-6 text-center text-[14px] text-text-secondary">Ainda não há avaliações desta marca.</p>}
                  {avMarca.lista?.map((r, k) => (
                    <div key={r.id}>
                      {k === 0 && fa && r.customer_id === fa.id && <p className="mb-1.5 px-2 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Avaliação de {fa.nome || "esse fã"}</p>}
                      {k > 0 && k === 1 && avMarca.lista![0].customer_id === fa?.id && <p className="mb-1.5 mt-2 px-2 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Outras avaliações</p>}
                      <article className="rounded-[22px] bg-surface-white p-4 ring-1 ring-divider">
                        <div className="flex items-center gap-3">
                          <Rosto url={r.foto_url} nome={r.nome} size={38} />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-[14.5px] font-medium leading-tight">{r.nome || "Cliente"}</span>
                            <small className="mt-0.5 block text-[12px] text-text-tertiary">{new Date(r.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</small>
                          </div>
                          <div className="flex gap-0.5" role="img" aria-label={`${r.nota} de 5 estrelas`}>{[1, 2, 3, 4, 5].map((n) => <Estrela key={n} cheia={n <= r.nota} tam={15} />)}</div>
                        </div>
                        {r.comentario ? <p className="mt-2.5 text-[14px] leading-snug text-text-secondary">{r.comentario}</p> : null}
                        {r.resposta_dono ? (
                          <div className="mt-2.5 rounded-2xl bg-surface-soft px-3 py-2.5 text-[13.5px] leading-snug">
                            <span className="mb-0.5 block text-[11.5px] uppercase tracking-wide text-text-tertiary">Resposta da marca</span>{r.resposta_dono}
                          </div>
                        ) : null}
                      </article>
                    </div>
                  ))}
                  {avMarca.marca.slug !== slug && (
                    <a href={`/${avMarca.marca.slug}`} className="mx-auto mt-2 inline-flex min-h-[44px] items-center rounded-full bg-surface-soft px-6 text-[14px] font-semibold active:scale-95">Abrir {avMarca.marca.name}</a>
                  )}
                </div>
              </>
            )}
            <button type="button" onClick={abrirDescobrir} className="mt-1 flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-[13px] text-text-tertiary active:scale-95">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
              Descobrir
            </button>
          </div>

          {/* Descobrir: o radar com a logo de cada Orbibox ativo */}
          <div className={`cl-camada ${descobrindo ? "on" : ""}`} aria-hidden={!descobrindo}>
            {descobrindo && (
              <>
                <Cabecalho titulo="Descobrir" sub="Os Orbibox que estão no ar. Toque para visitar." fechar={() => setDescobrindo(false)} rotuloFechar="Voltar" />
                <div className="flex min-h-0 flex-1 flex-col justify-center px-2 pb-6">
                  {ativos === null ? (
                    <p className="text-center text-[14px] text-text-tertiary">Procurando...</p>
                  ) : itensAtivos.length === 0 ? (
                    <p className="px-8 text-center text-[15px] text-text-secondary">Ainda não há outros Orbibox no ar.</p>
                  ) : (
                    <Orbita itens={itensAtivos} aneis={ANEIS} centro={<span className="grid h-[88px] w-[88px] place-items-center rounded-full bg-on-background text-center text-[12px] leading-tight text-white">{itensAtivos.length}<br />Orbibox</span>} />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Contatos de WhatsApp (só o dono) */}
          <div className={`cl-camada ${verContatos ? "on" : ""}`} aria-hidden={!verContatos}>
            {verContatos && (
              <>
                <Cabecalho titulo="Contatos no WhatsApp" sub="Só de fãs que aceitaram receber contato" fechar={() => setVerContatos(false)} rotuloFechar="Voltar" />
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


const AVISO_CHAVE = (slug: string) => `clube-validar-${slug}`;

/**
 * Aviso pequeno no canto para quem entrou só com o número: validar o perfil com Google ou e-mail
 * protege a conta (fãs, foto e avaliações) e permite entrar de outro aparelho. Pode dispensar;
 * volta só depois de 3 dias.
 */
function AvisoValidarPerfil({ slug }: { slug: string }) {
  const [visivel, setVisivel] = useState(false);
  const [emailAberto, setEmailAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    try {
      const t = Number(localStorage.getItem(AVISO_CHAVE(slug)) ?? 0);
      if (t && Date.now() - t < 3 * 86400000) return;
    } catch { /* sem armazenamento: mostra */ }
    const id = setTimeout(() => setVisivel(true), 4000);
    return () => clearTimeout(id);
  }, [slug]);

  if (!visivel) return null;
  const dispensar = () => { try { localStorage.setItem(AVISO_CHAVE(slug), String(Date.now())); } catch { /* ignora */ } setVisivel(false); };
  async function porGoogle() { setOcupado(true); setMsg(await entrarComGoogle(slug)); setOcupado(false); }
  async function porEmail() {
    setOcupado(true);
    const e = await entrarComEmail(slug, email);
    setOcupado(false);
    setMsg(e ?? `Enviamos um link para ${email.trim()}. Abra neste aparelho para validar.`);
  }
  const mini = "min-h-[36px] rounded-full px-3.5 text-[12.5px] font-semibold active:scale-95 disabled:opacity-50";
  return (
    <div role="status" className="fixed bottom-4 left-4 z-[45] w-[min(280px,calc(100vw-96px))] rounded-[22px] bg-white p-3 pr-9 text-left shadow-[0_8px_28px_rgba(17,19,24,0.18)] ring-1 ring-divider">
      <button type="button" onClick={dispensar} aria-label="Dispensar aviso" className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full text-text-tertiary active:scale-90">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <p className="text-[13px] font-semibold leading-tight text-on-background">Valide seu perfil</p>
      <p className="mt-0.5 text-[12px] leading-snug text-text-secondary">Com Google ou e-mail, sua conta fica protegida e você entra de outro aparelho.</p>
      {msg ? <p className="mt-2 text-[12px] leading-snug text-text-secondary">{msg}</p> : emailAberto ? (
        <div className="mt-2 flex gap-1.5">
          <input type="email" aria-label="Seu e-mail" inputMode="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-[36px] min-w-0 flex-1 rounded-full border border-divider bg-surface-white px-3 text-[14px] outline-none focus:border-on-background" />
          <button type="button" onClick={porEmail} disabled={ocupado} className={`${mini} bg-button-primary text-white`}>Enviar</button>
        </div>
      ) : (
        <div className="mt-2 flex gap-1.5">
          <button type="button" onClick={porGoogle} disabled={ocupado} className={`${mini} bg-button-primary text-white`}>Google</button>
          <button type="button" onClick={() => setEmailAberto(true)} className={`${mini} bg-surface-soft text-on-background`}>E-mail</button>
        </div>
      )}
    </div>
  );
}

const LINGUA_CHAVE = (slug: string) => `clube-lingua-${slug}`;

/**
 * Língua que sobe de vez em quando, embaixo, convidando o visitante a deixar o contato
 * para receber novidades e promoções. Some se ele já aceitou; depois de dispensada,
 * só volta em 3 dias, no máximo 3 vezes.
 */
function LinguaContato({ nome, slug, ocupado, eu, onQuero }: { nome: string; slug: string; ocupado: boolean; eu: Eu; onQuero: () => void }) {
  const [pronta, setPronta] = useState(false);
  const [aberta, setAberta] = useState(false);
  const jaAceitou = eu.logado && eu.ehFa && eu.aceiteWhatsapp;

  useEffect(() => {
    if (jaAceitou) return;
    let ok = true;
    try {
      const v = JSON.parse(localStorage.getItem(LINGUA_CHAVE(slug)) ?? "null") as { n: number; t: number } | null;
      if (v && (v.n >= 3 || Date.now() - v.t < 3 * 86400000)) ok = false;
    } catch { /* sem armazenamento: mostra */ }
    if (!ok) return;
    const t = setTimeout(() => setPronta(true), 15000);
    return () => clearTimeout(t);
  }, [jaAceitou, slug]);

  const mostrar = pronta && !jaAceitou && !ocupado && !aberta;
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    if (!mostrar) return;
    const q = requestAnimationFrame(() => setVisivel(true));
    return () => cancelAnimationFrame(q);
  }, [mostrar]);

  function dispensar() {
    setAberta(true);
    try {
      const v = JSON.parse(localStorage.getItem(LINGUA_CHAVE(slug)) ?? "null") as { n: number } | null;
      localStorage.setItem(LINGUA_CHAVE(slug), JSON.stringify({ n: (v?.n ?? 0) + 1, t: Date.now() }));
    } catch { /* ignora */ }
  }

  if (!mostrar) return null;
  return createPortal(
    <div
      role="dialog"
      aria-label="Receber novidades e promoções"
      className={`cl-lingua fixed inset-x-0 bottom-0 z-[45] mx-auto w-[min(94vw,400px)] rounded-t-[24px] border border-b-0 border-divider bg-surface-white px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_30px_rgba(17,19,24,0.14)] ${visivel ? "on" : ""}`}
    >
      <p className="text-[15px] font-semibold text-on-background">Quer saber das novidades e promoções?</p>
      <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">Deixe seu contato e {nome} avisa quando tiver algo bom. Só isso, sem spam.</p>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => { dispensar(); onQuero(); }} className="min-h-[44px] flex-1 rounded-full bg-button-primary text-[14px] font-semibold text-white active:scale-[0.98]">Deixar meu contato</button>
        <button type="button" onClick={dispensar} className="min-h-[44px] rounded-full px-4 text-[14px] font-medium text-text-secondary active:scale-[0.98]">Agora não</button>
      </div>
    </div>,
    document.body,
  );
}


/** Folha simples: o fã deixa o número e aceita receber novidades. Sem código de confirmação. */
function ContatoFolha({ businessId, userId, nome, inicial, aoFechar, aoConcluir }: { businessId: string; userId: string; nome: string; inicial: string | null; aoFechar: () => void; aoConcluir: () => void }) {
  const [tel, setTel] = useState(() => (inicial ?? "").replace(/^\+?55/, ""));
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const reduzido = useReduzido();

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") aoFechar(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [aoFechar]);

  async function salvar() {
    if (tel.replace(/\D/g, "").length < 10) return setErro("Digite o número com DDD.");
    setOcupado(true); setErro(null);
    const e = await salvarContatoWhatsapp(businessId, userId, normalizarTelefone(tel));
    setOcupado(false);
    if (e) return setErro(e);
    aoConcluir();
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/40" onClick={aoFechar} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Receber novidades no WhatsApp"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-t-[32px] bg-background-main px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-12px_40px_rgba(0,0,0,0.2)]"
        style={reduzido ? undefined : { animation: "cl-sobe .42s cubic-bezier(.22,1,.36,1) both" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-manrope)] text-[20px] font-extrabold tracking-[-0.02em]">Receber novidades</h2>
            <p className="mt-1 text-[14px] text-text-secondary">Deixe seu WhatsApp e {nome} avisa das novidades e promoções.</p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="cl-x active:scale-95">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <label className="sr-only" htmlFor="clube-contato">Seu WhatsApp com DDD</label>
          <input id="clube-contato" className="min-h-[48px] w-full rounded-full border border-divider bg-surface-white px-4 text-[16px] outline-none focus:border-on-background" inputMode="tel" autoComplete="tel" placeholder="(11) 90000-0000" value={tel} onChange={(e) => setTel(e.target.value)} autoFocus />
          <button type="button" onClick={salvar} disabled={ocupado} className="min-h-[48px] w-full rounded-full bg-button-primary text-[15px] font-semibold text-white disabled:opacity-50 active:scale-[0.98]">{ocupado ? "Salvando..." : "Quero receber"}</button>
          {erro && <p role="alert" className="text-center text-[13.5px] text-[#C2362E]">{erro}</p>}
          <p className="text-center text-[12px] leading-snug text-text-tertiary">
            Seu WhatsApp nunca aparece para outros clientes. Só a marca vê, e você pode parar de receber quando quiser.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* =====================================================================
   Nota rápida: toca numa estrela e abre um box pequeno com as estrelas
   e um texto curto opcional. Serve na página inicial e na lista de marcas do fã.
   ===================================================================== */
export function NotaRapida({ businessId, userId, marca, inicial, comentarioInicial, aoFechar, aoSalvar }: {
  businessId: string; userId: string; marca: string; inicial: number; comentarioInicial?: string | null; aoFechar: () => void; aoSalvar: (nota: number, comentario: string) => void;
}) {
  const [nota, setNota] = useState(inicial);
  const [texto, setTexto] = useState(comentarioInicial ?? "");
  const [escrever, setEscrever] = useState(!!comentarioInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const reduzido = useReduzido();

  const fechar = useCallback(() => {
    if (reduzido) return aoFechar();
    setSaindo(true);
    window.setTimeout(aoFechar, 220);
  }, [aoFechar, reduzido]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [fechar]);

  async function salvar() {
    if (nota < 1) return;
    setEnviando(true); setErro(null);
    const ok = await enviarAvaliacao(businessId, userId, { nota, comentario: texto, completo: false, foto: true });
    setEnviando(false);
    if (!ok) return setErro("Não consegui salvar agora. Se a marca já respondeu sua avaliação, ela não pode mais ser mudada.");
    aoSalvar(nota, texto.trim());
    fechar();
  }

  return createPortal(
    <div className={`nr-fundo ${saindo ? "sai" : ""}`} onClick={fechar}>
      <div role="dialog" aria-modal="true" aria-label={`Sua nota para ${marca}`} onClick={(e) => e.stopPropagation()} className={`nr-box ${saindo ? "sai" : ""}`}>
        <p className="text-center text-[13px] text-text-tertiary">Sua nota para</p>
        <p className="mt-0.5 truncate text-center text-[17px] font-medium text-on-background">{marca}</p>
        <div className="mt-3 flex justify-center gap-1" role="radiogroup" aria-label="Nota">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`} onClick={() => setNota(n)} className="nr-estrela grid h-12 w-12 place-items-center rounded-full">
              <span className={n <= nota ? "nr-on" : ""} style={{ ["--d" as string]: `${(n - 1) * 30}ms` }}><Estrela cheia={n <= nota} tam={32} /></span>
            </button>
          ))}
        </div>
        {escrever ? (
          <>
            <label htmlFor="nr-texto" className="sr-only">Comentário curto</label>
            <textarea id="nr-texto" autoFocus rows={2} maxLength={160} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Conte em poucas palavras (opcional)" className="nr-texto mt-3 w-full resize-none rounded-2xl border border-divider bg-background-main px-4 py-3 text-[16px] outline-none focus:border-on-background" />
            <p className="mt-1 text-right text-[11.5px] tabular-nums text-text-tertiary">{texto.length}/160</p>
          </>
        ) : (
          <button type="button" onClick={() => setEscrever(true)} className="mx-auto mt-2 flex min-h-[44px] items-center px-3 text-[14px] text-text-secondary underline decoration-divider underline-offset-4">Escrever um comentário curto</button>
        )}
        {erro && <p role="alert" className="mt-1 text-center text-[13px] text-[#B42318]">{erro}</p>}
        <button type="button" onClick={salvar} disabled={enviando || nota < 1} className="mt-3 min-h-[50px] w-full rounded-full bg-button-primary text-[15px] font-medium text-white transition-transform disabled:opacity-50 active:scale-[0.98]">
          {enviando ? "Salvando..." : "Salvar nota"}
        </button>
        <button type="button" onClick={fechar} className="mt-1 min-h-[44px] w-full rounded-full text-[14px] text-text-secondary">Agora não</button>
      </div>
    </div>,
    document.body,
  );
}
