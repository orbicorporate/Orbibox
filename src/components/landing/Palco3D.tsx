"use client";

import { useRef, type ReactNode } from "react";

/** Cartão que inclina em 3D conforme o dedo ou o mouse passam por cima. */
function Inclina({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  function mover(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg) translateZ(0)`;
  }
  function sair() {
    if (ref.current) ref.current.style.transform = "";
  }
  return (
    <div
      ref={ref}
      onPointerMove={mover}
      onPointerLeave={sair}
      onPointerUp={sair}
      className={`pc-card ${className}`}
    >
      {children}
    </div>
  );
}

function Vitrine() {
  const itens = [
    { n: "Bolo de pote", p: "R$ 14", c: "linear-gradient(135deg,#FFB3C7,#FF7AA8)" },
    { n: "Café especial", p: "R$ 22", c: "linear-gradient(135deg,#FFD58A,#FF9F45)" },
    { n: "Combo da casa", p: "R$ 39", c: "linear-gradient(135deg,#9DEBCB,#3FC1A3)" },
  ];
  return (
    <div className="pc-cena pc-vitrine" aria-hidden>
      {itens.map((i, k) => (
        <div key={i.n} className={`pc-prod pc-prod-${k}`}>
          <span className="pc-prod-foto" style={{ background: i.c }} />
          <span className="pc-prod-nome">{i.n}</span>
          <span className="pc-prod-preco">{i.p}</span>
        </div>
      ))}
    </div>
  );
}

function Conversa() {
  return (
    <div className="pc-cena pc-chat" aria-hidden>
      <span className="pc-bolha pc-bolha-cli" style={{ animationDelay: "0s" }}>Vocês entregam hoje?</span>
      <span className="pc-bolha pc-bolha-orbi" style={{ animationDelay: "1.4s" }}>Entregamos até as 21h. Quer ver o cardápio?</span>
      <span className="pc-bolha pc-bolha-cli" style={{ animationDelay: "3.2s" }}>Quero! E tem vale-presente?</span>
      <span className="pc-bolha pc-bolha-orbi" style={{ animationDelay: "4.6s" }}>Tem sim. Já te mando o link ✦</span>
    </div>
  );
}

function Voucher() {
  return (
    <div className="pc-cena pc-voucher-cena" aria-hidden>
      <div className="pc-ticket">
        <span className="pc-ticket-topo">Voucher</span>
        <span className="pc-ticket-valor">20% off</span>
        <span className="pc-ticket-linha" />
        <span className="pc-ticket-resta">Faltam 7</span>
      </div>
      <span className="pc-carimbo">Pegou!</span>
    </div>
  );
}

function Numeros() {
  const alturas = [38, 56, 44, 72, 62, 90];
  return (
    <div className="pc-cena pc-numeros" aria-hidden>
      <div className="pc-barras">
        {alturas.map((h, k) => (
          <span key={k} className="pc-barra" style={{ height: `${h}%`, animationDelay: `${k * 0.18}s` }} />
        ))}
      </div>
      <span className="pc-selo">+38% esta semana</span>
    </div>
  );
}

function AppNoCelular() {
  return (
    <div className="pc-cena pc-app" aria-hidden>
      <div className="pc-fone">
        <div className="pc-fone-grade">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
            <span key={k} className="pc-fone-app" />
          ))}
          <span className="pc-fone-orbibox">✦</span>
        </div>
        <span className="pc-fone-nome">Sua marca</span>
      </div>
    </div>
  );
}

function Radar() {
  const pontos = [
    { x: 28, y: 34, d: 0 },
    { x: 68, y: 26, d: 0.9 },
    { x: 56, y: 62, d: 1.7 },
    { x: 24, y: 70, d: 2.5 },
    { x: 78, y: 70, d: 3.3 },
  ];
  return (
    <div className="pc-cena pc-radar" aria-hidden>
      <div className="pc-radar-disco">
        <span className="pc-radar-anel pc-radar-anel-1" />
        <span className="pc-radar-anel pc-radar-anel-2" />
        <span className="pc-radar-varre" />
        {pontos.map((p, k) => (
          <span key={k} className="pc-radar-ponto" style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.d}s` }} />
        ))}
      </div>
    </div>
  );
}

const CARTOES = [
  { id: "vitrine", titulo: "Vitrine que vende", texto: "Produtos e serviços em cards com foto, preço e página própria.", fundo: "linear-gradient(145deg,#3B5BDB,#7048E8)", Cena: Vitrine },
  { id: "orbi", titulo: "Orbi atende por você", texto: "Responde na hora, 24h por dia, e guarda o contato de quem se interessou.", fundo: "linear-gradient(145deg,#7048E8,#D6336C)", Cena: Conversa },
  { id: "voucher", titulo: "Vouchers e gift cards", texto: "Promoção com limite de unidades e vale-presente. Um motivo para agir hoje.", fundo: "linear-gradient(145deg,#E8590C,#C2255C)", Cena: Voucher },
  { id: "numeros", titulo: "Números simples", texto: "A Orbi mostra o que funciona e o que fazer a seguir.", fundo: "linear-gradient(145deg,#0CA678,#0B7285)", Cena: Numeros },
  { id: "app", titulo: "Seu app na tela inicial", texto: "Com o seu ícone, abre em tela cheia como um aplicativo.", fundo: "linear-gradient(145deg,#1C7ED6,#4C6EF5)", Cena: AppNoCelular },
  { id: "radar", titulo: "Radar de fãs", texto: "Veja quem curte a sua marca e chame essas pessoas de volta.", fundo: "linear-gradient(145deg,#D6336C,#F76707)", Cena: Radar },
];

export function Palco3D() {
  return (
    <div className="pc-grade">
      {CARTOES.map((c, n) => (
        <Inclina key={c.id} className="pc-anim">
          <div className="pc-fundo" style={{ background: c.fundo, animationDelay: `${n * 0.3}s` }}>
            <c.Cena />
            <div className="pc-texto">
              <h3>{c.titulo}</h3>
              <p>{c.texto}</p>
            </div>
          </div>
        </Inclina>
      ))}
    </div>
  );
}

const FAIXA = [
  ["Vitrine", "#4F8CF0"], ["Orbi, sua IA", "#8B6CF0"], ["Vouchers", "#F2A33A"], ["Gift cards", "#EC5C8A"],
  ["Radar de fãs", "#F76707"], ["App no celular", "#1C7ED6"], ["Números", "#2FBF8F"], ["Um único link", "#14A3B8"],
];

/** Faixa de recursos que corre sem parar, colorida. */
export function FaixaRecursos() {
  const lista = [...FAIXA, ...FAIXA];
  return (
    <div className="pc-faixa" aria-hidden>
      <div className="pc-faixa-trilho">
        {lista.map(([t, c], k) => (
          <span key={k} className="pc-faixa-chip">
            <i style={{ background: c }} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
