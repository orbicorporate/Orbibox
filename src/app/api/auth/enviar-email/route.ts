import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email";

// E-mails de conta (confirmar cadastro e redefinir senha) enviados pelo Resend, com o domínio do Orbibox.
// O envio padrão do Supabase tem limite baixíssimo por hora e derruba cadastro e "esqueci a senha" pra todo mundo.
// Aqui o link é gerado no servidor e só o token vai no e-mail; /auth/callback troca o token por sessão.

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;

function html(titulo: string, texto: string, botao: string, link: string, rodape: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:440px;margin:0 auto;padding:32px 24px;color:#111318">
<p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;margin:0 0 20px">Orbibox</p>
<h1 style="font-size:24px;font-weight:600;margin:0 0 12px">${titulo}</h1>
<p style="font-size:15px;line-height:1.5;color:#374151;margin:0 0 24px">${texto}</p>
<a href="${link}" style="display:inline-block;background:#111318;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:999px">${botao}</a>
<p style="font-size:12.5px;line-height:1.5;color:#6b7280;margin:28px 0 0">${rodape}</p></div>`;
}

export async function POST(request: Request) {
  const origem = new URL(request.url).origin;
  let corpo: { tipo?: string; email?: string; password?: string; nome?: string; convite?: string | null };
  try { corpo = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const email = (corpo.email ?? "").trim().toLowerCase();
  if (!emailValido(email) || (corpo.tipo !== "recuperar" && corpo.tipo !== "confirmar")) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createServiceClient();

  if (corpo.tipo === "recuperar") {
    // Sempre responde ok: não revela se o e-mail tem conta.
    const { data } = await admin.auth.admin.generateLink({ type: "recovery", email });
    const token = data?.properties?.hashed_token;
    if (token) {
      const link = `${origem}/auth/callback?token_hash=${encodeURIComponent(token)}&type=recovery`;
      await sendEmail({ to: email, subject: "Redefinir sua senha do Orbibox", html: html("Redefinir sua senha", "Recebemos um pedido para trocar a senha da sua conta. Toque no botão para escolher uma nova.", "Escolher nova senha", link, "Se você não pediu isso, pode ignorar este e-mail. Nada muda na sua conta.") });
    }
    return NextResponse.json({ ok: true });
  }

  // confirmar: cria a conta (com senha) ou, se ela já existe sem confirmar, só gera um link novo.
  let token: string | undefined;
  let tipoToken: "signup" | "magiclink" = "signup";
  if (corpo.password && corpo.password.length >= 6 && corpo.password.length <= 200) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password: corpo.password,
      options: { data: { full_name: (corpo.nome ?? "").slice(0, 120), ...(corpo.convite ? { ref_code: String(corpo.convite).slice(0, 40) } : {}) } },
    });
    if (!error) token = data?.properties?.hashed_token;
    else if (!/already|registered|exists/i.test(error.message)) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  }
  if (!token) {
    const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    token = data?.properties?.hashed_token;
    tipoToken = "magiclink";
  }
  if (token) {
    const link = `${origem}/auth/callback?token_hash=${encodeURIComponent(token)}&type=${tipoToken}`;
    await sendEmail({ to: email, subject: "Confirme seu e-mail no Orbibox", html: html("Confirme seu e-mail", "Falta só um toque para ativar sua conta e criar o seu Orbibox.", "Confirmar e-mail", link, "Se você não criou uma conta no Orbibox, pode ignorar este e-mail.") });
  }
  return NextResponse.json({ ok: true });
}
