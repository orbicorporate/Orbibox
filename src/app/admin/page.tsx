import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { ShareOrbiboxButton } from "@/components/mobile/ShareOrbiboxButton";
import { QRCodeButton } from "@/components/ui/QRCodeButton";

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
  const [agentRes, visitsRes, convRowsRes, interestedRes, actionsRes, itemsPhotoRes, activeBoxesRes] = await Promise.all([
    supabase.from("agent_configs").select("tone_formal_informal, tone_reserved_energetic, tone_concise_detailed, objectives, orbi_colors").eq("business_id", business!.id).maybeSingle(),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("conversations").select("id").eq("business_id", business!.id),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", business!.id).not("intent", "is", null),
    // "Ações" = cliques de verdade (produto, link, WhatsApp…) — mesma fonte do Pulse,
    // não a tabela de campanhas (isso não tinha nada a ver com o que o visitante faz).
    supabase.from("click_events").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("content_items").select("image_url, image_is_placeholder, description").eq("business_id", business!.id),
    supabase.from("smart_boxes").select("id", { count: "exact", head: true }).eq("business_id", business!.id).eq("is_active", true),
  ]);
  const visits = visitsRes.count, interested = interestedRes.count, actions = actionsRes.count;
  const activeBoxes = activeBoxesRes.count ?? 0;

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
  const itemsWithoutDescription = items.filter((it) => !it.description || it.description.trim().length < 10).length;
  const toneConfigured = !!agentConfig && (
    agentConfig.tone_formal_informal !== 50 ||
    agentConfig.tone_reserved_energetic !== 50 ||
    agentConfig.tone_concise_detailed !== 50 ||
    (agentConfig.objectives?.length ?? 0) > 0
  );
  const orbiColorsConfigured = Array.isArray(agentConfig?.orbi_colors) && agentConfig.orbi_colors.length >= 2;
  const rawDiff = business!.differentials_cards;
  const hasDifferentials = (Array.isArray(rawDiff) && rawDiff.length > 0) || !!business!.differentials?.trim();
  const insightsQueue: { title: string; description: string; ctaLabel: string; href: string; share?: boolean }[] = [];
  if (activeBoxes === 0) {
    insightsQueue.push({
      title: "Ative pelo menos uma Box antes de divulgar",
      description: "Sem nenhuma Box ativa, quem abre seu link não vê nenhuma opção — a página fica vazia. Ative ou crie uma Box pra poder compartilhar.",
      ctaLabel: "Configurar Boxes",
      href: "/admin/boxes",
    });
  }
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
  if (!orbiColorsConfigured) {
    insightsQueue.push({
      title: "Personalize a cor da sua Orbi",
      description: "Escolha as cores da esfera de acordo com a paleta da sua marca — deixa tudo mais consistente com sua identidade.",
      ctaLabel: "Configurar cores",
      href: "/admin/config#cores-orbi",
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
  if (!hasDifferentials) {
    insightsQueue.push({
      title: "Mostre seus diferenciais",
      description: "O que faz seu negócio especial? Frete grátis, garantia, atendimento rápido — pequenos detalhes que pesam na decisão de compra.",
      ctaLabel: "Adicionar diferenciais",
      href: "/admin/boxes",
    });
  }
  if (hasItems && itemsWithoutDescription > 0) {
    insightsQueue.push({
      title: "Capriche nas descrições da Vitrine",
      description: itemsWithoutDescription === items.length
        ? "Nenhum item tem descrição ainda — um texto curto e bom ajuda o visitante a entender o que está comprando."
        : `${itemsWithoutDescription} ${itemsWithoutDescription === 1 ? "item ainda não tem" : "itens ainda não têm"} descrição — um texto curto já faz diferença.`,
      ctaLabel: "Editar Vitrine",
      href: "/admin/vitrine",
    });
  }
  // Sem nenhum pendente: alterna entre dicas de divulgação — pra nunca ficar
  // sem sugestão, e pra não repetir sempre a mesma quando já está tudo pronto.
  // URL pública de verdade — NUNCA usa o host da requisição sozinho, porque
  // se a pessoa está acessando o painel por uma URL específica de deploy
  // (não o domínio principal), essa URL fica protegida pelo Vercel e mostra
  // "Protected Deployment" pra quem recebe o link. VERCEL_PROJECT_PRODUCTION_URL
  // é o domínio estável de produção — sempre o certo pra compartilhar.
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || (await headers()).get("host") || "orbibox-orbi-app.vercel.app";
  const proto = host.includes("localhost") ? "http" : "https";
  const shareUrl = `${proto}://${host}/${business!.slug}`;
  const growthTips: { title: string; description: string; ctaLabel: string; href: string; share?: boolean }[] = [
    {
      title: "Compartilhe seu Orbibox",
      description: "Já está tudo pronto — hora de divulgar. Cole o link nos stories, na bio do Instagram, ou manda no WhatsApp.",
      ctaLabel: "Compartilhar Orbibox",
      href: `/${business!.slug}`,
      share: true,
    },
    {
      title: "Poste num grupo do WhatsApp",
      description: "Grupos de bairro, de clientes ou de parceiros são ótimos pra divulgar — manda o link com uma chamada rápida tipo \"acabei de lançar meu catálogo online\".",
      ctaLabel: "Compartilhar Orbibox",
      href: `/${business!.slug}`,
      share: true,
    },
    {
      title: "Troque o link da bio do Instagram",
      description: "É o lugar mais visto do seu perfil — coloca o link do seu Orbibox lá em vez de um link genérico.",
      ctaLabel: "Compartilhar Orbibox",
      href: `/${business!.slug}`,
      share: true,
    },
    {
      title: "Confira como está indo",
      description: "Dá uma olhada nas visitas e conversas mais recentes — o Pulse mostra tudo o que aconteceu na sua página.",
      ctaLabel: "Abrir Pulse",
      href: "/admin/pulse",
    },
  ];
  const insight = insightsQueue[0] ?? growthTips[new Date().getDate() % growthTips.length];

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
      <div className="mx-auto -mt-2 flex items-center gap-2">
        <ShareOrbiboxButton
          url={shareUrl}
          title={`${business!.name} — Orbibox`}
          className="flex items-center gap-1.5 rounded-full bg-on-background px-4 py-2 text-[13px] font-medium text-white"
        >
          ↗ Compartilhar Orbibox
        </ShareOrbiboxButton>
        <Link
          href={`/${business!.slug}`}
          target="_blank"
          className="rounded-full border border-divider bg-surface-white px-3 py-2 text-[12px] text-text-secondary"
        >
          Ver
        </Link>
        <QRCodeButton
          url={shareUrl}
          businessName={business!.name}
          className="rounded-full border border-divider bg-surface-white px-3 py-2 text-[12px] text-text-secondary"
        >
          QR Code
        </QRCodeButton>
      </div>

      {activeBoxes === 0 && (
        <p className="mx-auto mt-3 max-w-[280px] text-center text-[12px] leading-relaxed text-red-600">
          ⚠ Ainda não dá pra divulgar — sua página está sem nenhuma Box ativa, então quem abrir o link não vê nada.{" "}
          <Link href="/admin/boxes" className="underline">Resolver agora</Link>
        </p>
      )}

      {!business!.tour_completed_at && (
        <Link
          href="/admin/agent?tour=0"
          className="mt-6 flex items-center justify-between rounded-2xl border border-divider bg-surface-white px-4 py-3.5"
        >
          <span className="text-[14px] font-medium">✦ Conheça o Orbibox num tour rápido</span>
          <span className="text-text-tertiary">→</span>
        </Link>
      )}

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
      <div data-tour="insights" className="mt-8 rounded-[28px] border border-divider bg-surface-white p-6">
        <OrbiOrb size={56} />
        <p className="mt-4 font-[family-name:var(--font-manrope)] text-[20px] font-medium">
          Insight Orbi
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
          {insight.description}
        </p>
        {insight.share ? (
          <ShareOrbiboxButton
            url={shareUrl}
            title={`${business!.name} — Orbibox`}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-button-primary px-6 py-3 text-[14px] font-medium text-white"
          >
            {insight.ctaLabel} →
          </ShareOrbiboxButton>
        ) : (
          <Link
            href={insight.href}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-button-primary px-6 py-3 text-[14px] font-medium text-white"
          >
            {insight.ctaLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}
