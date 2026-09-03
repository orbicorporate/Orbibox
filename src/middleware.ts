import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Só as rotas que dependem de sessão. A vitrine pública (/[slug]) não passa mais por aqui,
// o que tira uma ida ao banco de toda visita.
export const config = {
  matcher: ["/admin/:path*", "/onboarding/:path*", "/login", "/signup"],
};
