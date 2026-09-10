import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOwnerHasAiChat, getOwnerHasVouchers } from "@/lib/plans";
import { filterLive } from "@/lib/scheduling";
import { VisitorExperience } from "./VisitorExperience";

/**
 * Preview do link (Open Graph) — o que aparece quando alguém cola o link do
 * Orbibox no WhatsApp, Instagram, etc. WhatsApp só mostra imagem estática
 * (nada de animação), então usamos, nesta ordem: a capa da Vitrine, depois o
 * logotipo do negócio. A esfera animada da Orbi fica só dentro do app.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("businesses")
    .select("name, about_business, logo_url, vitrine_cover_url, vitrine_cover_urls, share_image_url, share_description")
    .eq("slug", slug)
    .maybeSingle();

  if (!b) return { title: "Orbibox" };

  const capa = b.share_image_url || b.vitrine_cover_url || (Array.isArray(b.vitrine_cover_urls) && b.vitrine_cover_urls[0]) || b.logo_url || `/${slug}/opengraph-image`;
  // Curto de propósito — WhatsApp e afins cortam a descrição em poucas linhas
  // (~3), então um texto longo só fica truncado no meio de uma palavra.
  const fonteDescricao = b.share_description?.trim() || b.about_business?.trim() || `Conheça ${b.name} — produtos, serviços e contato num só link.`;
  const descricao = fonteDescricao.length > 90
    ? `${fonteDescricao.slice(0, 90).replace(/\s+\S*$/, "")}…`
    : fonteDescricao;
  // Título do preview do link — o convite vem antes do nome, não só o nome cru.
  const tituloPreview = `Visite nosso Orbibox - ${b.name}`;

  return {
    title: b.name,
    description: descricao,
    openGraph: {
      title: tituloPreview,
      description: descricao,
      type: "website",
      images: [{ url: capa }],
    },
    twitter: {
      card: "summary_large_image",
      title: tituloPreview,
      description: descricao,
      images: [capa],
    },
  };
}

export default async function VisitorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) notFound();

  // O dono pode estar logado navegando o próprio link — se for, mostramos
  // um atalho de volta pro painel em vez de forçar sair e digitar /admin.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === business.owner_id;

  // As quatro dependem só do business — vão juntas em vez de em fila.
  const [contentRes, boxesRes, agentRes, hasAiChat, hasVouchers] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, title, description, price, price_type, price_max, image_url, brand_label, type, position, layout_size, box_color, footer_color, box_style, title_placement, target_url, link_kind, starts_at, ends_at")
      .eq("business_id", business.id)
      .eq("status", "published")
      .order("position", { ascending: true }),
    supabase
      .from("smart_boxes")
      .select("id, box_type, title, is_active, position, config, starts_at, ends_at")
      .eq("business_id", business.id)
      .order("position", { ascending: true }),
    supabase.from("agent_configs").select("agent_name, orbi_colors, suggested_questions").eq("business_id", business.id).maybeSingle(),
    getOwnerHasAiChat(business.owner_id),
    getOwnerHasVouchers(business.owner_id),
  ]);
  // Fora da janela de data agendada = como se não existisse pro visitante,
  // mesmo estando "publicado"/"ativo" — assim não precisa lembrar de
  // desligar manualmente uma promoção que já venceu.
  const content = filterLive(contentRes.data ?? []);
  const boxes = filterLive(boxesRes.data ?? []);
  const agentConfig = agentRes.data;
  const orbiColors = Array.isArray(agentConfig?.orbi_colors) && agentConfig.orbi_colors.length >= 2
    ? (agentConfig.orbi_colors as string[])
    : null;

  return (
    <VisitorExperience
      business={business}
      content={content}
      boxes={boxes}
      agentName={agentConfig?.agent_name ?? "Orbi"}
      suggestedQuestions={Array.isArray(agentConfig?.suggested_questions) ? (agentConfig.suggested_questions as string[]) : []}
      orbiColors={orbiColors}
      isOwner={isOwner}
      hasAiChat={hasAiChat}
      hasVouchers={hasVouchers}
    />
  );
}
