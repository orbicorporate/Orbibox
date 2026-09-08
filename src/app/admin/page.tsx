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
  const [agentRes, visitsRes, convRowsRes, interestedRes, actionsRes, itemsPhotoRes] = await Promise.all([
    supabase.from("agent_configs").select("tone_formal_informal, tone_reserved_energetic, tone_concise_detailed, objectives").eq("business_id", business!.id).maybeSingle(),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("conversations").select("id").eq("business_id", business!.id),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", business!.id).not("intent", "is", null),
    // "Ações" = cliques de verdade (produto, link, WhatsApp…) — mesma fonte do Pulse,
    // não a tabela de campanhas (isso não tinha nada a ver com o que o visitante faz).
    supabase.from("click_events").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("content_items").select("image_url, image_is_placeholder").eq("business_id", business!.id),
  ]);
  const visits = visitsRes.count, interested = interestedRes.count, actions = actionsRes.count;

  // Insight sempre atual — em vez de uma tabela fixa que nunca se atualizava
  // sozinha, verifica o estado de verdade do negócio a cada carregamento e
  // sugere o próximo passo que ainda falta, em ordem de prioridade. Assim
  // que a pessoa resolve um, o próximo já aparece — nunca fica preso num
  // insight antigo, e nunca sobra sem sugestão nenhuma.
  const agentConfig = agentRes.data;
  const items = itemsPhotoRes.data ?? [];
  const hasItems = items.length > 0;
  // Fotos que faltam ou que são placeholder (não a foto de verdade do produto).
  const itemsWithoutPhoto = items.filter((it) => !it.image_url || it.image_is_placeholder).length;
  const toneConfigured = !!agentConfig && (
    agentConfig.tone_formal_informal !== 50 ||
    agentConfig.tone_reserved_energetic !== 50 ||
    agentConfig.tone_concise_detailed !== 50 ||
    (agentConfig.objectives?.length ?? 0) > 0
  );
  const insightsQueue: { title: string; description: string; ctaLabel: string; href: string }[] = [];
  if (!hasItems) {
    insightsQueue.push({
      title: "Importe seu catálogo",
      description: "Cole o link do seu site na Vitrine — a Orbi transforma seus produtos em boxes automaticamente.",
      ctaLabel: "Abrir Vitrine",
      href: "/admin/vitrine",
    });
  }
  if (hasItems && itemsWithoutPhoto > 0) {
    insightsQueue.push({
      title: "Capriche nas fotos da Vitrine",
      description: itemsWithoutPhoto === items.length
        ? "Nenhum item tem foto ainda — fotos bonitas fazem toda diferença na primeira impressão."
        : `${itemsWithoutPhoto} ${itemsWithoutPhoto === 1 ? "item ainda não tem" : "itens ainda não têm"} foto de verdade — capriche pra ficar mais convidativo.`,
      ctaLabel: "Editar Vitrine",
      href: "/admin/vitrine",
    });
  }
  if (!toneConfigured) {
    insightsQueue.push({
      title: "Configure o tom de voz da Orbi",
      description: "Defina como a assistente deve conversar com seus visitantes.",
      ctaLabel: "Configurar Orbi",
      href: "/admin/agent",
    });
  }
  if (!business!.logo_url) {
    insightsQueue.push({
      title: "Adicione seu logotipo",
      description: "Deixa a página com a cara da sua marca — aparece no avatar, no chat e em vários lugares.",
      ctaLabel: "Enviar logotipo",
      href: "/admin/config",
    });
  }
  if (!business!.contact_whatsapp) {
    insightsQueue.push({
      title: "Configure seu WhatsApp",
      description: "Sem WhatsApp cadastrado, os visitantes não conseguem falar direto com você.",
      ctaLabel: "Adicionar WhatsApp",
      href: "/admin/config",
    });
  }
  if (!business!.address) {
    insightsQueue.push({
      title: "Adicione seu endereço",
      description: "Ganha um box pronto na tela inicial, com botões pro Waze e Google Maps.",
      ctaLabel: "Adicionar endereço",
      href: "/admin/boxes",
    });
  }
  const storyPhotos = (business!.story_photos as string[] | null) ?? [];
  if (storyPhotos.length === 0) {
    insightsQueue.push({
      title: "Complete a página sobre o seu negócio",
      description: "Adicione fotos do espaço, da equipe ou dos bastidores no carrossel — ajuda o visitante a confiar mais antes de comprar.",
      ctaLabel: "Adicionar fotos",
      href: "/admin/boxes",
    });
  }
  // Sem nenhum pendente: sempre sobra uma sugestão de divulgação, pra nunca
  // ficar sem nada pra fazer.
  const insight = insightsQueue[0] ?? {
    title: "Compartilhe seu Orbibox",
    description: "Já está tudo pronto — hora de divulgar. Cole o link nos stories, na bio do Instagram, ou manda no WhatsApp.",
    ctaLabel: "Ver meu Orbibox",
    href: `/${business!.slug}`,
  };

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

  return (
    <div className="relative flex flex-col">
      {/* Saudação dentro de um halo circular — nome do negócio, não do usuário
          que abriu o painel, já que mais gente da equipe também vai entrar. */}
      <div className="relative mx-auto mt-6 flex h-64 w-64 items-center justify-center">
        <div className="orbi-halo absolute inset-0" aria-hidden>
          <span className="orbi-halo__dot" />
        </div>

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

      {/* Insight Orbi — sempre tem um, prioriza o que ainda falta fazer */}
      <div className="mt-8 rounded-[28px] border border-divider bg-surface-white p-6">
        <OrbiOrb size={56} />
        <p className="mt-4 font-[family-name:var(--font-manrope)] text-[20px] font-medium">
          Insight Orbi
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
          {insight.description}
        </p>
        <Link
          href={insight.href}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-button-primary px-6 py-3 text-[14px] font-medium text-white"
        >
          {insight.ctaLabel} →
        </Link>
      </div>
    </div>
  );
}
