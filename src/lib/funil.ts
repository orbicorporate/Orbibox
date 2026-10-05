"use client";

import { createClient } from "@/lib/supabase/client";

// Registra um passo do funil (cadastro, criação da página, primeiro
// compartilhamento). Serve pra saber onde as pessoas desistem e quanto tempo
// levam até a página ficar no ar. Nunca trava a tela: falhou, ignora.
// Com `umaVez`, o mesmo evento só é registrado uma vez por aba.
export function registrarFunil(evento: string, opts: { businessId?: string | null; meta?: Record<string, unknown>; umaVez?: boolean } = {}) {
  try {
    if (opts.umaVez) {
      const k = `orbi_funil_${evento}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    }
  } catch {}
  void createClient()
    .from("funnel_events")
    .insert({ evento, business_id: opts.businessId ?? null, meta: (opts.meta ?? {}) as never })
    .then(() => {}, () => {});
}
