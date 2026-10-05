import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assinaturaSair } from "@/lib/resumoEmail";

// Link "Não quero mais receber" do e-mail de segunda. Assinado, então só
// quem recebeu o e-mail consegue desligar.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const b = url.searchParams.get("b") ?? "";
  const t = url.searchParams.get("t") ?? "";
  if (!b || t !== assinaturaSair(b)) {
    return new NextResponse("Link inválido.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  await createServiceClient().from("businesses").update({ resumo_semanal: false }).eq("id", b);
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:-apple-system,Roboto,sans-serif;background:#F3F3F0;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0"><div style="max-width:340px;text-align:center;padding:24px"><h1 style="font-size:20px;font-weight:600">Pronto, não vamos mais mandar</h1><p style="color:#5C6066;font-size:14px">Dá pra ligar de novo quando quiser em Resultados, no painel.</p></div></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
