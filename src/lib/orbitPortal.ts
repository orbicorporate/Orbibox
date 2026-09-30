/**
 * Transição do Modo Órbita: o que foi tocado se expande até virar a tela,
 * num universo clarinho (degradê suave nas cores da Orbi, estrelinhas, uma
 * galáxia girando devagar e um cometa), com anéis de órbita abrindo em volta.
 * No meio do caminho chama `aoCobrir` (a troca de tela acontece escondida
 * atrás do universo) e depois o universo se dissolve revelando a tela nova.
 *
 * É DOM imperativo de propósito: a Home em órbita desmonta quando a tela
 * troca, e a transição precisa sobreviver a isso até terminar.
 */

type Opcoes = { cores?: string[] | null; aoCobrir: () => void };

const EASE = "cubic-bezier(.76,0,.24,1)";

// Posições fixas (sequência de Weyl), sem Math.random: toda transição tem o
// mesmo céu, e nada muda entre renderizações.
function estrelas(n: number) {
  const out: { x: number; y: number; s: number; d: number; t: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = ((i * 0.618034 + 0.13) % 1) * 100;
    const y = ((i * 0.414214 + 0.37) % 1) * 100;
    out.push({ x, y, s: i % 8 === 0 ? 1.9 : 0.9 + ((i * 0.3) % 0.7), d: -((i * 0.37) % 2.4), t: 2.6 + ((i * 0.53) % 2.4) });
  }
  return out;
}

export function reduzMovimento() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function abrirEmOrbita(origem: HTMLElement, { cores, aoCobrir }: Opcoes) {
  if (reduzMovimento()) {
    aoCobrir();
    return;
  }
  const [c1, c2, c3] = [cores?.[0] ?? "#B7F34A", cores?.[1] ?? "#6EE7D8", cores?.[2] ?? cores?.[0] ?? "#B7F34A"];
  const W = window.innerWidth;
  const H = window.innerHeight;
  const r = origem.getBoundingClientRect();
  const raio = parseFloat(getComputedStyle(origem).borderTopLeftRadius) || Math.min(r.width, r.height) / 2;
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  const camada = document.createElement("div");
  camada.className = "orbita-portal";
  camada.style.setProperty("--o1", c1);
  camada.style.setProperty("--o2", c2);
  camada.style.setProperty("--o3", c3);
  camada.innerHTML = `<div class="orbita-portal-ceu"><div class="orbita-portal-galaxia"><i></i><i></i><b></b></div>${estrelas(26)
    .map((e) => `<span class="orbita-portal-estrela" style="left:${e.x.toFixed(1)}%;top:${e.y.toFixed(1)}%;width:${e.s.toFixed(1)}px;height:${e.s.toFixed(1)}px;animation-delay:${e.d.toFixed(2)}s;animation-duration:${e.t.toFixed(2)}s"></span>`)
    .join("")}<span class="orbita-portal-cometa"></span></div><svg class="orbita-portal-aneis" aria-hidden="true"></svg>`;
  document.body.appendChild(camada);
  const ceu = camada.firstElementChild as HTMLElement;
  const svg = camada.lastElementChild as SVGSVGElement;

  const inicio = `inset(${r.top}px ${W - r.right}px ${H - r.bottom}px ${r.left}px round ${raio}px)`;
  const dur = 720;
  ceu.animate([{ clipPath: inicio }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }], { duration: dur, easing: EASE, fill: "forwards" });

  // Anéis finos se abrindo e faíscas espiralando pra dentro, em volta do
  // ponto tocado.
  const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  svg.innerHTML =
    `<defs><linearGradient id="orbita-portal-g" x1="0" x2="1"><stop offset="0" stop-color="${c2}"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>` +
    [0, 1, 2].map((i) => `<ellipse fill="none" stroke="url(#orbita-portal-g)" stroke-width="${(1 - i * 0.25).toFixed(2)}" ${i === 1 ? 'stroke-dasharray="1.5 7" stroke-linecap="round"' : ""}/>`).join("") +
    Array.from({ length: 7 }, (_, i) => `<circle r="${i % 3 ? 1.1 : 1.7}" fill="#fff"/>`).join("");
  const aneis = [...svg.querySelectorAll("ellipse")];
  const faiscas = [...svg.querySelectorAll("circle")];
  const t0 = performance.now();
  const total = dur + 320;
  const quadro = (agora: number) => {
    const p = Math.max(0, Math.min(1, (agora - t0) / total));
    const e = 1 - Math.pow(1 - p, 3);
    const fade = Math.sin(Math.PI * p);
    aneis.forEach((el, i) => {
      const rx = 18 + e * R * (0.55 + 0.32 * i);
      el.setAttribute("cx", String(cx));
      el.setAttribute("cy", String(cy));
      el.setAttribute("rx", rx.toFixed(1));
      el.setAttribute("ry", (rx * 0.36).toFixed(1));
      el.setAttribute("transform", `rotate(${(-18 + i * 11 + p * 50).toFixed(1)} ${cx} ${cy})`);
      el.style.opacity = (fade * (0.55 - 0.14 * i)).toFixed(2);
    });
    faiscas.forEach((c, i) => {
      const ang = (i * Math.PI * 2) / faiscas.length + p * 5.2;
      const rr = (1 - e) * R * (0.75 + 0.05 * (i % 4)) + 6;
      const x = Math.cos(ang) * rr;
      const y = Math.sin(ang) * rr * 0.42;
      c.setAttribute("cx", (cx + x * Math.cos(-0.3) - y * Math.sin(-0.3)).toFixed(1));
      c.setAttribute("cy", (cy + x * Math.sin(-0.3) + y * Math.cos(-0.3)).toFixed(1));
      c.style.opacity = (fade * 0.8).toFixed(2);
    });
    if (p < 1) requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);

  window.setTimeout(() => {
    aoCobrir();
    window.scrollTo({ top: 0 });
    // segura o universo um instante antes de dissolver, pra dar tempo de ser visto
    window.setTimeout(() => {
      const saida = camada.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 560, easing: "ease", fill: "forwards" });
      saida.onfinish = () => camada.remove();
    }, 260);
  }, dur);
}
