"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";

/**
 * Guia passo a passo: ilumina UM botão por vez, diz em uma frase o que fazer
 * e avança sozinho quando a pessoa faz a ação ("clica aqui... agora isso...").
 * Não bloqueia a tela: o botão iluminado é clicável de verdade, o resto só
 * escurece. Aparece sozinho na primeira vez (negócio sem itens) e pode ser
 * reaberto por qualquer botão <GuiaBotao />.
 */

type Passo = {
  /** valor de data-guia do elemento a iluminar */
  alvo: string;
  titulo: string;
  texto: string;
  /** como detectar que a pessoa fez: clique no alvo, ou terminou de digitar nele */
  quando: "clique" | "digitou";
  /** dica quando o alvo ainda não está na tela */
  semAlvo?: string;
};

const PASSOS: Passo[] = [
  { alvo: "novo-item", titulo: "Vamos criar seu primeiro item", texto: "Toque em “Novo item”.", quando: "clique", semAlvo: "Abra o Catálogo para começar." },
  { alvo: "nome-item", titulo: "Dê um nome", texto: "Escreva o nome do produto ou serviço. Depois toque fora do campo.", quando: "digitou", semAlvo: "Toque no item que acabou de criar." },
  { alvo: "texto-orbi", titulo: "Deixa a Orbi escrever", texto: "Toque em “Gerar texto com IA”. Ela escreve a descrição por você.", quando: "clique" },
  { alvo: "foto-item", titulo: "Coloque uma foto", texto: "Toque na área da foto e escolha uma imagem do seu celular.", quando: "clique" },
  { alvo: "previa", titulo: "Veja como o cliente vê", texto: "Toque no celular pequeno para abrir sua página.", quando: "clique", semAlvo: "Toque em “Prévia ao vivo” para abrir." },
];

const CHAVE = "orbi_guia";
const EVENTO = "orbi-guia-iniciar";

type Rect = { top: number; left: number; width: number; height: number };

function lerFeito(): boolean {
  try {
    return localStorage.getItem(CHAVE) === "feito";
  } catch {
    return false;
  }
}
function marcarFeito() {
  try {
    localStorage.setItem(CHAVE, "feito");
  } catch {}
}

/** Botão pequeno pra (re)abrir o guia em qualquer tela. */
export function GuiaBotao({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENTO))}
      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-surface-soft px-4 text-[13.5px] font-medium text-text-secondary active:scale-[0.98] ${className}`}
    >
      <span aria-hidden>?</span> Guia passo a passo
    </button>
  );
}

export function GuiaOrbi({ semItens, slug }: { semItens: boolean; slug: string }) {
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);
  if (!montado) return null;
  return <GuiaInterno semItens={semItens} slug={slug} />;
}

function GuiaInterno({ semItens, slug }: { semItens: boolean; slug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  // Começa sozinho só na primeira vez: negócio sem itens, no Catálogo.
  const [i, setI] = useState<number | null>(() =>
    semItens && !lerFeito() && typeof window !== "undefined" && window.location.pathname.startsWith("/admin/vitrine") ? 0 : null,
  );
  const [rect, setRect] = useState<Rect | null>(null);
  const [copiado, setCopiado] = useState(false);
  const avancando = useRef(false);

  const passo = i !== null && i < PASSOS.length ? PASSOS[i] : null;
  const fim = i !== null && i >= PASSOS.length;

  // Reabrir pelo botão "Guia passo a passo".
  useEffect(() => {
    const abrir = () => {
      avancando.current = false;
      setI(0);
    };
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, []);

  const avancar = useCallback(() => {
    if (avancando.current) return;
    avancando.current = true;
    // Espera a tela reagir à ação (abrir o editor etc.) antes de procurar o próximo alvo.
    window.setTimeout(() => {
      avancando.current = false;
      setI((v) => (v === null ? v : v + 1));
    }, 450);
  }, []);

  // Acompanha o alvo na tela (ele pode aparecer depois, mudar de lugar ou rolar).
  useEffect(() => {
    if (!passo) return;
    let rolou = false;
    const medir = () => {
      const el = document.querySelector(`[data-guia="${passo.alvo}"]`);
      if (!el) {
        setRect((r) => (r === null ? r : null));
        return;
      }
      if (!rolou) {
        rolou = true;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const r = el.getBoundingClientRect();
      setRect((a) =>
        a && Math.abs(a.top - r.top) < 1 && Math.abs(a.left - r.left) < 1 && Math.abs(a.width - r.width) < 1 && Math.abs(a.height - r.height) < 1
          ? a
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      );
    };
    const t = window.setInterval(medir, 250);
    window.setTimeout(medir, 0);
    return () => window.clearInterval(t);
  }, [passo]);

  // Detecta a ação da pessoa.
  useEffect(() => {
    if (!passo) return;
    const alvoDe = (e: Event) => (e.target instanceof Element ? e.target.closest(`[data-guia="${passo.alvo}"]`) : null);
    const aoClicar = (e: Event) => {
      if (passo.quando === "clique" && alvoDe(e)) avancar();
    };
    const aoSair = (e: Event) => {
      if (passo.quando !== "digitou") return;
      const el = alvoDe(e);
      if (!el) return;
      const campo = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el : el.querySelector<HTMLInputElement | HTMLTextAreaElement>("input,textarea");
      const v = campo?.value.trim() ?? "";
      if (v && v !== "Novo item") avancar();
    };
    document.addEventListener("click", aoClicar, true);
    document.addEventListener("focusout", aoSair, true);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      document.removeEventListener("focusout", aoSair, true);
    };
  }, [passo, avancar]);

  function encerrar() {
    marcarFeito();
    setI(null);
    setRect(null);
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
      setCopiado(true);
    } catch {}
  }

  if (i === null) return null;

  const base = "fixed left-1/2 z-[70] w-[92vw] max-w-[380px] -translate-x-1/2 rounded-[26px] bg-surface-white p-5 shadow-[0_16px_44px_rgba(0,0,0,0.3)]";

  if (fim) {
    return createPortal(
      <div className="fixed inset-0 z-[70]">
        <div className="fixed inset-0 bg-[#0B0C10]/60" />
        <div className={`${base} top-1/2 -translate-y-1/2 text-center`}>
          <p className="text-[34px]" aria-hidden>🎉</p>
          <p className="mt-1 font-[family-name:var(--font-manrope)] text-[22px] font-medium tracking-[-0.01em]">Pronto!</p>
          <p className="mt-1 text-[16px] leading-snug text-text-secondary">Seu primeiro item está no ar. Agora é só compartilhar o seu link.</p>
          <button onClick={copiarLink} className="mt-5 min-h-[52px] w-full rounded-full bg-button-primary text-[16px] font-medium text-white">
            {copiado ? "Link copiado ✓" : "Copiar meu link"}
          </button>
          <button onClick={encerrar} className="mt-2 min-h-[44px] w-full text-[15px] text-text-secondary">Fechar</button>
        </div>
      </div>,
      document.body,
    );
  }
  if (!passo) return null;

  // Fora do Catálogo, o primeiro passo leva a pessoa até lá.
  const foraDoCatalogo = i === 0 && !pathname.startsWith("/admin/vitrine");
  const cardTop = rect
    ? rect.top + rect.height + 18 + 190 > window.innerHeight
      ? Math.max(rect.top - 18 - 190, 12)
      : rect.top + rect.height + 18
    : undefined;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {rect && !foraDoCatalogo ? (
        <div
          className="fixed rounded-[18px] transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(11,12,16,0.62), 0 0 0 3px #B7F34A, 0 0 26px 4px rgba(183,243,74,0.5)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[#0B0C10]/55" />
      )}
      <div
        className={`${base} pointer-events-auto`}
        style={cardTop !== undefined && !foraDoCatalogo ? { top: cardTop } : { top: "50%", transform: "translate(-50%, -50%)" }}
      >
        <div className="flex items-center gap-1.5" aria-label={`Passo ${i + 1} de ${PASSOS.length}`}>
          {PASSOS.map((_, n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= i ? "bg-on-background" : "bg-surface-soft"}`} />
          ))}
        </div>
        <p className="mt-3 text-[13px] font-medium text-text-tertiary">Passo {i + 1} de {PASSOS.length}</p>
        <p className="mt-0.5 font-[family-name:var(--font-manrope)] text-[19px] font-medium leading-tight tracking-[-0.01em]">{passo.titulo}</p>
        <p className="mt-1.5 text-[16px] leading-snug text-text-secondary">
          {foraDoCatalogo ? PASSOS[0].semAlvo : !rect && passo.semAlvo ? passo.semAlvo : passo.texto}
        </p>
        {foraDoCatalogo && (
          <button onClick={() => router.push("/admin/vitrine")} className="mt-4 min-h-[52px] w-full rounded-full bg-button-primary text-[16px] font-medium text-white">
            Ir para o Catálogo
          </button>
        )}
        <div className="mt-3 flex items-center justify-between">
          <button onClick={encerrar} className="min-h-[44px] pr-3 text-[14px] text-text-tertiary">Sair do guia</button>
          <button onClick={() => setI(i + 1)} className="min-h-[44px] pl-3 text-[14px] text-text-secondary underline underline-offset-4">Pular este passo</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
