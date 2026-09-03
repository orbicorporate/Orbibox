import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Cada tipo de clique é uma conversão distinta — nada de número inventado.
const TIPOS = [
  { kind: "categoria", label: "Categorias abertas", nota: "foram para o seu site" },
  { kind: "produto", label: "Produtos abertos", nota: "foram para a página do produto" },
  { kind: "whatsapp", label: "WhatsApp", nota: "iniciaram conversa" },
  { kind: "ligar", label: "Ligações", nota: "tocaram em ligar" },
  { kind: "zara", label: "Conversas com a Zara", nota: "pediram ajuda da IA" },
] as const;

export default async function PulsePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();

  const [visitasRes, cliquesRes] = await Promise.all([
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("click_events").select("kind, created_at").eq("business_id", business!.id).limit(2000),
  ]);

  const visitas = visitasRes.count ?? 0;
  const cliques = cliquesRes.data ?? [];

  const porTipo: Record<string, number> = {};
  for (const c of cliques) porTipo[c.kind] = (porTipo[c.kind] ?? 0) + 1;
  const totalCliques = cliques.length;

  // Quantos por cento das visitas resultaram em alguma ação.
  const taxa = visitas > 0 ? Math.min(100, Math.round((totalCliques / visitas) * 100)) : 0;

  // Últimos 7 dias, a partir dos cliques reais.
  const hoje = new Date();
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - (6 - i));
    return d;
  });
  const porDia = dias.map((d) => {
    const chave = d.toISOString().slice(0, 10);
    return cliques.filter((c) => (c.created_at ?? "").slice(0, 10) === chave).length;
  });
  const maxDia = Math.max(1, ...porDia);
  const w = 320, h = 90;
  const path = porDia
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / 6) * w).toFixed(1)},${(h - (v / maxDia) * h).toFixed(1)}`)
    .join(" ");
  const NOMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="flex flex-col">
      <p className="mt-2 text-center text-[13px] uppercase tracking-wide text-text-tertiary">Orbi Pulse</p>

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

      <p className="mt-8 text-[13px] uppercase tracking-wide text-text-tertiary">Ações por tipo</p>
      <div className="mt-3 flex flex-col">
        {TIPOS.map((t) => (
          <div key={t.kind} className="flex items-center justify-between border-b border-divider py-4">
            <div className="min-w-0">
              <p className="text-[15px] text-on-background">{t.label}</p>
              <p className="text-[12px] text-text-tertiary">{t.nota}</p>
            </div>
            <span className="font-[family-name:var(--font-manrope)] text-[22px] font-medium">
              {(porTipo[t.kind] ?? 0).toLocaleString("pt-BR")}
            </span>
          </div>
        ))}
      </div>

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
          <p className="text-[14px] text-text-secondary">Últimos 7 dias</p>
          <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 w-full">
            <path d={path} fill="none" stroke="var(--on-background)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="mt-3 flex justify-between text-[11px] text-text-tertiary">
            {dias.map((d, i) => <span key={i}>{NOMES[d.getDay()]}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
