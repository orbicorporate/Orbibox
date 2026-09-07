import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";

const METRICS = [
  { key: "discovery", label: "Visitas", explica: "Pessoas que abriram seu link", icon: "◎", href: "/admin/pulse" },
  { key: "interest", label: "Interesses", explica: "Escolheram uma opção na tela inicial", icon: "♡", href: "/admin/pulse" },
  { key: "conversion", label: "Conversas reais", explica: "Trocaram mensagem de verdade com a Orbi", icon: "▤", href: "/admin/conversas" },
  { key: "relationship", label: "Ações", explica: "Cliques em produtos, links e WhatsApp", icon: "☞", href: "/admin/pulse" },
] as const;

export default async function HojePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();


  // Tudo que depende só do business roda em paralelo — antes eram 6 idas ao banco em fila.
  const [oppRes, visitsRes, convRowsRes, interestedRes, actionsRes, unseenRes, itemsCountRes] = await Promise.all([
    supabase.from("opportunities").select("*").eq("business_id", business!.id).eq("status", "open").order("impact_score", { ascending: false }).limit(2),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("conversations").select("id").eq("business_id", business!.id),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", business!.id).not("intent", "is", null),
    // "Ações" = cliques de verdade (produto, link, WhatsApp…) — mesma fonte do Pulse,
    // não a tabela de campanhas (isso não tinha nada a ver com o que o visitante faz).
    supabase.from("click_events").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("business_id", business!.id).eq("seen_by_owner", false),
    supabase.from("content_items").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
  ]);
  // O insight "Importe seu catálogo" só faz sentido antes de a Vitrine ter
  // conteúdo — se a pessoa já importou ou cadastrou produtos manualmente,
  // ele fecha sozinho aqui (nunca mais aparece) e mostra o próximo da fila.
  const hasItems = (itemsCountRes.count ?? 0) > 0;
  const openOpps = oppRes.data ?? [];
  let opportunity = openOpps[0] ?? null;
  if (opportunity && opportunity.category === "descoberta" && hasItems) {
    await supabase.from("opportunities").update({ status: "resolved" }).eq("id", opportunity.id);
    opportunity = openOpps[1] ?? null;
  }
  const visits = visitsRes.count, interested = interestedRes.count, actions = actionsRes.count;
  const unseenConversas = unseenRes.count ?? 0;

  // "Conversas reais" só conta quem de fato trocou mensagem com a Orbi — não
  // toda vez que alguém abriu o chat e fechou sem digitar nada (isso inflava
  // o número e não batia com o que aparecia no Pulse/Conversas).
  const convIds = (convRowsRes.data ?? []).map((c) => c.id);
  let realConvs = 0;
  if (convIds.length > 0) {
    const { data: msgRows } = await supabase.from("messages").select("conversation_id").in("conversation_id", convIds).eq("role", "visitor");
    realConvs = new Set((msgRows ?? []).map((m) => m.conversation_id)).size;
  }

  const values: Record<string, number> = {
    discovery: visits ?? 0,
    interest: interested ?? 0,
    conversion: realConvs,
    relationship: actions ?? 0,
  };

  // O botão do insight leva para onde a ação realmente acontece.
  const CTA: Record<string, { label: string; href: string }> = {
    descoberta: { label: "Abrir vitrine", href: "/admin/vitrine" },
    relacionamento: { label: "Configurar Orbi", href: "/admin/agent" },
    conversao: { label: "Ativar campanha", href: "/admin/campaigns" },
  };
  const cta = CTA[opportunity?.category ?? ""] ?? { label: "Ativar campanha", href: "/admin/campaigns" };

  return (
    <div className="relative flex flex-col">
      {/* Saudação dentro de um halo circular — nome do negócio, não do usuário
          que abriu o painel, já que mais gente da equipe também vai entrar. */}
      <div className="relative mx-auto mt-6 flex h-64 w-64 items-center justify-center">
        <div className="orbi-halo absolute inset-0" aria-hidden>
          <span className="orbi-halo__dot" />
        </div>

        {/* Sininho de notificação — perto do nome, canto inferior direito do
            halo. Pisca quando tem conversa que ainda não foi vista. */}
        <Link href="/admin/conversas" className="absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-surface-white shadow" aria-label="Conversas">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3a5 5 0 0 0-5 5v3.2c0 .7-.25 1.36-.7 1.9L5 15h14l-1.3-1.9a3 3 0 0 1-.7-1.9V8a5 5 0 0 0-5-5Z" />
            <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
          </svg>
          {unseenConversas > 0 && (
            <span className="notif-badge absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unseenConversas > 9 ? "9+" : unseenConversas}
            </span>
          )}
        </Link>

        <div className="absolute left-1/2 top-1/2 w-[90vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 text-center">
          <h1 className="whitespace-nowrap font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">
            Olá, {business!.name}
          </h1>
          <p className="mt-1 text-[14px] text-text-secondary">Seu negócio está indo bem hoje.</p>
        </div>
      </div>
      <Link
        href={`/${business!.slug}`}
        target="_blank"
        className="mx-auto -mt-2 rounded-full border border-divider bg-surface-white px-4 py-1.5 text-[12px] text-text-secondary"
      >
        Ver meu Orbibox ↗
      </Link>

      {/* Métricas em lista — cada uma leva pro Pulse (ou Conversas), onde dá
          pra ver o detalhe. Mesma fonte de dados do Pulse, então os números
          batem entre as duas telas. */}
      <div className="mt-8 flex flex-col">
        {METRICS.map((m) => (
          <Link key={m.key} href={m.href} className="flex items-center justify-between border-b border-divider py-4 active:opacity-60">
            <div className="flex items-center gap-3">
              <span className="text-[16px] text-text-secondary">{m.icon}</span>
              <div>
                <span className="block text-[15px] text-text-secondary">{m.label}</span>
                <span className="block text-[12px] text-text-tertiary">{m.explica}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-manrope)] text-[22px] font-medium">
                {values[m.key].toLocaleString("pt-BR")}
              </span>
              <span className="text-[14px] text-text-tertiary">›</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Insight Orbi */}
      {opportunity && (
        <div className="mt-8 rounded-[28px] border border-divider bg-surface-white p-6">
          <OrbiOrb size={56} />
          <p className="mt-4 font-[family-name:var(--font-manrope)] text-[20px] font-medium">
            Insight Orbi
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            {opportunity.description ?? opportunity.title}
          </p>
          <Link
            href={cta.href}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-button-primary px-6 py-3 text-[14px] font-medium text-white"
          >
            {cta.label} →
          </Link>
        </div>
      )}
    </div>
  );
}
