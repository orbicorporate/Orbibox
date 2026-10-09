"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { de: "cliente" | "orbi"; texto: string };
const ROTEIRO: Msg[] = [
  { de: "cliente", texto: "Vocês têm opção sem glúten?" },
  { de: "orbi", texto: "Temos sim! A pizza de massa de arroz e a torta de limão não levam glúten. Quer ver os preços?" },
  { de: "cliente", texto: "Quero! E vocês abrem domingo?" },
  { de: "orbi", texto: "Abrimos aos domingos, das 11h às 22h. Posso avisar a equipe no WhatsApp para reservar sua mesa?" },
];

/** Conversa que se escreve sozinha quando entra na tela. */
export function OrbiChatDemo() {
  const raiz = useRef<HTMLDivElement>(null);
  const [passo, setPasso] = useState(0); // mensagens já mostradas
  const [digitando, setDigitando] = useState(false);
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setAtivo(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;
    const timers: number[] = [];
    const rodar = (n: number) => {
      if (cancelado) return;
      if (n >= ROTEIRO.length) {
        timers.push(window.setTimeout(() => { setPasso(0); rodar(0); }, 4500));
        return;
      }
      const m = ROTEIRO[n];
      if (m.de === "orbi") {
        setDigitando(true);
        timers.push(window.setTimeout(() => { setDigitando(false); setPasso(n + 1); rodar(n + 1); }, 1300));
      } else {
        timers.push(window.setTimeout(() => { setPasso(n + 1); rodar(n + 1); }, n === 0 ? 700 : 900));
      }
    };
    rodar(passo === ROTEIRO.length ? 0 : passo);
    return () => { cancelado = true; timers.forEach((t) => window.clearTimeout(t)); };
    // roda uma vez por vez que entra na tela
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  return (
    <div ref={raiz} className="w-full max-w-[380px] rounded-[30px] bg-surface-white p-4 shadow-[0_30px_70px_-34px_rgba(17,19,24,0.45)] ring-1 ring-black/[0.05]">
      <div className="flex items-center gap-3 border-b border-divider pb-3">
        <span className="orbi-gradient flex h-9 w-9 items-center justify-center rounded-full text-[14px]" aria-hidden>✦</span>
        <div>
          <p className="text-[14px] font-medium leading-tight">Orbi</p>
          <p className="text-[11.5px] text-text-tertiary">Responde na hora, 24h por dia</p>
        </div>
      </div>
      <div className="flex min-h-[290px] flex-col gap-2.5 pt-4" aria-live="polite">
        {ROTEIRO.slice(0, passo).map((m, n) => (
          <div key={n} className={`lp-pop max-w-[85%] rounded-[20px] px-3.5 py-2.5 text-[14px] leading-snug ${m.de === "cliente" ? "self-end rounded-br-md bg-on-background text-white" : "self-start rounded-bl-md bg-surface-soft text-on-background"}`}>
            {m.texto}
          </div>
        ))}
        {digitando && (
          <div className="lp-pop flex w-16 items-center justify-center gap-1 self-start rounded-[20px] rounded-bl-md bg-surface-soft py-3.5" aria-label="Orbi está escrevendo">
            {[0, 1, 2].map((d) => <span key={d} className="lp-dot h-1.5 w-1.5 rounded-full bg-text-tertiary" style={{ animationDelay: `${d * 160}ms` }} />)}
          </div>
        )}
      </div>
    </div>
  );
}
