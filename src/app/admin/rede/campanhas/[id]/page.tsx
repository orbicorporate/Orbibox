import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { getAccessInfoForBusiness } from "@/lib/plans";
import { PaginaCampanhas } from "./PaginaCampanhas";

export const metadata = { title: "Campanhas da rede" };

export default async function CampanhasDaRedePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = user ? await getCurrentBusinessId(user.id) : null;
  if (!businessId) return <p className="mt-10 text-center text-[14px] text-text-secondary">Entre no seu Orbibox para ver as campanhas.</p>;
  const acesso = await getAccessInfoForBusiness(businessId);
  return <PaginaCampanhas paginaId={id} businessId={businessId} temVouchers={!!acesso.hasVouchers} />;
}
