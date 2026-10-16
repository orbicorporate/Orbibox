import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { digitosBR, mensagemContatoAnotado } from "@/lib/telefone";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORIGENS = ["chat", "vitrine", "produto", "voucher", "material"] as const;

/**
 * Captura de contato feita pela própria pessoa (cartão no chat, folha de
 * saída, aviso na navegação). Cria ou atualiza o lead e, se veio de uma
 * conversa, amarra a conversa ao lead pra o dono ver quem é.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const businessId = String(body.businessId ?? "");
    const conversationId = body.conversationId ? String(body.conversationId) : null;
    const sessionId = body.sessionId && UUID.test(String(body.sessionId)) ? String(body.sessionId) : null;
    const origem = (ORIGENS as readonly string[]).includes(body.origem) ? (body.origem as string) : "chat";
    const nome = typeof body.nome === "string" ? body.nome.trim().slice(0, 80) || null : null;
    const interesse = typeof body.interesse === "string" ? body.interesse.trim().slice(0, 120) || null : null;
    const confirmar = !!body.confirmar;

    if (!UUID.test(businessId)) return NextResponse.json({ error: "Negócio inválido." }, { status: 400 });
    const digitos = digitosBR(String(body.whatsapp ?? ""));
    if (!digitos) return NextResponse.json({ error: "Confere o número, precisa de DDD." }, { status: 400 });

    const svc = createServiceClient();
    const { data: leadId, error } = await svc.rpc("upsert_lead", {
      p_business_id: businessId,
      p_whatsapp: digitos,
      p_name: nome,
      p_source: origem,
      p_session_id: sessionId,
      p_interest: interesse,
    });
    if (error || !leadId) return NextResponse.json({ error: "Não consegui salvar agora." }, { status: 500 });

    const mensagem = mensagemContatoAnotado(nome);
    if (conversationId && UUID.test(conversationId)) {
      // Só mexe na conversa se ela é mesmo deste negócio.
      const { data: conv } = await svc.from("conversations").select("id").eq("id", conversationId).eq("business_id", businessId).maybeSingle();
      if (conv) {
        await svc.from("conversations").update({ lead_id: leadId }).eq("id", conversationId);
        if (confirmar) await svc.from("messages").insert({ conversation_id: conversationId, role: "agent", content: mensagem });
      }
    }
    return NextResponse.json({ ok: true, leadId, mensagem });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao salvar o contato." }, { status: 500 });
  }
}
