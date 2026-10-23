import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

// Abre logado no navegador: manda um e-mail de teste para o próprio dono da conta.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return new NextResponse("Entre no admin do Orbibox primeiro e abra este link de novo.", { status: 401 });
  }
  const r = await sendEmail({
    to: user.email,
    subject: "Teste de e-mail do Orbibox",
    html: "<p>Oi! Este é um e-mail de teste enviado por avisos@orbibox.app. Se você recebeu, o envio está funcionando.</p>",
  });
  if (!r?.ok) {
    return new NextResponse(`Falhou: ${r?.detail ?? "erro desconhecido"}`, { status: 500 });
  }
  return new NextResponse(`Enviado para ${user.email}. Confira a caixa de entrada e o spam.`);
}
