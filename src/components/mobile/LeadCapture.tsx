"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

/**
 * Captura de WhatsApp na vitrine, sem parecer formulário. Um card leve no
 * meio da lista ("Quer que eu te avise?"), e ao tocar sobe uma folha com
 * nome e WhatsApp. Quem já deixou não vê de novo.
 *
 * O gancho muda conforme o contexto: novidade na vitrine, produto que a
 * pessoa está olhando, ou voucher.
 */
export function LeadCapture({
  businessId,
  businessName,
  sessionId,
  orbiColors,
  contexto = "vitrine",
  interesse,
  className = "",
  variant = "card",
}: {
  businessId: string;
  businessName: string;
  sessionId: string | null;
  orbiColors?: string[] | null;
  /** De onde vem a captura, pra o dono saber a origem do lead. */
  contexto?: "vitrine" | "produto" | "voucher";
  /** O que a pessoa estava olhando, vira "interesse" do lead. */
  interesse?: string;
  className?: string;
  /** "card" é o cartão do fim do catálogo; "compact" é a faixa fina que o
   * dono pode ligar no topo da Vitrine. Os dois abrem a mesma folha. */
  variant?: "card" | "compact";
}) {
  const chave = `orbi_lead_${businessId}`;
  const [aberto, setAberto] = useState(false);
  // No servidor o card não existe (evita divergência na hidratação); no
  // cliente lê o storage e some pra quem já deixou o contato.
  const [escondidoAgora, setEscondidoAgora] = useState(false);
  const jaDeixouStorage = useSyncExternalStore(
    () => () => {},
    () => { try { return !!localStorage.getItem(chave); } catch { return false; } },
    () => true,
  );
  const jaDeixou = jaDeixouStorage || escondidoAgora;
  const setJaDeixou = setEscondidoAgora;
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const titulo = contexto === "produto"
    ? "Quer saber quando isso mudar de preço?"
    : contexto === "voucher"
      ? "Quer ser avisado de vouchers novos?"
      : "Quer ser avisado das novidades?";
  const sub = contexto === "produto"
    ? "Deixa seu WhatsApp e eu te aviso, sem spam."
    : `Novidades e ofertas de ${businessName}, direto no seu WhatsApp.`;

  async function enviar() {
    const digitos = whatsapp.replace(/\D/g, "");
    if (digitos.length < 10) { setErro("Confere o número, precisa de DDD."); return; }
    setEnviando(true);
    setErro(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("upsert_lead", {
        p_business_id: businessId,
        p_whatsapp: whatsapp,
        p_name: nome.trim() || null,
        p_source: contexto,
        p_session_id: sessionId,
        p_interest: interesse ?? null,
      });
      if (error) throw error;
      try { localStorage.setItem(chave, "1"); } catch { /* ignora */ }
      setFeito(true);
      setTimeout(() => { setAberto(false); setJaDeixou(true); }, 1600);
    } catch {
      setErro("Não consegui salvar agora. Tenta de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (jaDeixou) return null;

  return (
    <>
      {variant === "compact" ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-full border border-divider bg-surface-white py-2 pl-2 pr-4 text-left ${className}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">Receba novidades</span>
          <span className="shrink-0 text-[12.5px] font-semibold text-on-background">Quero →</span>
        </button>
      ) : (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={`orbi-card-light relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-[22px] px-4 py-3.5 text-left ${className}`}
      >
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
          <OrbiParticleSphere size={36} colors={orbiColors ?? undefined} className="rounded-full" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold leading-tight">{titulo}</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">{sub}</span>
        </span>
        <span className="relative shrink-0 text-text-tertiary">→</span>
      </button>
      )}

      {aberto && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col justify-end bg-on-background/50 backdrop-blur-sm"
          onClick={() => !enviando && setAberto(false)}
        >
          <div
            className="mx-auto w-full max-w-[440px] rounded-t-[28px] bg-background-main px-5 pb-8 pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-divider" />

            {feito ? (
              <div className="py-6 text-center">
                <span className="orbi-green-gradient mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                </span>
                <p className="mt-4 font-[family-name:var(--font-manrope)] text-[20px] font-semibold">Combinado</p>
                <p className="mt-1 text-[14px] text-text-secondary">Te aviso quando tiver algo bom.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full">
                    <OrbiParticleSphere size={44} colors={orbiColors ?? undefined} vivid className="rounded-full" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-[family-name:var(--font-manrope)] text-[20px] font-semibold leading-tight tracking-[-0.01em]">{titulo}</p>
                    <p className="mt-0.5 text-[13.5px] text-text-secondary">Só o essencial, leva 10 segundos.</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2.5">
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    autoComplete="name"
                    className="w-full rounded-full border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
                  />
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
                    placeholder="WhatsApp com DDD"
                    inputMode="tel"
                    autoComplete="tel"
                    className="w-full rounded-full border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
                  />
                  {erro && <p className="text-[12.5px] text-red-600">{erro}</p>}
                  <button
                    type="button"
                    onClick={enviar}
                    disabled={enviando || whatsapp.replace(/\D/g, "").length < 10}
                    className="mt-1 w-full cursor-pointer rounded-full bg-on-background py-3.5 text-[15px] font-semibold text-white disabled:opacity-40"
                  >
                    {enviando ? "Salvando…" : "Pode me avisar"}
                  </button>
                  <p className="text-center text-[11.5px] leading-relaxed text-text-tertiary">
                    Seu número fica só com {businessName}. Nada de lista de grupo.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
