"use client";

import { createClient } from "@/lib/supabase/client";

/** Tipos de clique que o Pulse conta separadamente. */
export type ClickKind = "categoria" | "produto" | "whatsapp" | "ligar" | "email" | "zara" | "link" | "site";

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
    // silencioso de propósito — medir não pode atrapalhar o visitante
  }
}

/** Monta o link do WhatsApp a partir do número cadastrado. */
export function whatsappLink(numero: string, mensagem?: string) {
  const digits = numero.replace(/\D/g, "");
  const comPais = digits.startsWith("55") ? digits : `55${digits}`;
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${comPais}${texto}`;
}
