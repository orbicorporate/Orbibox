/**
 * Avatar redondo com o logotipo do negócio, no lugar da esfera da Orbi.
 * Em volta do logo, um anel de luz prismática gira devagar (sinal de que ali
 * tem IA) e, sobre a esfera, um reflexo de vidro passa de tempos em tempos.
 * As medidas são em cqw (largura do avatar), então escala com o `size`.
 * O parâmetro `color` ficou só por compatibilidade com quem já chama.
 * `esfera` ("claro" ou "escuro") põe o logo (sem fundo) sobre um disco em degradê,
 * em vez de preencher o círculo com a imagem.
 */
export function OrbiAvatar({ logoUrl, size = 96, className = "", esfera }: { logoUrl: string; size?: number; className?: string; color?: string | null; esfera?: "claro" | "escuro" }) {
  return (
    <div className={`orbi-av relative shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden>
      <span className="orbi-av-brilho" />
      <span className="orbi-av-anel" />
      <span className="orbi-av-anel orbi-av-anel-b" />
      <div className={`orbi-av-miolo ${esfera ? `orbi-av-esfera orbi-av-esfera-${esfera}` : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className={`h-full w-full ${esfera ? "object-contain" : "object-cover"}`} />
        <span className="orbi-av-agua" />
        <span className="orbi-av-agua orbi-av-agua-b" />
        <span className="orbi-av-reflexo" />
        <span className="orbi-av-passagem" />
      </div>
    </div>
  );
}
