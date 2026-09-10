import { createClient } from "@/lib/supabase/server";

export type ProgressKey = "marca" | "vitrine" | "boxes" | "whatsapp" | "capa" | "orbi";

// Cada passo do checklist: rótulo curto, o que faz, e pra onde leva.
export const PROGRESS_STEPS: { key: ProgressKey; label: string; href: string }[] = [
  { key: "marca", label: "Configurar sua marca", href: "/admin/config" },
  { key: "vitrine", label: "Preencher a Vitrine", href: "/admin/vitrine" },
  { key: "boxes", label: "Adicionar botões (Boxes)", href: "/admin/boxes" },
  { key: "whatsapp", label: "Colocar seu WhatsApp", href: "/admin/config" },
  { key: "capa", label: "Adicionar a capa da Vitrine", href: "/admin/vitrine" },
  { key: "orbi", label: "Ativar a Orbi (IA)", href: "/admin/agent" },
];

export async function getBusinessProgress(businessId: string): Promise<{ done: Record<string, boolean>; pct: number; completed: number; total: number }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("business_progress", { p_business_id: businessId });
  const done = (data ?? {}) as Record<string, boolean>;
  const total = PROGRESS_STEPS.length;
  const completed = PROGRESS_STEPS.filter((s) => done[s.key]).length;
  const pct = Math.round((completed / total) * 100);
  return { done, pct, completed, total };
}
