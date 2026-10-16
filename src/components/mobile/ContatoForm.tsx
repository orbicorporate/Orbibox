"use client";

import { useState } from "react";
import { digitosBR } from "@/lib/telefone";

export const chaveLead = (businessId: string) => `orbi_lead_${businessId}`;
export const chaveVisitante = (businessId: string) => `orbi_visitante_${businessId}`;

/** Número e nome já deixados neste aparelho (voucher, cartão de novidades, chat). */
export function lerVisitante(businessId: string): { nome: string; whatsapp: string } {
  try {
    const v = JSON.parse(localStorage.getItem(chaveVisitante(businessId)) ?? "{}") as { nome?: string; whatsapp?: string };
    return { nome: v.nome ?? "", whatsapp: v.whatsapp ?? "" };
  } catch {
    return { nome: "", whatsapp: "" };
  }
}

export function guardarVisitante(businessId: string, nome: string, whatsapp: string) {
  try {
    localStorage.setItem(chaveVisitante(businessId), JSON.stringify({ nome, whatsapp }));
    localStorage.setItem(chaveLead(businessId), "1");
  } catch { /* ignora */ }
}

/**
 * Campos de contato enxutos: nome e WhatsApp, um toque pra enviar. Usado no
 * cartão dentro do chat, na folha de saída e no aviso da navegação. Já vem
 * preenchido com o que a pessoa deixou antes neste aparelho.
 */
export function ContatoForm({
  businessId,
  conversationId,
  sessionId,
  origem,
  interesse,
  confirmar = false,
  botao = "Pode me chamar",
  aoCapturar,
}: {
  businessId: string;
  conversationId?: string | null;
  sessionId: string | null;
  origem: "chat" | "vitrine" | "produto" | "voucher" | "material";
  interesse?: string;
  /** No chat, a Orbi registra a confirmação na conversa. */
  confirmar?: boolean;
  botao?: string;
  aoCapturar: (r: { nome: string; whatsapp: string; mensagem: string }) => void;
}) {
  const [nome, setNome] = useState(() => lerVisitante(businessId).nome);
  const [whatsapp, setWhatsapp] = useState(() => lerVisitante(businessId).whatsapp);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const valido = !!digitosBR(whatsapp);

  async function enviar() {
    if (!valido || enviando) { if (!valido) setErro("Confere o número, precisa de DDD."); return; }
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/leads/capturar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, conversationId: conversationId ?? null, sessionId, origem, interesse, nome: nome.trim(), whatsapp, confirmar }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Não consegui salvar agora. Tenta de novo."); return; }
      guardarVisitante(businessId, nome.trim(), whatsapp.trim());
      aoCapturar({ nome: nome.trim(), whatsapp: whatsapp.trim(), mensagem: data.mensagem });
    } catch {
      setErro("Não consegui salvar agora. Tenta de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Seu nome (opcional)"
        autoComplete="name"
        aria-label="Seu nome"
        className="w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
      />
      <input
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
        placeholder="WhatsApp com DDD"
        inputMode="tel"
        autoComplete="tel"
        aria-label="Seu WhatsApp"
        className="w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
      />
      {erro && <p className="text-[12.5px] text-red-600">{erro}</p>}
      <button
        type="button"
        onClick={enviar}
        disabled={enviando || !valido}
        className="w-full cursor-pointer rounded-full bg-on-background py-3 text-[15px] font-semibold text-white disabled:opacity-40"
      >
        {enviando ? "Salvando…" : botao}
      </button>
    </div>
  );
}
