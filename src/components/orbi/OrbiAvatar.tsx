/**
 * Avatar redondo com o logotipo do negócio, no lugar da esfera da Orbi.
 * Em volta do logo, um anel de luz prismática gira devagar (sinal de que ali
 * tem IA) e, sobre a esfera, um reflexo de vidro passa de tempos em tempos.
 * As medidas são em cqw (largura do avatar), então escala com o `size`.
 * O parâmetro `color` ficou só por compatibilidade com quem já chama.
 * `esfera` ("claro" ou "escuro") põe o logo (sem fundo) sobre um disco em degradê,
 * em vez de preencher o círculo com a imagem.
 */
/** Cores de esfera. "claro" e "escuro" têm CSS próprio; as demais saem do degradê daqui. */
export const ESFERAS = [
  { id: "claro", nome: "Claro", de: "#FFFFFF", ate: "#E7E8E4" },
  { id: "escuro", nome: "Escuro", de: "#2A2D33", ate: "#131519" },
  { id: "marinho", nome: "Azul marinho", de: "#3B5F98", ate: "#0F2147" },
  { id: "esmeralda", nome: "Esmeralda", de: "#37A07A", ate: "#0B3D2D" },
  { id: "bordo", nome: "Bordô", de: "#A3344B", ate: "#3C0A1A" },
  { id: "ametista", nome: "Ametista", de: "#8758BE", ate: "#2C1454" },
  { id: "petroleo", nome: "Petróleo", de: "#2F7D88", ate: "#0C323B" },
  { id: "dourado", nome: "Dourado", de: "#F0D58E", ate: "#B0862F" },
  { id: "champanhe", nome: "Champanhe", de: "#FBF0DA", ate: "#DCC49A" },
  { id: "rose", nome: "Rosé", de: "#F6D2CE", ate: "#CF9494" },
] as const;
export type TomEsfera = (typeof ESFERAS)[number]["id"];
const CLARAS = new Set<string>(["claro", "dourado", "champanhe", "rose"]);

export function OrbiAvatar({ logoUrl, size = 96, className = "", esfera, escala = 100 }: { logoUrl: string; size?: number; className?: string; color?: string | null; esfera?: TomEsfera; escala?: number }) {
  const cor = esfera && esfera !== "claro" && esfera !== "escuro" ? ESFERAS.find((e) => e.id === esfera) : undefined;
  return (
    <div className={`orbi-av relative shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden>
      <span className="orbi-av-brilho" />
      <span className="orbi-av-anel" />
      <span className="orbi-av-anel orbi-av-anel-b" />
      <div
        className={`orbi-av-miolo ${esfera ? `orbi-av-esfera orbi-av-esfera-${cor ? (CLARAS.has(cor.id) ? "claro" : "escuro") : esfera}` : ""}`}
        style={cor ? { background: `radial-gradient(circle at 35% 25%, ${cor.de}, ${cor.ate} 74%)` } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className={`h-full w-full ${esfera ? "object-contain" : "object-cover"}`} style={esfera && escala !== 100 ? { transform: `scale(${escala / 100})` } : undefined} />
        <span className="orbi-av-agua" />
        <span className="orbi-av-agua orbi-av-agua-b" />
        <span className="orbi-av-reflexo" />
        <span className="orbi-av-passagem" />
      </div>
    </div>
  );
}

/** hero_avatar guarda a esfera como "esfera-claro-100" (tom e tamanho do logo em %). Aceita o formato antigo sem tamanho. */
export function lerEsfera(v: string | null | undefined): { tom: TomEsfera; escala: number } | null {
  const m = /^esfera-([a-z]+)(?:-(\d{2,3}))?$/.exec(v ?? "");
  if (!m || !ESFERAS.some((e) => e.id === m[1])) return null;
  const n = m[2] ? Number(m[2]) : 100;
  return { tom: m[1] as TomEsfera, escala: Math.min(130, Math.max(50, n)) };
}

/** hero_avatar guarda "sem-fundo" ou "sem-fundo-120" (tamanho do logo solto em %, 50 a 160). */
export function lerSemFundo(v: string | null | undefined): { escala: number } | null {
  const m = /^sem-fundo(?:-(\d{2,3}))?$/.exec(v ?? "");
  if (!m) return null;
  const n = m[1] ? Number(m[1]) : 100;
  return { escala: Math.min(160, Math.max(50, n)) };
}
