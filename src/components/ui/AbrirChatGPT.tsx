/** Botão "Abrir ChatGPT ↗": acompanha todo "Copiar prompt" do app, pra
 * pessoa copiar e já cair no ChatGPT pra colar. */
export function AbrirChatGPT({ className = "", compacto = false }: { className?: string; compacto?: boolean }) {
  return (
    <a
      href="https://chatgpt.com/"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex shrink-0 items-center gap-1.5 justify-center rounded-full border border-divider font-medium text-on-background ${compacto ? "px-3 py-1.5 text-[11.5px]" : "px-4 py-2.5 text-[13px]"} ${className}`}
    >
      Abrir ChatGPT
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 17L17 7M8 7h9v9" />
      </svg>
    </a>
  );
}
