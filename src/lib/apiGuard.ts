import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Exige uma conta de verdade (não vale login anônimo de visitante). */
export async function exigirLogin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "Entre na sua conta para usar isso." }, { status: 401 });
  }
  return null;
}

const janelas = new Map<string, number[]>();

/** Limite simples por IP e rota (em memória, por instância). Devolve resposta 429 se passou. */
export function limitar(req: Request, rota: string, max: number, janelaMs = 60_000): NextResponse | null {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "sem-ip";
  const chave = `${rota}:${ip}`;
  const agora = Date.now();
  const recentes = (janelas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (recentes.length >= max) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um pouco." }, { status: 429 });
  }
  recentes.push(agora);
  janelas.set(chave, recentes);
  if (janelas.size > 5000) janelas.clear();
  return null;
}
