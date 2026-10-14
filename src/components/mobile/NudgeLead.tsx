"use client";

import { useEffect, useState } from "react";
import { ContatoForm, chaveLead } from "@/components/mobile/ContatoForm";
import { pontosDeInteresse, rastreioAtivo } from "@/lib/track";

/**
 * Aviso de captura que nasce do comportamento, não de um lugar fixo da tela.
 * Aparece só quando a pessoa já mostrou interesse de verdade (olhou alguns
 * itens, ou ficou um tempo numa página de produto), uma vez por visita, e
 * some pra quem já deixou o contato ou dispensou.
 */
export function NudgeLead({
  businessId,
  businessName,
  sessionId = null,
  interesse,
  modo,
  pontosMinimos = 3,
  segundos = 14,
}: {
  businessId: string;
  businessName: string;
  sessionId?: string | null;
  interesse?: string;
  /** "navegacao" conta cliques de interesse; "pagina" espera a pessoa ficar na página. */
  modo: "navegacao" | "pagina";
  pontosMinimos?: number;
  segundos?: number;
}) {
  const chaveNao = `orbi_nudge_${businessId}`;
  const [pronto, setPronto] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [feito, setFeito] = useState(false);
  const [fora, setFora] = useState(false);

  function podeMostrar() {
    if (!rastreioAtivo()) return false; // dono olhando a própria página
    try {
      if (localStorage.getItem(chaveLead(businessId))) return false;
      if (sessionStorage.getItem(chaveNao)) return false;
    } catch { /* sem storage: mostra mesmo assim */ }
    return true;
  }

  useEffect(() => {
    if (modo === "pagina") {
      const t = window.setTimeout(() => { if (podeMostrar()) setPronto(true); }, segundos * 1000);
      return () => window.clearTimeout(t);
    }
    function checar() {
      if (pontosDeInteresse(businessId) >= pontosMinimos && podeMostrar()) setPronto(true);
    }
    checar();
    window.addEventListener("orbi:interesse", checar);
    return () => window.removeEventListener("orbi:interesse", checar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, modo]);

  function dispensar() {
    setFora(true);
    try { sessionStorage.setItem(chaveNao, "1"); } catch { /* ignora */ }
  }

  if (!pronto || fora) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] px-4">
      <div className="folha-sobe pointer-events-auto mx-auto w-full max-w-[432px] rounded-[26px] bg-surface-white p-4 shadow-[0_12px_40px_rgba(17,19,24,0.22)] ring-1 ring-black/[0.06]">
        {feito ? (
          <div className="flex items-center gap-3 py-1">
            <span className="orbi-green-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 13l4 4L19 7" /></svg>
            </span>
            <p className="flex-1 text-[14px] font-medium">Combinado, a gente te chama no WhatsApp.</p>
            <button type="button" onClick={dispensar} className="cursor-pointer rounded-full px-2 text-[18px] text-text-tertiary" aria-label="Fechar">×</button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-tight">Gostou do que viu?</p>
                <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">
                  {aberto ? `Deixe seu WhatsApp e ${businessName} te chama com o que você procura.` : `Deixe seu WhatsApp e ${businessName} te chama, sem spam.`}
                </p>
              </div>
              <button type="button" onClick={dispensar} className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[18px] text-text-tertiary" aria-label="Agora não">×</button>
            </div>
            {aberto ? (
              <div className="mt-3">
                <ContatoForm
                  businessId={businessId}
                  sessionId={sessionId}
                  origem="produto"
                  interesse={interesse}
                  botao="Pode me chamar"
                  aoCapturar={() => { setFeito(true); window.setTimeout(dispensar, 2200); }}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAberto(true)}
                className="mt-3 w-full cursor-pointer rounded-full bg-on-background py-3 text-[14.5px] font-semibold text-white"
              >
                Quero ser chamado
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
