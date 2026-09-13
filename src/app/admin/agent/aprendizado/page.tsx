import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { redirect } from "next/navigation";
import { AprendizadoList } from "./AprendizadoList";

export default async function AprendizadoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  if (!businessId) redirect("/admin/agent");

  const { data: gaps } = await supabase
    .from("orbi_learnings")
    .select("*")
    .eq("business_id", businessId)
    .order("status", { ascending: true })
    .order("vezes", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col pb-4">
      <Link href="/admin/agent" className="mt-2 text-[14px] text-text-tertiary hover:underline">← Personalidade da Marca</Link>
      <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">O que a Orbi aprendeu</h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
        Conforme os visitantes conversam, a Orbi anota o que não soube responder bem. Ensine ela e cada resposta fica melhor.
      </p>
      <AprendizadoList initialGaps={gaps ?? []} />
    </div>
  );
}
