"use client";

import { useState } from "react";
import { FolhaCompartilhar, type AlvoCompartilhar } from "@/components/compartilhar/Compartilhar";

/**
 * Cartão fixo do painel para o dono pedir avaliações. Cada cliente que avalia abre a página e
 * conhece o Orbibox da marca, então o pedido também divulga: a frase do cartão diz isso.
 */
export function PedirAvaliacaoCard({ nome, slug, shareUrl, imagem, logo }: { nome: string; slug: string; shareUrl: string; imagem: string | null; logo: string | null }) {
  const [alvo, setAlvo] = useState<AlvoCompartilhar | null>(null);
  function abrir() {
    let origem = "";
    try { origem = new URL(shareUrl).origin; } catch { origem = window.location.origin; }
    setAlvo({
      url: `${origem}/${slug}?clube=avaliar`,
      titulo: "Avaliação",
      rotulo: "Avaliação",
      marca: nome,
      imagem,
      logo,
      texto: `Como foi sua experiência em ${nome}? Conta pra gente, leva 1 minuto:`,
    });
  }
  return (
    <>
      <section id="pedir-avaliacao" className="mt-8 scroll-mt-6 rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.05]">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-soft text-on-background">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z" /></svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-medium leading-tight">Peça avaliações aos seus clientes</h2>
            <p className="mt-1 text-[13px] leading-snug text-text-secondary">
              Quem avalia abre a sua página e conhece o seu Orbibox. Cada avaliação traz mais gente e mais confiança.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={abrir}
          className="mt-4 inline-flex min-h-[46px] w-full items-center justify-center rounded-full bg-on-background px-5 text-[14px] font-medium text-white transition-transform active:scale-[0.98]"
        >
          Pedir avaliação agora
        </button>
      </section>
      {alvo && <FolhaCompartilhar alvo={alvo} aoFechar={() => setAlvo(null)} />}
    </>
  );
}
