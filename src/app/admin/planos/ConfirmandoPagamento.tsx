"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Logo depois do pagamento o Stripe ainda está avisando o Orbibox (leva
// alguns segundos). Esta faixa atualiza a página sozinha até confirmar.
export function ConfirmandoPagamento() {
  const router = useRouter();
  const [tentativas, setTentativas] = useState(0);
  useEffect(() => {
    if (tentativas >= 12) return;
    const t = setTimeout(() => {
      router.refresh();
      setTentativas((n) => n + 1);
    }, 2500);
    return () => clearTimeout(t);
  }, [tentativas, router]);

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-white px-4 py-3.5 ring-1 ring-black/[0.07]">
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-orbi-gradient-start" />
      <p className="text-[14px] leading-snug">
        {tentativas < 12
          ? "Confirmando seu pagamento com o banco, só um instante…"
          : "Está demorando mais que o normal. Se a cobrança apareceu no seu cartão, toque em Atualizar ou fale com a gente."}
      </p>
      {tentativas >= 12 && (
        <button type="button" onClick={() => { setTentativas(0); router.refresh(); }} className="shrink-0 rounded-full bg-on-background px-3 py-1.5 text-[12.5px] font-medium text-white">
          Atualizar
        </button>
      )}
    </div>
  );
}
