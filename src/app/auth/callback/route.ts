import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Link do e-mail de confirmação (e de login por link) cai aqui com ?code=.
// Troca o código por sessão e segue pra tela que finaliza o cadastro.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/auth/confirmado";
  // Só aceita caminho interno, nunca redireciona pra fora.
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/auth/confirmado";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destino, url.origin));
  }
  // Link velho, já usado, ou aberto em outro navegador: manda pro login com aviso.
  return NextResponse.redirect(new URL("/login?confirmado=1", url.origin));
}
