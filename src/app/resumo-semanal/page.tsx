import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { calcularResumoSemanal } from "@/lib/resumoSemanal";
import { BotoesPdf } from "./BotoesPdf";

export const metadata = { title: "Resumo da semana" };

const nf = (n: number) => n.toLocaleString("pt-BR");
const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

function Bloco({ rotulo, valor, fundo, cor }: { rotulo: string; valor: number; fundo: string; cor: string }) {
  return (
    <div className="break-inside-avoid rounded-[22px] p-4" style={{ backgroundColor: fundo, color: cor }}>
      <p className="text-[12.5px] opacity-85">{rotulo}</p>
      <p className="mt-1.5 text-[32px] font-semibold leading-none tabular-nums">{nf(valor)}</p>
    </div>
  );
}

/** Resumo da semana em página própria, bonita na tela e pronta para salvar em PDF. */
export default async function ResumoSemanalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const businessId = await getCurrentBusinessId(user.id);
  if (!businessId) redirect("/onboarding");
  const { data: negocio } = await supabase.from("businesses").select("name").eq("id", businessId).maybeSingle();
  const r = await calcularResumoSemanal(supabase, businessId);

  const agora = new Date();
  const inicio = new Date(agora.getTime() - 6 * 24 * 60 * 60 * 1000);
  const dif = r.visitasAntes > 0 ? Math.round(((r.visitas - r.visitasAntes) / r.visitasAntes) * 100) : null;
  const max = Math.max(1, ...r.porDia.map((d) => d.n));
  const melhor = r.porDia.reduce((m, d, i) => (d.n > r.porDia[m].n ? i : m), 0);

  return (
    <main className="mx-auto w-full max-w-[720px] bg-[#F3F3F0] px-5 py-6 text-[#111318] [print-color-adjust:exact] [-webkit-print-color-adjust:exact] print:max-w-none print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 12mm; } @media print { html, body { background: #fff !important; } }`}</style>
      <BotoesPdf />

      <p className="text-[12px] uppercase tracking-[0.12em] text-[#8A8D93]">Orbibox · resumo da semana</p>
      <h1 className="mt-1 text-[28px] font-semibold leading-tight">{negocio?.name ?? "Seu Orbibox"}</h1>
      <p className="mt-1 text-[13.5px] text-[#5C6066]">De {fmt(inicio)} a {fmt(agora)}</p>

      <section className="relative mt-5 break-inside-avoid overflow-hidden rounded-[28px] bg-[#111318] p-6 text-white">
        <p className="text-[12px] uppercase tracking-[0.12em] text-white/55">Visitas nos últimos 7 dias</p>
        <p className="mt-2 text-[60px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{nf(r.visitas)}</p>
        <p className="mt-2 text-[15px] leading-snug text-white/80">{r.visitas === 0 ? r.frases[0] : r.visitas === 1 ? "pessoa abriu seu link." : "pessoas abriram seu link."}</p>
        {dif !== null && r.visitas > 0 && (
          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-[12.5px] ${dif >= 0 ? "bg-[#E3F9C9] text-[#2B6B00]" : "bg-[#FFE1E1] text-[#B3261E]"}`}>
            {dif > 0 ? `${dif}% a mais` : dif < 0 ? `${Math.abs(dif)}% a menos` : "Igual"} que na semana anterior
          </span>
        )}
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <Bloco rotulo="Toques" valor={r.acoes} fundo="#DDF9F4" cor="#00695F" />
        <Bloco rotulo="Foram para o WhatsApp" valor={r.whatsapp} fundo="#EEFCCB" cor="#2F6B00" />
        <Bloco rotulo="Conversas com a Orbi" valor={r.conversas} fundo="#EFE6FF" cor="#6A3FC4" />
        <Bloco rotulo="Vouchers pegos" valor={r.vouchers} fundo="#FFEAD7" cor="#A8481A" />
      </section>

      <section className="mt-3 break-inside-avoid rounded-[22px] bg-white p-5 ring-1 ring-black/[0.06]">
        <p className="text-[15px] font-medium">Visitas por dia</p>
        <p className="mt-0.5 text-[13px] text-[#5C6066]">O melhor dia aparece em verde.</p>
        <div className="mt-4 flex h-[150px] items-end gap-2">
          {r.porDia.map((d, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[12px] tabular-nums text-[#5C6066]">{d.n}</span>
              <span className="w-full rounded-t-xl" style={{ height: `${Math.max(6, (d.n / max) * 100)}%`, backgroundColor: i === melhor && d.n > 0 ? "#6DB300" : "#D9DEE6" }} />
              <span className="text-[12px] text-[#8A8D93]">{d.rotulo}</span>
            </div>
          ))}
        </div>
      </section>

      {(r.topTitulo || r.origem) && (
        <section className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {r.topTitulo && (
            <div className="break-inside-avoid rounded-[22px] bg-[#FFEAD7] p-5 text-[#A8481A]">
              <p className="text-[12.5px]">O mais procurado</p>
              <p className="mt-1.5 text-[20px] font-semibold leading-tight">{r.topTitulo}</p>
            </div>
          )}
          {r.origem && (
            <div className="break-inside-avoid rounded-[22px] bg-[#EFE6FF] p-5 text-[#6A3FC4]">
              <p className="text-[12.5px]">De onde vieram</p>
              <p className="mt-1.5 text-[20px] font-semibold leading-tight">{r.origem}</p>
              <p className="mt-1 text-[13px]">A maioria chegou por aqui.</p>
            </div>
          )}
        </section>
      )}

      <section className="mt-3 break-inside-avoid rounded-[22px] bg-[#1B1E26] p-5 text-white">
        <p className="text-[12.5px] text-white/60">O que fazer agora</p>
        <p className="mt-2 text-[16px] leading-snug">{r.dica.texto}</p>
      </section>

      <p className="mt-5 text-center text-[12px] text-[#8A8D93]">Gerado pelo Orbibox em {fmt(agora)}</p>
    </main>
  );
}
