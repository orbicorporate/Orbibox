import { createHmac } from "crypto";
import type { ResumoSemanal } from "@/lib/resumoSemanal";

export function assinaturaSair(businessId: string): string {
  return createHmac("sha256", process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "orbibox").update(`sair:${businessId}`).digest("hex").slice(0, 24);
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const nf = (n: number) => n.toLocaleString("pt-BR");

function bloco(rotulo: string, valor: number, fundo: string, cor: string) {
  return `<td width="50%" style="padding:5px"><div style="background:${fundo};border-radius:20px;padding:16px"><p style="margin:0;font-size:12px;color:${cor};opacity:.85">${rotulo}</p><p style="margin:6px 0 0;font-size:30px;font-weight:600;line-height:1;color:${cor}">${nf(valor)}</p></div></td>`;
}

function barras(porDia: ResumoSemanal["porDia"]) {
  const max = Math.max(1, ...porDia.map((d) => d.n));
  const melhor = porDia.reduce((m, d, i) => (d.n > porDia[m].n ? i : m), 0);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px"><tr>${porDia
    .map((d, i) => {
      const h = Math.max(6, Math.round((d.n / max) * 84));
      const cor = i === melhor && d.n > 0 ? "#6DB300" : "#D9DEE6";
      return `<td align="center" valign="bottom" style="padding:0 3px"><div style="font-size:11px;color:#5C6066;margin-bottom:4px">${d.n}</div><div style="height:${h}px;background:${cor};border-radius:8px 8px 0 0"></div><div style="font-size:11px;color:#8A8D93;margin-top:5px">${esc(d.rotulo)}</div></td>`;
    })
    .join("")}</tr></table>`;
}

export function emailResumoSemanal({ nome, resumo, base, businessId }: { nome: string; resumo: ResumoSemanal; base: string; businessId: string }) {
  const sair = `${base}/api/resumo-semanal/sair?b=${businessId}&t=${assinaturaSair(businessId)}`;
  const dif = resumo.visitasAntes > 0 ? Math.round(((resumo.visitas - resumo.visitasAntes) / resumo.visitasAntes) * 100) : null;
  const variacao =
    dif === null || resumo.visitas === 0
      ? ""
      : `<span style="display:inline-block;margin-top:12px;background:${dif >= 0 ? "#E3F9C9" : "#FFE1E1"};color:${dif >= 0 ? "#2B6B00" : "#B3261E"};border-radius:999px;padding:5px 12px;font-size:12px">${dif > 0 ? `${dif}% a mais` : dif < 0 ? `${Math.abs(dif)}% a menos` : "Igual"} que na semana anterior</span>`;
  const destaques = [
    resumo.topTitulo ? `<div style="background:#FFEAD7;border-radius:20px;padding:16px;margin-top:10px"><p style="margin:0;font-size:12px;color:#A8481A">O mais procurado</p><p style="margin:6px 0 0;font-size:18px;font-weight:600;color:#A8481A">${esc(resumo.topTitulo)}</p></div>` : "",
    resumo.origem ? `<div style="background:#EFE6FF;border-radius:20px;padding:16px;margin-top:10px"><p style="margin:0;font-size:12px;color:#6A3FC4">De onde vieram</p><p style="margin:6px 0 0;font-size:18px;font-weight:600;color:#6A3FC4">${esc(resumo.origem)}</p><p style="margin:4px 0 0;font-size:13px;color:#6A3FC4">A maioria chegou por aqui.</p></div>` : "",
  ].join("");

  const html = `<!doctype html><html><body style="margin:0;background:#F3F3F0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111318">
<div style="max-width:520px;margin:0 auto;padding:28px 16px">
<p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8A8D93;margin:0 4px">Orbibox · resumo da semana</p>
<h1 style="font-size:24px;font-weight:600;margin:8px 4px 16px">${esc(nome)}</h1>

<div style="background:#111318;border-radius:26px;padding:24px;color:#fff">
<p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.55)">Visitas nos últimos 7 dias</p>
<p style="margin:8px 0 0;font-size:56px;font-weight:600;line-height:1;letter-spacing:-.02em">${nf(resumo.visitas)}</p>
<p style="margin:8px 0 0;font-size:15px;line-height:1.4;color:rgba(255,255,255,.8)">${resumo.visitas === 0 ? esc(resumo.frases[0] ?? "") : resumo.visitas === 1 ? "pessoa abriu seu link." : "pessoas abriram seu link."}</p>
${variacao}
</div>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:6px"><tr>
${bloco("Toques", resumo.acoes, "#DDF9F4", "#00695F")}${bloco("Foram pro WhatsApp", resumo.whatsapp, "#EEFCCB", "#2F6B00")}
</tr><tr>
${bloco("Conversas com a Orbi", resumo.conversas, "#EFE6FF", "#6A3FC4")}${bloco("Vouchers pegos", resumo.vouchers, "#FFEAD7", "#A8481A")}
</tr></table>

<div style="background:#fff;border-radius:22px;padding:18px;margin-top:10px">
<p style="margin:0;font-size:14px;font-weight:600">Visitas por dia</p>
<p style="margin:2px 0 0;font-size:12.5px;color:#5C6066">O melhor dia aparece em verde.</p>
${barras(resumo.porDia)}
</div>
${destaques}

<div style="background:#1B1E26;border-radius:22px;padding:20px;margin-top:10px;color:#fff">
<p style="margin:0;font-size:12px;color:rgba(255,255,255,.6)">O que fazer agora</p>
<p style="margin:8px 0 14px;font-size:15px;line-height:1.45">${esc(resumo.dica.texto)}</p>
<a href="${base}${resumo.dica.href}" style="display:inline-block;background:#fff;color:#111318;text-decoration:none;border-radius:999px;padding:11px 20px;font-size:14px">${esc(resumo.dica.rotulo)} →</a>
</div>

<p style="text-align:center;margin:18px 0 0"><a href="${base}/resumo-semanal" style="font-size:13px;color:#111318">Ver o resumo completo e salvar em PDF</a></p>
<p style="font-size:12px;color:#8A8D93;margin:14px 4px 0">Você recebe isto toda segunda. <a href="${sair}" style="color:#8A8D93">Não quero mais receber</a>.</p>
</div></body></html>`;
  const visitas = resumo.visitas;
  const subject = visitas > 0 ? `${visitas} ${visitas === 1 ? "pessoa abriu" : "pessoas abriram"} seu link esta semana` : "Sua semana no Orbibox";
  return { subject, html };
}
