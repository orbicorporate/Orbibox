import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { getAccessInfoForBusiness } from "@/lib/plans";
import { LIMITE_NIOBIO, LIMITE_TITANIO } from "@/lib/bancoImagens";
import { BancoImagens } from "./BancoImagens";

export const metadata = { title: "Banco de imagens" };

export default async function ImagensPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const access = businessId ? await getAccessInfoForBusiness(businessId) : null;
  const limite = access?.hasAiChat ? LIMITE_NIOBIO : LIMITE_TITANIO;
  return <BancoImagens businessId={businessId!} limite={limite} />;
}
