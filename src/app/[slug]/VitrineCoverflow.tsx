"use client";

import { useEffect, useRef, useState } from "react";

export type CoverflowItem = {
  key: string;
  titulo: string;
  descricao: string;
  imagem: string | null;
  preco: string | null;
  /** Proporção de reserva enquanto a foto não carrega (largura / altura). */
  ratio: number;
  destaque?: boolean;
  onClick: () => void;
};

/**
 * Vitrine em galeria 3D (Modo Órbita): os produtos viram um anel de cards
 * em perspectiva. Cada card usa a proporção real da foto, sem recortar. O
 * da frente é o maior; os vizinhos espiam por trás, girados. Arrasta,
 * usa as setas ou toca num vizinho pra trazer pra frente; tocar no da
 * frente abre o produto.
 */
export function VitrineCoverflow({ itens, rotuloAbrir = "Ver produto" }: { itens: CoverflowItem[]; rotuloAbrir?: string }) {
  const palco = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const capsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const ratios = useRef<number[]>(itens.map((i) => i.ratio));
  const st = useRef({ pos: 0, alvo: 0, arrastando: false, moveu: false, ultX: 0 });
  const [frente, setFrente] = useState(0);
  const N = itens.length;

  useEffect(() => {
    ratios.current = itens.map((i, k) => ratios.current[k] ?? i.ratio);
  }, [itens]);

  useEffect(() => {
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const w = (k: number) => { k = ((k % N) + N) % N; return k > N / 2 ? k - N : k; };
    const idx = (j: number) => ((j % N) + N) % N;
    // Dimensão de cada card: área parecida pra todos (Destaque um pouco
    // maior), na proporção da foto, limitado ao espaço do celular.
    const larguraPalco = () => palco.current?.clientWidth ?? 360;
    const dim = (k: number) => {
      const r = ratios.current[k] || 1;
      const maxW = Math.min(290, larguraPalco() * 0.72), maxH = 300;
      const A = itens[k]?.destaque ? 66000 : 58000;
      let W = Math.sqrt(A * r), H = Math.sqrt(A / r);
      if (W > maxW) { W = maxW; H = W / r; }
      if (H > maxH) { H = maxH; W = H * r; }
      return [W, H];
    };
    let raf = 0;
    let ultimaFrente = -1;
    const quadro = () => {
      const s = st.current;
      if (!s.arrastando) s.pos += (s.alvo - s.pos) * (reduz ? 1 : 0.14);
      const fl = Math.floor(s.pos), fr = s.pos - fl;
      const [w0, h0] = dim(idx(fl)), [w1, h1] = dim(idx(fl + 1));
      const Wf = w0 * (1 - fr) + w1 * fr, Hf = h0 * (1 - fr) + h1 * fr;
      cardsRef.current.forEach((el, i) => {
        if (!el) return;
        const [W, H] = dim(i);
        const k = w(i - s.pos), a = Math.abs(k), c = Math.min(a, 1);
        const sc = 1 - c * (1 - Math.min(1, (Hf * 0.9) / H));
        const GAP = 0.5 * (Wf / 2 + (W * sc) / 2) + 14;
        const x = Math.sign(k) * (c * GAP + Math.max(0, a - 1) * GAP * 0.55);
        const rot = -Math.sign(k) * c * 32, z = -c * 150 - Math.max(0, a - 1) * 120;
        el.style.width = `${W}px`;
        el.style.height = `${H}px`;
        el.style.marginLeft = `${-W / 2}px`;
        el.style.marginTop = `${-H / 2}px`;
        el.style.borderRadius = `${Math.min(30, Math.round(H * 0.15))}px`;
        el.style.transform = `translateX(${x.toFixed(1)}px) translateZ(${z.toFixed(1)}px) rotateY(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        el.style.opacity = (a > 2.2 ? 0 : a > 1.2 ? 2.2 - a : 1).toFixed(2);
        el.style.zIndex = String(100 - Math.round(a * 10));
        el.style.filter = a > 0.6 ? `brightness(${(1 - 0.12 * c).toFixed(2)})` : "none";
        el.style.pointerEvents = a > 2 ? "none" : "auto";
        const cap = capsRef.current[i];
        if (cap) cap.style.opacity = Math.max(0, 1 - a * 2).toFixed(2);
      });
      const f = idx(Math.round(s.alvo));
      if (f !== ultimaFrente) { ultimaFrente = f; setFrente(f); }
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);

    const mover = (e: PointerEvent) => {
      const s = st.current;
      if (!s.arrastando) return;
      const dx = e.clientX - s.ultX;
      if (Math.abs(dx) > 3) s.moveu = true;
      s.pos -= dx / 130;
      s.alvo = s.pos;
      s.ultX = e.clientX;
    };
    const soltar = () => {
      const s = st.current;
      if (!s.arrastando) return;
      s.arrastando = false;
      s.alvo = Math.round(s.pos);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
  }, [N, itens]);

  function tocar(i: number) {
    const s = st.current;
    if (s.moveu) return;
    let k = (((i - s.pos) % N) + N) % N;
    if (k > N / 2) k -= N;
    if (Math.abs(k) < 0.5) itens[i].onClick();
    else s.alvo = Math.round(s.pos + k);
  }

  const atual = itens[frente];

  return (
    <div className="-mx-6 select-none overflow-x-clip px-6">
      <div
        ref={palco}
        className="relative h-[340px] cursor-grab touch-pan-y active:cursor-grabbing"
        style={{ perspective: 900 }}
        onPointerDown={(e) => { const s = st.current; s.arrastando = true; s.moveu = false; s.ultX = e.clientX; }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") st.current.alvo -= 1;
          if (e.key === "ArrowRight") st.current.alvo += 1;
        }}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Produtos"
      >
        {itens.map((it, i) => (
          <button
            key={it.key}
            ref={(el) => { cardsRef.current[i] = el; }}
            type="button"
            onClick={() => tocar(i)}
            aria-label={i === frente ? `${it.titulo}, abrir` : it.titulo}
            className="absolute left-1/2 top-1/2 overflow-hidden bg-[#dcdad5] shadow-[0_30px_50px_-34px_rgba(16,18,22,.6)]"
            style={{ transformStyle: "preserve-3d", willChange: "transform, opacity" }}
          >
            {it.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.imagem}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
                onLoad={(e) => {
                  const im = e.currentTarget;
                  if (im.naturalWidth && im.naturalHeight) ratios.current[i] = im.naturalWidth / im.naturalHeight;
                }}
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-[28px] text-black/20">◆</span>
            )}
            <span
              ref={(el) => { capsRef.current[i] = el; }}
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 pb-4 pt-11 text-left font-[family-name:var(--font-manrope)] text-[17px] font-semibold leading-tight tracking-[-0.015em] text-white"
            >
              {it.titulo}
            </span>
          </button>
        ))}
      </div>

      {/* Setas + bolinhas */}
      <div className="mx-auto mt-2 flex w-fit items-center gap-1 rounded-full bg-on-background/[.06] p-1">
        <button type="button" onClick={() => { st.current.alvo -= 1; }} aria-label="Anterior" className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] text-text-secondary active:bg-on-background/10">‹</button>
        <span className="flex items-center gap-[5px] px-1" aria-hidden>
          {itens.map((it, i) => (
            <i key={it.key} className={`block h-1.5 rounded-full transition-all duration-300 ${i === frente ? "w-4 bg-on-background" : "w-1.5 bg-on-background/25"}`} />
          ))}
        </span>
        <button type="button" onClick={() => { st.current.alvo += 1; }} aria-label="Próximo" className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] text-text-secondary active:bg-on-background/10">›</button>
      </div>

      {/* Sobre o produto da frente */}
      {atual && (
        <div key={atual.key} className="acao-entra mx-auto mt-5 max-w-[34ch] text-center" aria-live="polite">
          {atual.preco && <p className="font-[family-name:var(--font-manrope)] text-[15px] font-medium text-text-secondary">{atual.preco}</p>}
          {atual.descricao && <p className="mt-1 line-clamp-3 text-[13.5px] leading-relaxed text-text-secondary">{atual.descricao}</p>}
          <button
            type="button"
            onClick={atual.onClick}
            className="mt-4 inline-flex min-h-[46px] items-center gap-1.5 rounded-full bg-on-background px-6 text-[14px] font-medium text-white transition-transform active:scale-[.97]"
          >
            {rotuloAbrir} <span aria-hidden>›</span>
          </button>
        </div>
      )}
    </div>
  );
}
