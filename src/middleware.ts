import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Freio contra raspagem em massa e abuso das rotas de IA: por IP, em memória (vale por instância).
// Webhook do Stripe e cron ficam de fora, quem chama é servidor com assinatura própria.
const janelas = new Map<string, number[]>();
function passouDoLimite(chave: string, max: number, janelaMs = 60_000) {
  const agora = Date.now();
  const recentes = (janelas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (recentes.length >= max) return true;
  recentes.push(agora);
  janelas.set(chave, recentes);
  if (janelas.size > 5000) janelas.clear();
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/stripe-webhook") || pathname.startsWith("/api/cron/")) return NextResponse.next();
    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "sem-ip";
    if (passouDoLimite(`api:${ip}`, 90)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um pouco." }, { status: 429, headers: { "Retry-After": "60" } });
    }
    return NextResponse.next();
  }
  return await updateSession(request);
}

// Rotas que dependem de sessão, mais a /api só para o limite acima. A vitrine pública (/[slug])
// não passa por aqui, o que tira uma ida ao banco de toda visita.
export const config = {
  matcher: ["/admin/:path*", "/onboarding/:path*", "/login", "/signup", "/abrir", "/api/:path*"],
};
