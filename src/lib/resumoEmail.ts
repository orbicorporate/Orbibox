import { createHmac } from "crypto";
import type { ResumoSemanal } from "@/lib/resumoSemanal";

export function assinaturaSair(businessId: string): string {
  return createHmac("sha256", process.env.CRON_SECRET || "orbibox").update(`sair:${businessId}`).digest("hex").slice(0, 24);
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function emailResumoSemanal({ nome, resumo, base, businessId }: { nome: string; resumo: ResumoSemanal; base: string; businessId: string }) {
  const sair = `${base}/api/resumo-semanal/sair?b=${businessId}&t=${assinaturaSair(businessId)}`;
  const html = `<!doctype html><html><body style="margin:0;background:#F3F3F0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111318">
<div style="max-width:480px;margin:0 auto;padding:28px 20px">
<p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8A8D93;margin:0">Orbibox · resumo da semana</p>
<h1 style="font-size:22px;font-weight:600;margin:8px 0 18px">${esc(nome)}</h1>
<div style="background:#fff;border-radius:20px;padding:20px">
${resumo.frases.map((f) => `<p style="font-size:15px;line-height:1.45;margin:0 0 8px">${esc(f)}</p>`).join("")}
<div style="background:#F3F3F0;border-radius:14px;padding:14px;margin-top:14px">
<p style="font-size:12px;font-weight:600;color:#5C6066;margin:0">O que fazer agora</p>
<p style="font-size:14px;line-height:1.45;margin:6px 0 12px">${esc(resumo.dica.texto)}</p>
<a href="${base}${resumo.dica.href}" style="display:inline-block;background:#111318;color:#fff;text-decoration:none;border-radius:999px;padding:10px 18px;font-size:13px">${esc(resumo.dica.rotulo)} →</a>
</div></div>
<p style="font-size:12px;color:#8A8D93;margin:18px 4px 0">Você recebe isto toda segunda. <a href="${sair}" style="color:#8A8D93">Não quero mais receber</a>.</p>
</div></body></html>`;
  const visitas = resumo.visitas;
  const subject = visitas > 0 ? `${visitas} ${visitas === 1 ? "pessoa abriu" : "pessoas abriram"} seu link esta semana` : "Sua semana no Orbibox";
  return { subject, html };
}
