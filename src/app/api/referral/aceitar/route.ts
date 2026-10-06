import { NextRequest, NextResponse } from "next/server";

// Botão "Aceitar convite" da página /r/CODIGO: guarda o código (30 dias) e
// leva pro cadastro já com o convite à vista.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("c") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const res = NextResponse.redirect(new URL(code ? `/signup?convite=${code}` : "/signup", url.origin));
  if (code) res.cookies.set("orbi_ref", code, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" });
  return res;
}
