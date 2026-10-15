"use client";

import { createClient } from "@/lib/supabase/client";

/** Tipos de clique que o Pulse conta separadamente. */
export type ClickKind = "categoria" | "produto" | "whatsapp" | "ligar" | "email" | "zara" | "link" | "site" | "carrossel" | "cta" | "cupom" | "cardapio" | "lista_item" | `delivery_${string}`;

// O dono olhando a própria página (ou a prévia do painel) não conta como
// visitante: senão os números de Resultados e o resumo de valor mentem.
let rastreioDesligado = false;
export function desligarRastreio() {
  rastreioDesligado = true;
}
export function rastreioAtivo() {
  return !rastreioDesligado;
}

/** Cliques que mostram interesse de verdade; alimentam o aviso de captura. */
const CLIQUES_DE_INTERESSE: string[] = ["produto", "categoria", "cardapio", "cupom", "carrossel", "lista_item"];
const chaveIntencao = (businessId: string) => `orbi_intencao_${businessId}`;

/** Quantos sinais de interesse a pessoa deu nesta visita (zera ao fechar a aba). */
export function pontosDeInteresse(businessId: string): number {
  try { return Number(sessionStorage.getItem(chaveIntencao(businessId)) ?? 0) || 0; } catch { return 0; }
}

function somarInteresse(businessId: string) {
  try {
    const pontos = pontosDeInteresse(businessId) + 1;
    sessionStorage.setItem(chaveIntencao(businessId), String(pontos));
    window.dispatchEvent(new CustomEvent("orbi:interesse", { detail: { businessId, pontos } }));
  } catch { /* ignora */ }
}

/**
 * Registra o clique e segue o fluxo. Nunca bloqueia a navegação:
 * se o registro falhar, o visitante vai para o destino do mesmo jeito.
 */
export async function trackClick(params: {
  businessId: string;
  kind: ClickKind;
  contentItemId?: string | null;
  sessionId?: string | null;
  targetUrl?: string | null;
}) {
  if (rastreioDesligado) return;
  if (CLIQUES_DE_INTERESSE.includes(params.kind)) somarInteresse(params.businessId);
  try {
    const supabase = createClient();
    await supabase.from("click_events").insert({
      business_id: params.businessId,
      content_item_id: params.contentItemId ?? null,
      visitor_session_id: params.sessionId ?? null,
      kind: params.kind,
      target_url: params.targetUrl ?? null,
    });
  } catch {
    // silencioso de propósito, medir não pode atrapalhar o visitante
  }
}

/** Monta o link do WhatsApp a partir do número cadastrado. */
export function whatsappLink(numero: string, mensagem?: string) {
  const digits = numero.replace(/\D/g, "");
  const comPais = digits.startsWith("55") ? digits : `55${digits}`;
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${comPais}${texto}`;
}
