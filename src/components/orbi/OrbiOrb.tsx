/**
 * A Orbi — esfera líquida em CSS puro. Sem vídeo, sem arquivo:
 * três manchas de gradiente flutuam em órbitas assimétricas dentro de uma
 * máscara circular, e um brilho gira por cima para o efeito de vidro.
 * Roda a 60fps de verdade (o vídeo antigo travava a 12fps) e pesa ~2KB.
 */
/**
 * A Orbi — esfera em vídeo (render 3D real, hospedado em /public — nunca
 * embutido no código). O contorno orgânico e o brilho de vidro continuam em
 * CSS, recortando e realçando o vídeo por cima.
 */
export function OrbiOrb({ size = 96, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`orbi-orb relative shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <video
        src="/orbi-orb.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="h-full w-full object-cover"
      />
    </div>
  );
}
