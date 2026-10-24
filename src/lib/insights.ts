import { createClient } from "@/lib/supabase/server";
import { pareceGastronomico } from "@/lib/gastronomia";

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
    .select("logo_url, contact_whatsapp, address, story_photos, differentials_cards, differentials, vitrine_categories")
    .eq("id", businessId)
    .single();
  if (!business) return [];

  const [agentRes, itemsPhotoRes, activeBoxesRes, boxesCfgRes] = await Promise.all([
    supabase.from("agent_configs").select("tone_formal_informal, tone_reserved_energetic, tone_concise_detailed, objectives, orbi_colors").eq("business_id", businessId).maybeSingle(),
    supabase.from("content_items").select("title, image_url, image_is_placeholder, description").eq("business_id", businessId).eq("status", "published"),
    supabase.from("smart_boxes").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("is_active", true),
    supabase.from("smart_boxes").select("id, box_type, config, is_active").eq("business_id", businessId),
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

  // Links que já abrem o bloco certo na tela de Botões (e rolam até a parte
  // que falta), pra a pessoa não cair numa página cheia sem saber onde mexer.
  const caixas = (boxesCfgRes.data ?? []) as { id: string; box_type: string; is_active: boolean; config: { action?: string; url?: string; secoes?: { itens?: unknown[] }[]; pdfs?: unknown[]; pdf_url?: string | null } | null }[];
  const sobreId = caixas.find((b) => b.box_type === "content")?.id ?? null;
  const enderecoBoxId = caixas.find((b) => b.box_type === "custom" && b.config?.action === "endereco")?.id ?? null;
  const hrefSobre = (parte: "fotos" | "diferenciais") => (sobreId ? `/admin/boxes?box=${sobreId}&ir=${parte}` : "/admin/boxes");

  const insightsQueue: Insight[] = [];
  if (activeBoxes === 0) {
    insightsQueue.push({
      title: "Ligue pelo menos um botão antes de divulgar",
      description: "Sem botões, quem abre seu link não tem o que tocar.",
      ctaLabel: "Abrir",
      href: "/admin/boxes",
    });
  }
  if (!hasItems) {
    insightsQueue.push({
      title: "Importe seu catálogo",
      description: "Cole o link do seu site e a Orbi cria os cards.",
      ctaLabel: "Importar",
      href: "/admin/vitrine",
    });
  }
  // Cardápio ligado no cadastro (negócio gastronômico) mas ainda vazio: a Orbi lembra de montar.
  const cardapioBox = caixas.find((b) => b.box_type === "custom" && b.config?.action === "cardapio");
  const cardapioVazio = !!cardapioBox
    && !cardapioBox.is_active
    && !(cardapioBox.config?.secoes ?? []).some((s) => (s.itens?.length ?? 0) > 0)
    && !(cardapioBox.config?.pdfs?.length) && !cardapioBox.config?.pdf_url;
  if (cardapioVazio) {
    insightsQueue.push({
      title: "Monte o cardápio",
      description: hasItems
        ? "Envie o PDF ou monte os pratos."
        : "Envie o PDF ou monte os pratos.",
      ctaLabel: "Abrir",
      href: "/admin/cardapio",
    });
  }
  // A Orbi percebe sozinha quando o negócio vende comida ou bebida e sugere o Cardápio.
  // Quem não vende não recebe essa sugestão.
  if (!cardapioBox && pareceGastronomico(business.vitrine_categories as string[] | null, items.map((i) => i.title ?? ""))) {
    insightsQueue.push({
      title: "Parece que você vende comida ou bebida",
      description: "Ative o Cardápio com pratos, preços e PDF.",
      ctaLabel: "Ativar",
      href: "/admin/cardapio",
    });
  }
  if (hasItems && itemsWithoutPhoto > 0) {
    insightsQueue.push({
      title: "Capriche nas fotos do Catálogo",
      description: itemsWithoutPhoto === items.length
        ? "Nenhum item tem foto ainda."
        : `${itemsWithoutPhoto} ${itemsWithoutPhoto === 1 ? "item sem foto" : "itens sem foto"}.`,
      ctaLabel: "Editar",
      href: "/admin/vitrine",
    });
  }
  // Plano sem a Orbi conversando (ex: Titânio): não adianta pedir pra
  // configurar o tom de voz dela, só gera uma pendência que não dá pra resolver.
  const { getAccessInfoForBusiness } = await import("@/lib/plans");
  const acesso = await getAccessInfoForBusiness(businessId);
  if (!toneConfigured && acesso.hasAiChat) {
    insightsQueue.push({
      title: "Configure o tom de voz da Orbi",
      description: "Como a Orbi conversa com seus visitantes.",
      ctaLabel: "Definir",
      href: "/admin/agent",
    });
  }
  if (!orbiColorsConfigured) {
    insightsQueue.push({
      title: "Personalize a cor da sua Orbi",
      description: "Use as cores da sua marca na esfera.",
      ctaLabel: "Escolher",
      href: "/admin/config/marca#cores",
    });
  }
  if (!business.logo_url) {
    insightsQueue.push({
      title: "Adicione seu logotipo",
      description: "Aparece no avatar e no chat.",
      ctaLabel: "Enviar",
      href: "/admin/config/marca#logo",
    });
  }
  if (!business.contact_whatsapp) {
    insightsQueue.push({
      title: "Configure seu WhatsApp",
      description: "Sem ele, ninguém fala direto com você.",
      ctaLabel: "Adicionar",
      href: "/admin/config/marca#contatos",
    });
  }
  // O endereço pode estar em dois lugares: no cadastro do negócio ou no box
  // "Como chegar" (config.url). Qualquer um dos dois já conta como preenchido.
  const enderecoNoBox = caixas.some((b) => b.config?.action === "endereco" && !!b.config.url?.trim());
  if (!business.address?.trim() && !enderecoNoBox) {
    insightsQueue.push({
      title: "Adicione seu endereço",
      description: "Vira um botão com Waze e Google Maps.",
      ctaLabel: "Adicionar",
      href: enderecoBoxId ? `/admin/boxes?box=${enderecoBoxId}` : "/admin/boxes",
    });
  }
  if (storyPhotos.length === 0) {
    insightsQueue.push({
      title: "Complete a página sobre o seu negócio",
      description: "Fotos do espaço e da equipe passam confiança.",
      ctaLabel: "Adicionar",
      href: hrefSobre("fotos"),
    });
  }
  if (!hasDifferentials) {
    insightsQueue.push({
      title: "Mostre seus diferenciais",
      description: "Frete grátis, garantia, atendimento rápido.",
      ctaLabel: "Adicionar",
      href: hrefSobre("diferenciais"),
    });
  }
  if (hasItems && itemsWithoutDescription > 0) {
    insightsQueue.push({
      title: "Capriche nas descrições do Catálogo",
      description: itemsWithoutDescription === items.length
        ? "Nenhum item tem descrição ainda."
        : `${itemsWithoutDescription} ${itemsWithoutDescription === 1 ? "item sem descrição" : "itens sem descrição"}.`,
      ctaLabel: "Editar",
      href: "/admin/vitrine",
    });
  }
  // Quando não falta mais nada de configuração, a fila não fica vazia: a
  // Orbi passa a orientar pro Pulse, pra divulgação virar hábito em vez de
  // ficar esquecida assim que a página fica pronta. Só entra depois de tudo
  // o resto porque configuração básica sempre vem primeiro.
  if (insightsQueue.length === 0 && activeBoxes > 0 && hasItems) {
    insightsQueue.push({
      title: "Hora de divulgar mais",
      description: "A Orbi sugere temas e escreve o texto do post.",
      ctaLabel: "Abrir",
      href: "/admin/pulse",
    });
  }
  return insightsQueue;
}
