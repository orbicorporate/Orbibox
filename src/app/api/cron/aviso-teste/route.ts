import { APP_URL } from "@/lib/appUrl";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email";

// Todo dia de manhã (vercel.json): avisa por e-mail quem está no teste grátis sem cartão e
// vê o teste acabar amanhã. A janela de 24h não se sobrepõe entre um dia e o outro, então
// cada pessoa recebe o aviso uma vez só.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const supabase = createServiceClient();
  const agora = Date.now();
  const de = new Date(agora + 12 * 3600_000).toISOString();
  const ate = new Date(agora + 36 * 3600_000).toISOString();

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("owner_id, trial_ends_at")
    .eq("status", "trialing")
    .is("stripe_subscription_id", null)
    .gt("trial_ends_at", de)
    .lte("trial_ends_at", ate)
    .limit(2000);

  let enviados = 0;
  for (const s of subs ?? []) {
    try {
      const { data: dono } = await supabase.auth.admin.getUserById(s.owner_id);
      const email = dono?.user?.email;
      if (!email) continue;
      const { data: negocio } = await supabase.from("businesses").select("name").eq("owner_id", s.owner_id).order("created_at", { ascending: true }).limit(1).maybeSingle();
      const quando = new Date(s.trial_ends_at as string).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      const nome = negocio?.name ?? "seu negócio";
      const link = `${APP_URL}/admin/planos`;
      const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111318">
<h1 style="font-size:22px;line-height:1.25;margin:0 0 12px">O teste grátis do Orbibox de ${nome} acaba amanhã</h1>
<p style="font-size:15px;line-height:1.5;margin:0 0 12px">Seu teste termina em ${quando}. Depois disso, a Orbi, os vouchers e o gift ficam bloqueados e sua página passa para o plano grátis. Nada é apagado.</p>
<p style="font-size:15px;line-height:1.5;margin:0 0 20px">Para manter tudo funcionando, escolha seu plano antes do fim do teste.</p>
<a href="${link}" style="display:inline-block;background:#111318;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-size:15px;font-weight:bold">Escolher meu plano</a>
</div>`;
      await sendEmail({ to: email, subject: `Seu teste grátis acaba amanhã, ${nome}`, html });
      enviados++;
    } catch (e) {
      console.error("aviso teste: falhou para", s.owner_id, e);
    }
  }
  return NextResponse.json({ enviados });
}
