/**
 * A Orbi — esfera líquida em CSS puro. Sem vídeo, sem arquivo:
 * três manchas de gradiente flutuam em órbitas assimétricas dentro de uma
 * máscara circular, e um brilho gira por cima para o efeito de vidro.
 * Roda a 60fps de verdade (o vídeo antigo travava a 12fps) e pesa ~2KB.
 */
export function OrbiOrb({ size = 96, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`orbi-orb relative shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="orbi-orb__blob orbi-orb__blob--1" />
      <span className="orbi-orb__blob orbi-orb__blob--2" />
      <span className="orbi-orb__blob orbi-orb__blob--3" />
      <span className="orbi-orb__sheen" />
    </div>
  );
}
