import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PulseDetails } from "./PulseDetails";
import { PulseDateFilter } from "./PulseDateFilter";
import { rangeFromParams, buildSeries } from "./date-range";

export default async function PulsePage({
  searchParams,
}: {
  searchParams: Promise<{ since?: string; until?: string; label?: string }>;
}) {
  const sp = await searchParams;
  const { since, until } = rangeFromParams(sp);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, slug")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();

  let visitasQuery = supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", business!.id);
  let cliquesQuery = supabase.from("click_events").select("kind, created_at, content_item_id").eq("business_id", business!.id).limit(5000);
  if (since) { visitasQuery = visitasQuery.gte("started_at", since); cliquesQuery = cliquesQuery.gte("created_at", since); }
  if (until) { visitasQuery = visitasQuery.lte("started_at", until); cliquesQuery = cliquesQuery.lte("created_at", until); }

  const [visitasRes, cliquesRes, itemsRes] = await Promise.all([
    visitasQuery,
    cliquesQuery,
    supabase.from("content_items").select("id, title, image_url, brand_label").eq("business_id", business!.id),
  ]);

  const visitas = visitasRes.count ?? 0;
  const cliques = cliquesRes.data ?? [];
  const itemMap: Record<string, { title: string; image_url: string | null; brand_label: string | null }> = {};
  for (const it of itemsRes.data ?? []) itemMap[it.id] = { title: it.title, image_url: it.image_url, brand_label: it.brand_label };

  const porTipo: Record<string, number> = {};
  // Quais itens específicos foram clicados dentro de cada tipo de ação —
  // é isso que abre o detalhe ao expandir uma linha.
  const porTipoItem: Record<string, Record<string, number>> = {};
  const porItemGeral: Record<string, number> = {};
  for (const c of cliques) {
    porTipo[c.kind] = (porTipo[c.kind] ?? 0) + 1;
    if (c.content_item_id) {
      porTipoItem[c.kind] ??= {};
      porTipoItem[c.kind][c.content_item_id] = (porTipoItem[c.kind][c.content_item_id] ?? 0) + 1;
      porItemGeral[c.content_item_id] = (porItemGeral[c.content_item_id] ?? 0) + 1;
    }
  }
  const totalCliques = cliques.length;
  const topItems = Object.entries(porItemGeral)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => ({ id, count }));

  // Quantos por cento das visitas resultaram em alguma ação.
  const taxa = visitas > 0 ? Math.min(100, Math.round((totalCliques / visitas) * 100)) : 0;

  // Série ao longo do tempo — dias ou meses, dependendo do período filtrado.
  const { valores: porDia, labels: labelsDia } = buildSeries(cliques, since, until);
  const maxDia = Math.max(1, ...porDia);
  const w = 320, h = 90;
  const pontos = Math.max(1, porDia.length - 1);
  const path = porDia
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / pontos) * w).toFixed(1)},${(h - (v / maxDia) * h).toFixed(1)}`)
    .join(" ");

  // Páginas visitadas: aberturas, rolagem de carrossel e clique no CTA por item.
  const paginas = Object.keys(itemMap)
    .map((id) => ({
      id,
      aberturas: porTipoItem["produto"]?.[id] ?? 0,
      carrossel: porTipoItem["carrossel"]?.[id] ?? 0,
      cta: porTipoItem["cta"]?.[id] ?? 0,
    }))
    .filter((p) => p.aberturas + p.carrossel + p.cta > 0)
    .sort((a, b) => b.aberturas - a.aberturas);

  return (
    <div className="flex flex-col">
      <p className="mt-2 text-center text-[13px] uppercase tracking-wide text-text-tertiary">Orbi Pulse</p>

      <PulseDateFilter />

      <div className="relative mx-auto mt-6 flex h-56 w-56 items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--divider)" strokeWidth="3" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(taxa / 100) * 289} 289`} />
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--orbi-gradient-start)" />
              <stop offset="100%" stopColor="var(--orbi-gradient-end)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="text-center">
          <p className="font-[family-name:var(--font-manrope)] text-[52px] font-medium leading-none">{taxa}%</p>
          <p className="mt-1 text-[13px] text-text-secondary">de quem entra, age</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-[22px] bg-surface-soft px-5 py-4">
        <span className="text-[14px] text-text-secondary">Visitas</span>
        <span className="font-[family-name:var(--font-manrope)] text-[22px] font-medium">{visitas.toLocaleString("pt-BR")}</span>
      </div>

      <PulseDetails porTipo={porTipo} porTipoItem={porTipoItem} itemMap={itemMap} topItems={topItems} paginas={paginas} slug={business!.slug} />

      {totalCliques === 0 ? (
        <div className="mt-8 rounded-[28px] border border-divider bg-surface-white p-6">
          <p className="font-[family-name:var(--font-manrope)] text-[18px] font-medium">Ainda sem cliques</p>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            Assim que alguém abrir seu link e tocar num box ou num contato, os números aparecem aqui —
            separados por tipo de ação.
          </p>
          <Link href="/admin/vitrine" className="mt-5 inline-flex rounded-full bg-button-primary px-6 py-3 text-[14px] font-medium text-white">
            Revisar vitrine →
          </Link>
        </div>
      ) : (
        <div className="mt-8 rounded-[28px] border border-divider bg-surface-white p-6">
          <p className="text-[14px] text-text-secondary">{sp.label ?? "Últimos 7 dias"}</p>
          <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 w-full">
            <path d={path} fill="none" stroke="var(--on-background)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="mt-3 flex justify-between text-[11px] text-text-tertiary">
            {labelsDia.map((l, i) => {
              const step = Math.ceil(labelsDia.length / 8);
              return <span key={i}>{i % step === 0 || i === labelsDia.length - 1 ? l : ""}</span>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
