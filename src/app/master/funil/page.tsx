import { createClient } from "@/lib/supabase/server";

// Funil do cadastro: onde as pessoas desistem, quanto tempo levam até a
// página ficar no ar e quantas compartilham o link no primeiro dia.
const PASSOS: { evento: string; rotulo: string }[] = [
  { evento: "onb_dados", rotulo: "Abriu o cadastro do negócio" },
  { evento: "onb_analisando", rotulo: "Mandou analisar a marca" },
  { evento: "onb_contato", rotulo: "Chegou no contato" },
  { evento: "onb_confirmar", rotulo: "Chegou em Sua marca" },
  { evento: "onb_criou", rotulo: "Criou a página" },
  { evento: "onb_resultado", rotulo: "Viu a página no ar" },
];

function trintaDiasAtras() {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

function mediana(xs: number[]) {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default async function FunilPage() {
  const supabase = await createClient();
  const desde = trintaDiasAtras();
  const { data } = await supabase
    .from("funnel_events")
    .select("user_id, evento, created_at")
    .gte("created_at", desde)
    .order("created_at", { ascending: true })
    .limit(20000);
  const eventos = data ?? [];

  const usuariosPor: Record<string, Set<string>> = {};
  const primeiro: Record<string, Record<string, number>> = {};
  for (const e of eventos) {
    (usuariosPor[e.evento] ??= new Set()).add(e.user_id);
    const t = new Date(e.created_at).getTime();
    primeiro[e.user_id] ??= {};
    if (!(e.evento in primeiro[e.user_id])) primeiro[e.user_id][e.evento] = t;
  }
  const base = usuariosPor["onb_dados"]?.size ?? 0;

  const tempos: number[] = [];
  let criaram = 0;
  let compartilharam = 0;
  for (const u of Object.keys(primeiro)) {
    const p = primeiro[u];
    if (p.onb_criou) {
      criaram++;
      if (p.onb_dados) tempos.push((p.onb_criou - p.onb_dados) / 60000);
      if (p.compartilhou && p.compartilhou - p.onb_criou <= 24 * 60 * 60 * 1000 && p.compartilhou >= p.onb_criou) compartilharam++;
    }
  }
  const med = mediana(tempos);
  const erros = usuariosPor["onb_analise_erro"]?.size ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-semibold tracking-[-0.02em]">Funil do cadastro</h1>
        <p className="mt-1 text-[14px] text-text-secondary">Últimos 30 dias. Onde as pessoas param e quanto tempo levam até a página ir pro ar.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[20px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
          <p className="text-[12px] text-text-tertiary">Tempo até a página no ar</p>
          <p className="mt-1 font-[family-name:var(--font-manrope)] text-[26px] font-semibold">{med === null ? "–" : med < 1 ? "< 1 min" : `${Math.round(med)} min`}</p>
          <p className="text-[12px] text-text-tertiary">mediana de {tempos.length} cadastros</p>
        </div>
        <div className="rounded-[20px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
          <p className="text-[12px] text-text-tertiary">Compartilharam no 1º dia</p>
          <p className="mt-1 font-[family-name:var(--font-manrope)] text-[26px] font-semibold">{criaram ? `${Math.round((compartilharam / criaram) * 100)}%` : "–"}</p>
          <p className="text-[12px] text-text-tertiary">{compartilharam} de {criaram} que criaram</p>
        </div>
      </div>

      <div className="rounded-[20px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
        <p className="text-[15px] font-semibold">Passo a passo</p>
        <div className="mt-4 flex flex-col gap-3.5">
          {PASSOS.map((p) => {
            const n = usuariosPor[p.evento]?.size ?? 0;
            const pct = base ? Math.round((n / base) * 100) : 0;
            return (
              <div key={p.evento}>
                <div className="flex justify-between text-[13.5px]">
                  <span>{p.rotulo}</span>
                  <span className="font-medium">{n} <span className="text-text-tertiary">({pct}%)</span></span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-soft">
                  <div className="h-full rounded-full bg-on-background" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        {erros > 0 && <p className="mt-4 text-[13px] text-red-600">{erros} {erros === 1 ? "pessoa viu" : "pessoas viram"} erro na análise da marca.</p>}
        <p className="mt-4 text-[12px] text-text-tertiary">“Chegou no contato” inclui quem pulou a tela do que a Orbi entendeu (acontece quando a análise não acha pontos fortes).</p>
      </div>
    </div>
  );
}
