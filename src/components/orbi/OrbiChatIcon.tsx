/**
 * Ícone animado de conversa — balão de mensagem 3D (render real, hospedado
 * em /public). Fundo branco levíssimo, pensado pra preencher o quadradinho
 * do box. Usado como opção especial de ícone (valor "__chat__"), no mesmo
 * espírito do "__logo__".
 */
export function OrbiChatIcon({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size, background: "#fff" }}
      aria-hidden
    >
      <video
        src="/orbi-chat.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="h-full w-full object-cover"
      />
    </div>
  );
}
