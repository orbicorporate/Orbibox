"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * X pequeno que só o dono vê, no canto de cada item (Home e vitrine).
 * Pergunta antes e só some da tela se o banco confirmou a exclusão.
 */
export function ExcluirItemX({ id, titulo, onExcluido, className = "" }: { id: string; titulo: string; onExcluido: (id: string) => void; className?: string }) {
  const [ocupado, setOcupado] = useState(false);
  async function excluir(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (ocupado) return;
    if (!window.confirm(`Excluir "${titulo}"? Isso apaga o item da sua página.`)) return;
    setOcupado(true);
    const { error } = await createClient().from("content_items").delete().eq("id", id);
    setOcupado(false);
    if (error) {
      window.alert("Não consegui excluir agora. Tente de novo.");
      return;
    }
    onExcluido(id);
  }
  return (
    <button
      type="button"
      onClick={excluir}
      disabled={ocupado}
      aria-label={`Excluir ${titulo}`}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-divider bg-surface-white/90 text-text-secondary shadow-md backdrop-blur-sm active:scale-90 disabled:opacity-50 ${className}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );
}
