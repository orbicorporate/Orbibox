import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calcularResumoSemanal } from "@/lib/resumoSemanal";
import { emailResumoSemanal } from "@/lib/resumoEmail";
import { sendEmail } from "@/lib/email";

// Toda segunda de manhã (agendado no vercel.json): manda pro dono de cada
// negócio o resumo da semana em palavras, com uma dica. Só pra quem deixou
// a opção ligada em Resultados.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const supabase = createServiceClient();
  const base = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : new URL(req.url).origin;
  const { data: negocios } = await supabase.from("businesses").select("id, name, owner_id").eq("resumo_semanal", true).eq("onboarding_status", "ready").limit(2000);

  let enviados = 0;
  for (const n of negocios ?? []) {
    try {
      const { data: dono } = await supabase.auth.admin.getUserById(n.owner_id);
      const email = dono?.user?.email;
      if (!email) continue;
      const resumo = await calcularResumoSemanal(supabase, n.id);
      const { subject, html } = emailResumoSemanal({ nome: n.name, resumo, base, businessId: n.id });
      await sendEmail({ to: email, subject, html });
      enviados++;
    } catch (e) {
      console.error("resumo semanal: falhou para", n.id, e);
    }
  }
  return NextResponse.json({ enviados });
}
