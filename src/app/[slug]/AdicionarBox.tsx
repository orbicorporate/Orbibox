"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export type NovoBox = {
  nome: string;
  config: { label: string; subtitle?: string; icon: string; action: "whatsapp" | "endereco" | "avaliar" | "cupom" | "link"; url?: string; color: string };
};

type Preset = {
  id: string;
  titulo: string;
  texto: string;
  nome: string;
  icon: string;
  action: NovoBox["config"]["action"];
  subtitle?: string;
  /** Campo extra que o botão precisa para funcionar. */
  campo?: { rotulo: string; dica: string; inicial: string };
  pedeNome?: boolean;
};

/** Botão que já existe, mas está desligado (ativar), ou que se configura em tela própria (ir). */
export type ExtraBox = { id: string; titulo: string; texto: string; tipo: "ativar" | "ir"; href?: string };

/**
 * Folha "Adicionar botão", aberta direto da Home. Cria o botão já com os
 * padrões certos; depois o dono ajusta cor, ícone e formato pelo lápis do card.
 */
export function AdicionarBox({
  aberto,
  onFechar,
  whatsappInicial,
  enderecoInicial,
  temVouchers,
  extras,
  onAtivar,
  onCriar,
}: {
  aberto: boolean;
  onFechar: () => void;
  whatsappInicial: string;
  enderecoInicial: string;
  temVouchers: boolean;
  extras: ExtraBox[];
  onAtivar: (id: string) => Promise<boolean>;
  onCriar: (b: NovoBox) => Promise<boolean>;
}) {
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [escolhido, setEscolhido] = useState<Preset | null>(null);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const presets: Preset[] = [
    { id: "zap", titulo: "WhatsApp", texto: "Conversa direta", nome: "Fale no WhatsApp", icon: "__wadisc__", action: "whatsapp", subtitle: "Atendimento rápido", campo: { rotulo: "Número com DDD", dica: "11 99999-9999", inicial: whatsappInicial } },
    { id: "link", titulo: "Instagram ou site", texto: "Cole o link", nome: "", icon: "◆", action: "link", pedeNome: true, campo: { rotulo: "Link", dica: "instagram.com/seunegocio", inicial: "" } },
    { id: "end", titulo: "Endereço", texto: "Waze e Maps", nome: "Como chegar", icon: "__pin__", action: "endereco", subtitle: "Veja no mapa", campo: { rotulo: "Endereço", dica: "Rua, número, cidade", inicial: enderecoInicial } },
    { id: "av", titulo: "Avaliação no Google", texto: "Pede as estrelas", nome: "Avalie no Google", icon: "__google__", action: "avaliar", subtitle: "Deixe sua nota, leva 10 segundos", campo: { rotulo: "Link da sua avaliação no Google", dica: "g.page/r/...", inicial: "" } },
    ...(temVouchers ? [{ id: "vou", titulo: "Vouchers", texto: "Ofertas com código", nome: "Vouchers", icon: "__ticket__", action: "cupom" as const, subtitle: "Resgate agora e aproveite" }] : []),
  ];

  function fechar() {
    setEscolhido(null);
    setErro(null);
    setSalvando(false);
    onFechar();
  }

  function escolher(p: Preset) {
    setEscolhido(p);
    setNome(p.nome);
    setValor(p.campo?.inicial ?? "");
    setErro(null);
  }

  async function ativar(id: string) {
    setSalvando(true);
    setErro(null);
    const ok = await onAtivar(id);
    setSalvando(false);
    if (ok) fechar();
    else setErro("Não foi possível ligar. Tente de novo.");
  }

  async function adicionar() {
    if (!escolhido) return;
    const n = nome.trim();
    if (!n) return setErro("Dê um nome ao botão.");
    if (escolhido.campo && !valor.trim()) return setErro(`Preencha: ${escolhido.campo.rotulo.toLowerCase()}.`);
    setSalvando(true);
    const ok = await onCriar({
      nome: n,
      config: { label: n, subtitle: escolhido.subtitle, icon: escolhido.icon, action: escolhido.action, url: escolhido.campo ? valor.trim() : "", color: "transparent" },
    });
    if (ok) fechar();
    else {
      setSalvando(false);
      setErro("Não foi possível adicionar. Tente de novo.");
    }
  }

  if (!aberto || !montado) return null;
  return createPortal(
    <>
      <button type="button" aria-label="Fechar" onClick={fechar} className="fixed inset-0 z-[55] cursor-default bg-black/30" />
      <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-h-[80vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]">
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-medium">{escolhido ? "Novo botão" : "Adicionar botão"}</span>
          <button type="button" onClick={fechar} className="min-h-[40px] rounded-full bg-surface-soft px-5 text-[14px]">Fechar</button>
        </div>
        {!escolhido ? (
          <>
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {extras.map((x) => {
                const cls = "flex min-h-[78px] w-full flex-col justify-center rounded-2xl border border-divider p-3.5 text-left active:bg-surface-soft disabled:opacity-50";
                const conteudo = (
                  <>
                    <span className="block text-[14.5px] font-semibold leading-tight">{x.titulo}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">{x.texto}</span>
                  </>
                );
                return (
                  <li key={x.id}>
                    {x.tipo === "ir" && x.href ? (
                      <Link href={x.href} onClick={fechar} className={cls}>{conteudo}</Link>
                    ) : (
                      <button type="button" disabled={salvando} onClick={() => void ativar(x.id)} className={cls}>{conteudo}</button>
                    )}
                  </li>
                );
              })}
              {presets.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => escolher(p)} className="flex min-h-[78px] w-full flex-col justify-center rounded-2xl border border-divider p-3.5 text-left active:bg-surface-soft">
                    <span className="block text-[14.5px] font-semibold leading-tight">{p.titulo}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">{p.texto}</span>
                  </button>
                </li>
              ))}
            </ul>
            {erro && <p role="alert" className="mt-3 text-[13px] text-red-600">{erro}</p>}
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void adicionar();
            }}
            className="mt-4 flex flex-col gap-3"
          >
            <p className="text-[14px] text-text-secondary">{escolhido.titulo}</p>
            <label className="block">
              <span className="text-[12px] font-medium text-text-tertiary">Nome do botão</span>
              <input value={nome} onChange={(e) => { setNome(e.target.value); setErro(null); }} placeholder={escolhido.pedeNome ? "Ex.: Instagram" : undefined} className="mt-1 w-full rounded-xl border border-divider px-3 py-2.5 text-[16px] outline-none focus:border-on-background" />
            </label>
            {escolhido.campo && (
              <label className="block">
                <span className="text-[12px] font-medium text-text-tertiary">{escolhido.campo.rotulo}</span>
                <input value={valor} onChange={(e) => { setValor(e.target.value); setErro(null); }} placeholder={escolhido.campo.dica} inputMode={escolhido.action === "whatsapp" ? "tel" : "text"} className="mt-1 w-full rounded-xl border border-divider px-3 py-2.5 text-[16px] outline-none focus:border-on-background" />
              </label>
            )}
            {erro && <p className="text-[13px] text-red-600">{erro}</p>}
            <div className="mt-1 flex gap-2">
              <button type="button" onClick={() => { setEscolhido(null); setErro(null); }} className="min-h-[48px] flex-1 rounded-full bg-surface-soft text-[15px]">Voltar</button>
              <button type="submit" disabled={salvando} className="min-h-[48px] flex-[2] rounded-full bg-button-primary text-[15px] font-medium text-white disabled:opacity-50">{salvando ? "Adicionando..." : "Adicionar"}</button>
            </div>
          </form>
        )}
      </div>
    </>,
    document.body,
  );
}
