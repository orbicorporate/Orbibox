import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Link do e-mail de confirmação (e de login por link) cai aqui com ?code=.
// Troca o código por sessão e segue pra tela que finaliza o cadastro.
// Só aceita caminho do próprio site. Barra invertida e esquemas estranhos viram outro destino em alguns navegadores.
function caminhoInterno(next: string, origin: string): string | null {
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  try {
    return new URL(next, origin).origin === origin ? next : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/auth/confirmado";
  // Só aceita caminho interno, nunca redireciona pra fora.
  const destino = caminhoInterno(next, url.origin) ?? "/auth/confirmado";

  // Link enviado pelo Orbibox (Resend): troca o token por sessão aqui no servidor.
  // A sessão do link substitui qualquer outra que estivesse aberta no navegador.
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type");
  if (tokenHash && (tipo === "recovery" || tipo === "signup" || tipo === "magiclink")) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    if (!error) return NextResponse.redirect(new URL(tipo === "recovery" ? "/redefinir-senha?recuperacao=1" : "/auth/confirmado", url.origin));
    return NextResponse.redirect(new URL(tipo === "recovery" ? "/redefinir-senha" : "/login?confirmado=1", url.origin));
  }

  // Volta do Google com erro (ex.: esse Google já pertence a outra conta, ao tentar ligá-lo ao perfil do fã):
  // segue para a página de origem, nunca para o login. Se o Google já tem conta, a página entra com ele direto.
  const erroCodigo = url.searchParams.get("error_code");
  if (erroCodigo && destino !== "/auth/confirmado") {
    const volta = new URL(destino, url.origin);
    if (erroCodigo === "identity_already_exists") volta.searchParams.set("google", "entrar");
    else volta.searchParams.set("erro", "login");
    return NextResponse.redirect(volta);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destino, url.origin));
  }
  // Link velho, já usado, ou aberto em outro navegador: manda pro login com aviso.
  return NextResponse.redirect(new URL("/login?confirmado=1", url.origin));
}
