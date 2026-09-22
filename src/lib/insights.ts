import { createClient } from "@/lib/supabase/server";

export type Insight = { title: string; description: string; ctaLabel: string; href: string };

/**
 * Fila de pendências do negócio, em ordem de prioridade: o que ainda falta
 * preencher pra o Orbibox funcionar bem. Usada em três lugares que
 * precisam bater com a mesma lista (Home, sino de notificações e a
 * página "/admin/pendencias"), por isso vive centralizada aqui em vez de
 * calculada solta em cada página.
 */
export async function getPendingInsights(businessId: string): Promise<Insight[]> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("logo_url, contact_whatsapp, address, story_photos, differentials_cards, differentials")
    .eq("id", businessId)
    .single();
  if (!business) return [];

  const [agentRes, itemsPhotoRes, activeBoxesRes] = await Promise.all([
    supabase.from("agent_configs").select("tone_formal_informal, tone_reserved_energetic, tone_concise_detailed, objectives, orbi_colors").eq("business_id", businessId).maybeSingle(),
    supabase.from("content_items").select("image_url, image_is_placeholder, description").eq("business_id", businessId).eq("status", "published"),
    supabase.from("smart_boxes").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("is_active", true),
  ]);

  const agentConfig = agentRes.data;
  const items = itemsPhotoRes.data ?? [];
  const hasItems = items.length > 0;
  const itemsWithoutPhoto = items.filter((it) => !it.image_url || it.image_is_placeholder).length;
  const itemsWithoutDescription = items.filter((it) => !it.description || it.description.trim().length < 10).length;
  const toneConfigured = !!agentConfig && (
    agentConfig.tone_formal_informal !== 50 ||
    agentConfig.tone_reserved_energetic !== 50 ||
    agentConfig.tone_concise_detailed !== 50 ||
    (agentConfig.objectives?.length ?? 0) > 0
  );
  const orbiColorsConfigured = Array.isArray(agentConfig?.orbi_colors) && agentConfig.orbi_colors.length >= 2;
  const activeBoxes = activeBoxesRes.count ?? 0;
  const rawDiff = business.differentials_cards;
  const hasDifferentials = (Array.isArray(rawDiff) && rawDiff.length > 0) || !!business.differentials?.trim();
  const storyPhotos = (business.story_photos as string[] | null) ?? [];

  const insightsQueue: Insight[] = [];
  if (activeBoxes === 0) {
    insightsQueue.push({
      title: "Ative pelo menos uma Box antes de divulgar",
      description: "Sem nenhuma Box ativa, quem abre seu link não vê nenhuma opção, a página fica vazia. Ative ou crie uma Box pra poder compartilhar.",
      ctaLabel: "Configurar Boxes",
      href: "/admin/boxes",
    });
  }
  if (!hasItems) {
    insightsQueue.push({
      title: "Importe seu catálogo",
      description: "Cole o link do seu site na Vitrine, a Orbi transforma seus produtos em boxes automaticamente.",
      ctaLabel: "Abrir Vitrine",
      href: "/admin/vitrine",
    });
  }
  if (hasItems && itemsWithoutPhoto > 0) {
    insightsQueue.push({
      title: "Capriche nas fotos da Vitrine",
      description: itemsWithoutPhoto === items.length
        ? "Nenhum item tem foto ainda, fotos bonitas fazem toda diferença na primeira impressão."
        : `${itemsWithoutPhoto} ${itemsWithoutPhoto === 1 ? "item ainda não tem" : "itens ainda não têm"} foto de verdade, capriche pra ficar mais convidativo.`,
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
      description: "Escolha as cores da esfera de acordo com a paleta da sua marca, deixa tudo mais consistente com sua identidade.",
      ctaLabel: "Configurar cores",
      href: "/admin/agent#cores-orbi",
    });
  }
  if (!business.logo_url) {
    insightsQueue.push({
      title: "Adicione seu logotipo",
      description: "Deixa a página com a cara da sua marca, aparece no avatar, no chat e em vários lugares.",
      ctaLabel: "Enviar logotipo",
      href: "/admin/config",
    });
  }
  if (!business.contact_whatsapp) {
    insightsQueue.push({
      title: "Configure seu WhatsApp",
      description: "Sem WhatsApp cadastrado, os visitantes não conseguem falar direto com você.",
      ctaLabel: "Adicionar WhatsApp",
      href: "/admin/config",
    });
  }
  if (!business.address) {
    insightsQueue.push({
      title: "Adicione seu endereço",
      description: "Ganha um box pronto na tela inicial, com botões pro Waze e Google Maps.",
      ctaLabel: "Adicionar endereço",
      href: "/admin/boxes",
    });
  }
  if (storyPhotos.length === 0) {
    insightsQueue.push({
      title: "Complete a página sobre o seu negócio",
      description: "Adicione fotos do espaço, da equipe ou dos bastidores no carrossel, ajuda o visitante a confiar mais antes de comprar.",
      ctaLabel: "Adicionar fotos",
      href: "/admin/boxes",
    });
  }
  if (!hasDifferentials) {
    insightsQueue.push({
      title: "Mostre seus diferenciais",
      description: "O que faz seu negócio especial? Frete grátis, garantia, atendimento rápido, pequenos detalhes que pesam na decisão de compra.",
      ctaLabel: "Adicionar diferenciais",
      href: "/admin/boxes",
    });
  }
  if (hasItems && itemsWithoutDescription > 0) {
    insightsQueue.push({
      title: "Capriche nas descrições da Vitrine",
      description: itemsWithoutDescription === items.length
        ? "Nenhum item tem descrição ainda, um texto curto e bom ajuda o visitante a entender o que está comprando."
        : `${itemsWithoutDescription} ${itemsWithoutDescription === 1 ? "item ainda não tem" : "itens ainda não têm"} descrição, um texto curto já faz diferença.`,
      ctaLabel: "Editar Vitrine",
      href: "/admin/vitrine",
    });
  }
  return insightsQueue;
}
