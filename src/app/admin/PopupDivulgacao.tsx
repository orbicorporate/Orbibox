"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { FolhaCompartilhar, type AlvoCompartilhar } from "@/components/compartilhar/Compartilhar";
import { conferirAntesDeCompartilhar, conferirTour } from "@/components/compartilhar/ChecklistDivulgar";

type Dica = {
  id: string;
  titulo: string;
  texto: string;
  passos?: string[];
  primario: string;
  /** "whatsapp" abre o WhatsApp com a mensagem pronta, "folha" abre o compartilhar (WhatsApp e Stories), "link" leva a uma tela do painel. */
  acao: "whatsapp" | "folha" | "link" | "stories";
  href?: string;
  /** Para onde o compartilhamento aponta (padrão: a página do negócio). */
  caminho?: string;
  mensagem?: string;
  icone: "zap" | "stories" | "voucher" | "estrela";
};

const ESPERA_MS = 20 * 3600 * 1000;
const agora = () => Date.now();

function Icone({ tipo }: { tipo: Dica["icone"] }) {
  const p = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (tipo === "stories") return <svg {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r=".6" fill="currentColor" /></svg>;
  if (tipo === "voucher") return <svg {...p}><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" /><path d="M14 7v10" strokeDasharray="2 2" /></svg>;
  if (tipo === "estrela") return <svg {...p}><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8L12 3.5z" /></svg>;
  return <svg {...p}><path d="M5 19l1.3-3.8A8 8 0 1 1 9.2 18.6L5 19z" /><path d="M9.5 9.5c.4 2 2 3.6 4 4" /></svg>;
}

/**
 * Popups de divulgação: o primeiro aparece quando o dono termina de conferir o
 * passo a passo (compartilhar no WhatsApp e nos Stories). Depois, no máximo um
 * por dia, uma dica de cada vez. O que já foi feito ou adiado fica guardado no aparelho.
 */
export function PopupDivulgacao({ businessId, nome, slug, shareUrl, imagem, logo, temVoucher, itens = [] }: {
  businessId: string; nome: string; slug: string; shareUrl: string; imagem: string | null; logo: string | null; temVoucher: boolean;
  /** Itens publicados do catálogo, para escolher um e compartilhar nos Stories. */
  itens?: { id: string; title: string; image_url: string | null }[];
}) {
  const [dica, setDica] = useState<Dica | null>(null);
  const [folha, setFolha] = useState<AlvoCompartilhar | null>(null);
  const [escolhendoItem, setEscolhendoItem] = useState(false);
  // Entrega do link, com o aviso da capinha do WhatsApp.
  const [entrega, setEntrega] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const chave = `orbibox-divulgar:${businessId}`;

  const dicas: Dica[] = [
    {
      id: "primeiro", titulo: "Seu Orbibox está no ar", icone: "zap",
      texto: "Quanto antes mais gente ver, melhor o seu teste. Mande agora para quem conhece você.",
      passos: ["Grupos de WhatsApp da família e dos amigos", "Clientes e conhecidos que já compram de você", "Depois, os Stories (próxima dica)"],
      primario: "Compartilhar no WhatsApp", acao: "whatsapp",
      mensagem: "Oi, quer conhecer nosso novo Orbibox?",
    },
    {
      id: "stories", titulo: "Que tal compartilhar nos Stories?", icone: "stories",
      texto: itens.length > 0
        ? "Compartilhe o seu Orbibox agora nos Stories. Você pode escolher um item do catálogo ou compartilhar o link do Orbibox completo."
        : "Compartilhe o seu Orbibox agora nos Stories, com o link do Orbibox completo.",
      primario: "Compartilhar o Orbibox completo", acao: "stories",
    },
    temVoucher
      ? { id: "voucher", titulo: "Divulgue o seu voucher", icone: "voucher", texto: "Um voucher no ar atrai quem ainda não conhece você. Mande a página para a sua lista e para os Stories.", primario: "Compartilhar a página", acao: "folha" }
      : { id: "voucher", titulo: "Crie um voucher e divulgue", icone: "voucher", texto: "Uma oferta é o motivo mais fácil para alguém abrir o seu link. Crie em um minuto e compartilhe no WhatsApp e nos Stories.", primario: "Criar meu voucher", acao: "link", href: "/admin/vouchers?novo=1" },
    {
      id: "avaliacao", titulo: "Peça uma avaliação", icone: "estrela",
      texto: "Mande o link para quem já gostou de você. A pessoa abre direto na tela de avaliar, e a nota aparece na sua página.",
      primario: "Pedir avaliação", acao: "folha", caminho: `/${slug}?clube=avaliar`,
      mensagem: `Queremos uma avaliação sua no nosso Orbibox. Leva 1 minuto:`,
    },
  ];

  useEffect(() => {
    // Só pede para divulgar depois que a pessoa mexeu em pelo menos 2 itens da página inicial
    // (o catálogo já é conferido no servidor). Antes disso ela ainda está montando a página.
    try {
      if ((Number(localStorage.getItem(`orbi_mexeu_home_${slug}`)) || 0) < 2) return;
    } catch { return; }
    let estado: { feitas: string[]; ultimo: number } = { feitas: [], ultimo: 0 };
    try { estado = JSON.parse(localStorage.getItem(chave) || "") || estado; } catch { /* primeira vez */ }
    const proxima = dicas.find((d) => !estado.feitas.includes(d.id));
    if (!proxima) return;
    const primeira = estado.feitas.length === 0 && estado.ultimo === 0;
    if (!primeira && agora() - estado.ultimo < ESPERA_MS) return;
    const t = setTimeout(() => setDica(proxima), primeira ? 900 : 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  function guardar(feita: boolean, id: string) {
    try {
      const atual = JSON.parse(localStorage.getItem(chave) || "{}") as { feitas?: string[]; ultimo?: number };
      const feitas = feita ? Array.from(new Set([...(atual.feitas ?? []), id])) : atual.feitas ?? [];
      localStorage.setItem(chave, JSON.stringify({ feitas, ultimo: agora() }));
    } catch { /* sem armazenamento */ }
  }

  function alvoDe(d: Dica): AlvoCompartilhar {
    const url = d.caminho ? `${new URL(shareUrl).origin}${d.caminho}` : shareUrl;
    return { url, titulo: nome, marca: nome, imagem, logo, texto: d.mensagem ?? `Conhece ${nome}? Dá uma olhada:` };
  }

  function fazer(d: Dica) {
    guardar(true, d.id);
    setDica(null);
    if (d.acao === "link" && d.href) return;
    // Antes de divulgar, o checklist confere Catálogo e Home.
    if (d.acao === "whatsapp") {
      const a = alvoDe(d);
      conferirAntesDeCompartilhar(slug, () => { window.open(`https://wa.me/?text=${encodeURIComponent(`${a.texto}\n${a.url}`)}`, "_blank", "noopener"); });
      return;
    }
    if (d.acao === "folha" || d.acao === "stories") conferirAntesDeCompartilhar(slug, () => setFolha(alvoDe(d)));
  }

  function compartilharItem(d: Dica, it: { id: string; title: string; image_url: string | null }) {
    guardar(true, d.id);
    setDica(null);
    setEscolhendoItem(false);
    setFolha({ url: `${new URL(shareUrl).origin}/${slug}/p/${it.id}`, titulo: it.title, rotulo: nome, marca: nome, imagem: it.image_url ?? imagem, logo, texto: `Olha o que tem no ${nome}:` });
  }

  function depois(d: Dica) {
    guardar(false, d.id);
    setDica(null);
    setEscolhendoItem(false);
  }

  return (
    <>
      {dica && dica.id === "primeiro" && createPortal(
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 px-4 pb-[max(20px,env(safe-area-inset-bottom))] sm:items-center" role="dialog" aria-modal="true" aria-label="Seu Orbibox está pronto?" onClick={() => depois(dica)}>
          <div onClick={(e) => e.stopPropagation()} className="acao-entra w-full max-w-[380px] rounded-[32px] bg-surface-white p-6 text-center shadow-[0_24px_60px_rgba(17,19,24,0.3)]">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#E9F8EF] text-[30px]" aria-hidden>🚀</span>
            <p className="mt-4 font-[family-name:var(--font-manrope)] text-[22px] font-normal leading-tight tracking-[-0.01em] text-on-background">Acha que seu Orbibox está pronto?</p>
            <div className="mt-6 flex flex-col gap-2">
              <button type="button" onClick={() => { guardar(true, dica.id); setDica(null); conferirTour(slug, () => setEntrega(true)); }} className="min-h-[52px] w-full rounded-full bg-[#1F9E4C] text-[15px] font-medium text-white active:scale-[0.98]">Quero conferir</button>
              <button type="button" onClick={() => { guardar(true, dica.id); setDica(null); setEntrega(true); }} className="min-h-[50px] w-full rounded-full bg-[#F2F2EE] text-[15px] font-medium text-on-background active:scale-[0.98]">Certeza que sim</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {dica && dica.id !== "primeiro" && createPortal(
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 px-4 pb-[max(20px,env(safe-area-inset-bottom))] sm:items-center" role="dialog" aria-modal="true" aria-label={dica.titulo} onClick={() => depois(dica)}>
          <div onClick={(e) => e.stopPropagation()} className="acao-entra w-full max-w-[380px] rounded-[32px] bg-surface-white p-6 text-center shadow-[0_24px_60px_rgba(17,19,24,0.3)]">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface-soft text-on-background"><Icone tipo={dica.icone} /></span>
            <p className="mt-4 font-[family-name:var(--font-manrope)] text-[22px] font-normal leading-tight tracking-[-0.01em] text-on-background">{dica.titulo}</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-text-secondary">{dica.texto}</p>
            {dica.passos && (
              <ul className="mt-4 space-y-2 text-left">
                {dica.passos.map((p, i) => (
                  <li key={p} className="flex items-center gap-3 text-[13.5px] text-text-secondary">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-soft text-[12px] text-on-background">{i + 1}</span>
                    {p}
                  </li>
                ))}
              </ul>
            )}
            {dica.acao === "stories" ? (
              escolhendoItem ? (
                <div className="mt-5 text-left">
                  <p className="text-[13px] text-text-tertiary">Escolha um item</p>
                  <ul className="mt-2 flex max-h-[260px] flex-col gap-1.5 overflow-y-auto">
                    {itens.map((it) => (
                      <li key={it.id}>
                        <button type="button" onClick={() => compartilharItem(dica, it)} className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl bg-surface-soft px-3 text-left active:scale-[0.99]">
                          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {it.image_url && <img src={it.image_url} alt="" className="h-full w-full object-cover" />}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[14px] text-on-background">{it.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => setEscolhendoItem(false)} className="mt-2 min-h-[40px] text-[13px] text-text-secondary underline underline-offset-2">Voltar</button>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-2">
                  <button type="button" onClick={() => fazer(dica)} className="flex min-h-[50px] w-full flex-col items-center justify-center rounded-full bg-button-primary text-[15px] font-normal text-white active:scale-[0.98]">
                    {dica.primario}
                    <span className="text-[11.5px] text-white/70">Recomendado</span>
                  </button>
                  {itens.length > 0 && (
                    <button type="button" onClick={() => setEscolhendoItem(true)} className="min-h-[46px] w-full rounded-full bg-surface-soft text-[14px] font-normal text-on-background active:scale-[0.98]">Escolher um item do catálogo</button>
                  )}
                </div>
              )
            ) : dica.acao === "link" && dica.href ? (
              <Link href={dica.href} onClick={() => fazer(dica)} className="mt-6 flex min-h-[50px] w-full items-center justify-center rounded-full bg-button-primary text-[15px] font-normal text-white active:scale-[0.98]">{dica.primario}</Link>
            ) : (
              <button type="button" onClick={() => fazer(dica)} className={`mt-6 flex min-h-[50px] w-full items-center justify-center rounded-full text-[15px] font-normal text-white active:scale-[0.98] ${dica.acao === "whatsapp" ? "bg-[#25D366]" : "bg-button-primary"}`}>{dica.primario}</button>
            )}
            <button type="button" onClick={() => depois(dica)} className="mt-1 min-h-[44px] w-full text-[13.5px] text-text-tertiary">Agora não</button>
          </div>
        </div>,
        document.body,
      )}
      {entrega && createPortal(
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 px-4 pb-[max(20px,env(safe-area-inset-bottom))] sm:items-center" role="dialog" aria-modal="true" aria-label="Seu link" onClick={() => setEntrega(false)}>
          <div onClick={(e) => e.stopPropagation()} className="acao-entra w-full max-w-[380px] rounded-[32px] bg-surface-white p-6 text-center shadow-[0_24px_60px_rgba(17,19,24,0.3)]">
            <p className="font-[family-name:var(--font-manrope)] text-[22px] font-normal leading-tight tracking-[-0.01em] text-on-background">Seu link está pronto</p>
            <div className="mt-4 flex items-center gap-2 rounded-full bg-surface-soft p-1.5 pl-4">
              <span className="min-w-0 flex-1 truncate text-left text-[14px] text-on-background">{shareUrl.replace(/^https?:\/\//, "")}</span>
              <button type="button" onClick={() => { void navigator.clipboard?.writeText(shareUrl).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }); }} className="shrink-0 rounded-full bg-on-background px-4 py-2 text-[13px] font-medium text-white active:scale-95">{copiado ? "Copiado" : "Copiar"}</button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl bg-surface-soft text-left">
              {imagem && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagem} alt="" className="h-28 w-full object-cover" />
              )}
              <div className="px-3.5 py-3">
                <p className="text-[14px] text-on-background">{nome}</p>
                <p className="mt-0.5 text-[12.5px] text-text-secondary">Essa é a capinha que aparece quando o link é enviado no WhatsApp.</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={() => { setEntrega(false); window.open(`https://wa.me/?text=${encodeURIComponent(`Oi, quer conhecer nosso novo Orbibox?\n${shareUrl}`)}`, "_blank", "noopener"); }} className="min-h-[52px] w-full rounded-full bg-[#25D366] text-[15px] font-medium text-white active:scale-[0.98]">Compartilhar no WhatsApp</button>
              <Link href="/admin/config/marca" onClick={() => setEntrega(false)} className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#F2F2EE] text-[14.5px] font-medium text-on-background active:scale-[0.98]">Ajustar a capinha</Link>
              <button type="button" onClick={() => setEntrega(false)} className="min-h-[40px] text-[13.5px] text-text-tertiary">Fechar</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {folha && <FolhaCompartilhar alvo={folha} aoFechar={() => setFolha(null)} />}
    </>
  );
}
