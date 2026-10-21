/**
 * Avatar redondo com o logotipo do negócio, no lugar da esfera da Orbi.
 * Em volta do logo, um anel de luz prismática gira devagar (sinal de que ali
 * tem IA) e, sobre a esfera, um reflexo de vidro passa de tempos em tempos.
 * As medidas são em cqw (largura do avatar), então escala com o `size`.
 * O parâmetro `color` ficou só por compatibilidade com quem já chama.
 * `esfera` ("claro" ou "escuro") põe o logo (sem fundo) sobre um disco em degradê,
 * em vez de preencher o círculo com a imagem.
 */
export function OrbiAvatar({ logoUrl, size = 96, className = "", esfera, escala = 100 }: { logoUrl: string; size?: number; className?: string; color?: string | null; esfera?: "claro" | "escuro"; escala?: number }) {
  return (
    <div className={`orbi-av relative shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden>
      <span className="orbi-av-brilho" />
      <span className="orbi-av-anel" />
      <span className="orbi-av-anel orbi-av-anel-b" />
      <div className={`orbi-av-miolo ${esfera ? `orbi-av-esfera orbi-av-esfera-${esfera}` : ""}`}>
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
export function lerEsfera(v: string | null | undefined): { tom: "claro" | "escuro"; escala: number } | null {
  const m = /^esfera-(claro|escuro)(?:-(\d{2,3}))?$/.exec(v ?? "");
  if (!m) return null;
  const n = m[2] ? Number(m[2]) : 100;
  return { tom: m[1] as "claro" | "escuro", escala: Math.min(130, Math.max(50, n)) };
}

/** hero_avatar guarda "sem-fundo" ou "sem-fundo-120" (tamanho do logo solto em %, 50 a 160). */
export function lerSemFundo(v: string | null | undefined): { escala: number } | null {
  const m = /^sem-fundo(?:-(\d{2,3}))?$/.exec(v ?? "");
  if (!m) return null;
  const n = m[1] ? Number(m[1]) : 100;
  return { escala: Math.min(160, Math.max(50, n)) };
}
