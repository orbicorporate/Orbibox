import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { getAccessInfoForBusiness, LIMITES_GRATIS } from "@/lib/plans";
import { lerPlanoGratis } from "@/lib/planoGratis";
import { LIMITE_NIOBIO, LIMITE_TITANIO } from "@/lib/bancoImagens";
import { BancoImagens } from "./BancoImagens";

export const metadata = { title: "Banco de imagens" };

export default async function ImagensPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const access = businessId ? await getAccessInfoForBusiness(businessId) : null;
  const limitePlano = access?.isFree ? LIMITES_GRATIS.fotos : access?.hasAiChat ? LIMITE_NIOBIO : LIMITE_TITANIO;
  // Limite combinado à mão para um negócio (businesses.limite_fotos): só vale quando é maior que o do plano e fora do grátis.
  const { data: extra } = access?.isFree ? { data: null } : await supabase.from("businesses").select("limite_fotos" as never).eq("id", businessId!).maybeSingle();
  const limiteExtra = Number((extra as { limite_fotos?: number | null } | null)?.limite_fotos ?? 0);
  const limite = limiteExtra > limitePlano ? limiteExtra : limitePlano;
  // No plano grátis, as fotos fora das 7 escolhidas ficam guardadas, só não aparecem aqui.
  const { data: neg } = access?.isFree ? await supabase.from("businesses").select("plano_gratis" as never).eq("id", businessId!).maybeSingle() : { data: null };
  const ocultas = access?.isFree ? lerPlanoGratis((neg as { plano_gratis?: unknown } | null)?.plano_gratis)?.desativados?.fotos ?? [] : [];
  return <BancoImagens businessId={businessId!} limite={limite} ocultas={ocultas} />;
}
