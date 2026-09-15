"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

/**
 * Talks não depende só de visitante. Aqui o dono adiciona um cliente que
 * já tem no WhatsApp (de uma venda por fora, do balcão, de antes do
 * Orbibox), e a partir daí a Orbi escreve mensagem pra ele também, do
 * mesmo jeito que faz com quem chegou pelo link.
 */
export function AdicionarContato({ businessId, onAdded, trigger }: {
  businessId: string;
  onAdded: () => void;
  /** Botão que abre a folha. Se não vier, usa o padrão. */
  trigger?: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    const digitos = whatsapp.replace(/\D/g, "");
    if (digitos.length < 10) { setErro("Confere o número, precisa de DDD."); return; }
    setEnviando(true);
    setErro(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("add_manual_lead", {
        p_business_id: businessId,
        p_whatsapp: whatsapp,
        p_name: nome.trim() || null,
        p_note: nota.trim() || null,
      });
      if (error) throw error;
      setNome(""); setWhatsapp(""); setNota("");
      setAberto(false);
      onAdded();
    } catch {
      setErro("Não consegui salvar. Confere o número e tenta de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setAberto(true)}>{trigger}</span>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="cursor-pointer rounded-full border border-divider bg-surface-white px-3.5 py-1.5 text-[12px] font-medium text-text-secondary"
        >
          + Adicionar contato
        </button>
      )}

      {aberto && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-on-background/50 backdrop-blur-sm" onClick={() => !enviando && setAberto(false)}>
          <div className="mx-auto w-full max-w-[440px] rounded-t-[28px] bg-background-main px-5 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
            <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-divider" />
            <p className="font-[family-name:var(--font-manrope)] text-[20px] font-semibold tracking-[-0.01em]">Adicionar contato</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-text-secondary">
              Um cliente que você já tem, de fora do site. Entra na sua lista e a Orbi te ajuda a manter contato com ele também.
            </p>

            <div className="mt-4 flex flex-col gap-2.5">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className="w-full rounded-full border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp com DDD" inputMode="tel" className="w-full rounded-full border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="O que ele gosta ou comprou (opcional)" className="w-full rounded-full border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              {erro && <p className="text-[12.5px] text-red-600">{erro}</p>}
              <button type="button" onClick={salvar} disabled={enviando || whatsapp.replace(/\D/g, "").length < 10} className="mt-1 w-full cursor-pointer rounded-full bg-on-background py-3.5 text-[15px] font-semibold text-white disabled:opacity-40">
                {enviando ? "Salvando…" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
