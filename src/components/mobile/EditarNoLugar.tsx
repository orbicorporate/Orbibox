"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

/**
 * Edição no lugar: o dono toca num lápis da própria página e o editor do
 * painel abre num painel largo por cima, sem sair da tela. Ao concluir, a
 * página atualiza e já mostra a mudança.
 */
function urlEmbutida(href: string) {
  const [caminho, ancora] = href.split("#");
  return `${caminho}${caminho.includes("?") ? "&" : "?"}embed=1${ancora ? `#${ancora}` : ""}`;
}

function PainelEditor({ href, rotulo, onFechar }: { href: string; rotulo: string; onFechar: () => void }) {
  const [carregou, setCarregou] = useState(false);

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", tecla);
    };
  }, [onFechar]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={rotulo}>
      <button aria-label="Fechar edição" onClick={onFechar} className="editor-fundo absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      <div className="editor-painel relative flex h-[92dvh] w-full max-w-[1000px] flex-col overflow-hidden rounded-t-3xl bg-surface-white shadow-2xl sm:h-[90dvh] sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3">
          <p className="min-w-0 truncate text-[15px] font-semibold text-on-background">{rotulo}</p>
          <button onClick={onFechar} className="min-h-[40px] shrink-0 rounded-full bg-on-background px-5 text-[13px] font-semibold text-white active:scale-[0.97]">
            Concluir
          </button>
        </div>
        <div className="relative min-h-0 flex-1 bg-background">
          {!carregou && (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-text-secondary">Abrindo o editor...</div>
          )}
          <iframe
            src={urlEmbutida(href)}
            title={rotulo}
            onLoad={() => setCarregou(true)}
            className={`h-full w-full border-0 transition-opacity duration-200 ${carregou ? "opacity-100" : "opacity-0"}`}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AbrirEditor({
  href,
  rotulo,
  className,
  children,
}: {
  href: string;
  rotulo: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => {
    setAberto(false);
    router.refresh();
  }, [router]);

  return (
    <>
      <button type="button" aria-label={rotulo} title={rotulo} onClick={() => setAberto(true)} className={className}>
        {children}
      </button>
      {aberto && <PainelEditor href={href} rotulo={rotulo} onFechar={fechar} />}
    </>
  );
}
