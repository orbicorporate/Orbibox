"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Ensinar a Orbi num toque: a pergunta que ela não soube responder e três
 * jeitos rápidos de responder. A resposta fica guardada e a Orbi passa a
 * usá-la nas próximas conversas.
 */
export function ResponderPergunta({
  id,
  pergunta,
  vezes,
  onEnsinado,
  compacto = false,
}: {
  id: string;
  pergunta: string;
  vezes: number;
  onEnsinado?: (resposta: string) => void;
  compacto?: boolean;
}) {
  const supabase = createClient();
  const [escrevendo, setEscrevendo] = useState(false);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [feito, setFeito] = useState<string | null>(null);

  async function ensinar(resposta: string) {
    const r = resposta.trim();
    if (!r || salvando) return;
    setSalvando(true);
    const { error } = await supabase
      .from("orbi_learnings")
      .update({ status: "ensinado", sugestao: r, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSalvando(false);
    if (error) return;
    setFeito(r);
    onEnsinado?.(r);
  }

  if (feito) {
    return (
      <div className="acao-entra flex items-start gap-3" aria-live="polite">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F9E4C]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        <div className="min-w-0">
          <p className="text-[14.5px] font-medium">A Orbi aprendeu</p>
          <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">Da próxima vez que perguntarem, ela responde: &ldquo;{feito}&rdquo;</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className={`${compacto ? "text-[16px]" : "text-[17px]"} font-medium leading-snug`}>&ldquo;{pergunta}&rdquo;</p>
      <p className="mt-1 text-[12.5px] text-text-tertiary">
        {vezes > 1 ? `${vezes} pessoas perguntaram` : "Um cliente perguntou"} e a Orbi não soube responder.
      </p>

      {escrevendo ? (
        <div className="mt-4">
          <label htmlFor={`resp-${id}`} className="text-[12.5px] font-medium text-text-secondary">Sua resposta</label>
          <textarea
            id={`resp-${id}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Ex: Temos sim, o sorvete de frutas é sem lactose."
            className="mt-1.5 w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-on-background"
          />
          <div className="mt-2.5 flex gap-2">
            <button type="button" onClick={() => ensinar(texto)} disabled={!texto.trim() || salvando} className="min-h-[46px] flex-1 rounded-full bg-on-background text-[14.5px] font-medium text-white disabled:opacity-40">
              {salvando ? "Ensinando…" : "Ensinar a Orbi"}
            </button>
            <button type="button" onClick={() => setEscrevendo(false)} className="min-h-[46px] rounded-full bg-surface-soft px-4 text-[14px] text-text-secondary">Voltar</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => ensinar("Sim, temos.")} disabled={salvando} className="min-h-[44px] rounded-full bg-on-background px-4 text-[14px] font-medium text-white transition-transform active:scale-[.97]">Sim, temos</button>
          <button type="button" onClick={() => ensinar("Não temos.")} disabled={salvando} className="min-h-[44px] rounded-full bg-surface-soft px-4 text-[14px] font-medium transition-transform active:scale-[.97]">Não temos</button>
          <button type="button" onClick={() => setEscrevendo(true)} className="min-h-[44px] rounded-full border border-divider px-4 text-[14px] font-medium text-text-secondary transition-transform active:scale-[.97]">Escrever</button>
        </div>
      )}
    </div>
  );
}
