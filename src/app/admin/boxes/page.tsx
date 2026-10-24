import { PreviewAoVivo } from "@/components/mobile/PreviewAoVivo";
import { createClient } from "@/lib/supabase/server";
import { getAccessInfoForBusiness } from "@/lib/plans";
import { getCurrentBusinessId } from "@/lib/business";
import { BoxesManager } from "./BoxesManager";
import { HomeModePicker } from "./HomeModePicker";
import { parseLogoGallery } from "@/lib/logoGallery";
import { PassosGuiados, type Passo } from "@/components/ui/PassosGuiados";

export default async function BoxesPage({ searchParams }: { searchParams: Promise<{ novo?: string }> }) {
  const { novo } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const [{ data: business }, access] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, slug, story_photos, story_photo_format, about_business, differentials, differentials_cards, hero_question, hero_avatar, home_mode, contact_whatsapp, logo_url, logo_gallery, brand_colors, address")
      .eq("id", businessId!)
      .single(),
    businessId ? getAccessInfoForBusiness(businessId) : Promise.resolve(null),
  ]);
  const { data: boxes } = await supabase.from("smart_boxes").select("*").eq("business_id", business!.id).order("position", { ascending: true });
  const { data: agentConfig } = await supabase.from("agent_configs").select("orbi_colors").eq("business_id", business!.id).maybeSingle();
  const { data: giftCfg } = await supabase.from("gift_settings").select("enabled").eq("business_id", business!.id).maybeSingle();
  const orbiColors = Array.isArray(agentConfig?.orbi_colors) && agentConfig.orbi_colors.length >= 2
    ? (agentConfig.orbi_colors as string[])
    : null;

  const raw = business!.brand_colors;
  const brandColors = Array.isArray(raw)
    ? raw.filter((c): c is { hex: string; role?: string } => !!c && typeof c === "object" && typeof (c as { hex?: unknown }).hex === "string")
    : [];

  const rawCards = business!.differentials_cards;
  const differentialsCards = Array.isArray(rawCards)
    ? rawCards.filter((c): c is { icon?: string; title: string; description?: string } => !!c && typeof c === "object" && typeof (c as { title?: unknown }).title === "string")
    : [];

  const acaoDe = (b: { config: unknown }) => (b.config as { action?: string } | null)?.action;
  const ativos = (boxes ?? []).filter((b) => b.is_active);
  const temWa = ativos.some((b) => acaoDe(b) === "whatsapp");
  const temEnd = ativos.some((b) => acaoDe(b) === "endereco");
  const passos: Passo[] = [
    { t: "Criar os botões da página", d: "A Orbi cria os botões básicos da sua página inicial. Você muda tudo depois.", feito: ativos.length >= 3, acao: { rotulo: "Criar botões prontos", api: "botoes" } },
    { t: "Botão de contato", d: business!.contact_whatsapp ? "Seu WhatsApp já está salvo. Crie o botão para o cliente falar com você." : "Coloque seu WhatsApp para o cliente falar com você.", feito: temWa, acao: business!.contact_whatsapp ? { rotulo: "Criar botão de contato", href: "/admin/boxes?novo=1" } : { rotulo: "Colocar WhatsApp", href: "/admin/config/marca#contatos" } },
    { t: "Endereço com mapa", d: business!.address?.trim() ? "Seu endereço já está salvo. Crie a bolinha de como chegar." : "Se atende no local, coloque o endereço para aparecer o mapa.", feito: temEnd, acao: business!.address?.trim() ? { rotulo: "Criar como chegar", href: "/admin/boxes?novo=1" } : { rotulo: "Colocar endereço", href: "/admin/config/marca#contatos" } },
  ];

  return (
    <div className="flex flex-col">
      <h1 data-tour="boxes" className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">
        Botões
      </h1>
      <p className="mt-1 text-[14px] text-text-secondary">Ligue os que fazem sentido e escolha a ordem.</p>
      <PassosGuiados titulo="Monte sua página inicial" passos={passos} />
      <HomeModePicker businessId={business!.id} inicial={business!.home_mode ?? null} />
      <BoxesManager
        abrirNovo={novo === "1"}
        businessId={business!.id}
        businessName={business!.name}
        initialBoxes={boxes ?? []}
        slug={business!.slug}
        initialStoryPhotos={business!.story_photos ?? []}
        initialAboutBusiness={business!.about_business ?? ""}
        initialDifferentialsCards={differentialsCards}
        initialHeroQuestion={business!.hero_question}
        initialLogoUrl={business!.logo_url}
        initialLogoGallery={parseLogoGallery(business!.logo_gallery)}
        initialHeroAvatar={business!.hero_avatar}
        initialAddress={business!.address}
        brandColors={brandColors}
        orbiColors={orbiColors}
        hasVouchers={access?.hasVouchers ?? false}
        giftEnabled={!!giftCfg?.enabled}
        hasAiChat={access?.hasAiChat ?? false}
        gratis={access?.isFree ?? false}
      />
      <PreviewAoVivo slug={business!.slug} />
    </div>
  );
}
