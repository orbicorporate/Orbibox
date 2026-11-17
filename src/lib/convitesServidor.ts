import { createHash } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOwnerHasVouchers } from "@/lib/plans";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** IP de quem chama, só como identificador embaralhado (nada de IP puro no banco). */
export function ipHash(req: NextRequest): string {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "sem-ip";
  return createHash("sha256").update(`${ip}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "orbibox"}`).digest("hex").slice(0, 24);
}

/** Muitas tentativas erradas do mesmo lugar nos últimos 15 minutos. */
export async function passouDoLimiteIp(ip: string): Promise<boolean> {
  const service = createServiceClient();
  const { data } = await service.rpc("convite_falhas_ip", { p_ip: ip, p_minutos: 15 });
  return (data ?? 0) >= 20;
}

function anonSemSessao() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Manda o código de confirmação para o WhatsApp do convite. O número nunca sai do servidor. */
export async function enviarOtpWhatsapp(whatsapp: string): Promise<boolean> {
  const { error } = await anonSemSessao().auth.signInWithOtp({ phone: `+${whatsapp}`, options: { channel: "whatsapp" } });
  return !error;
}

export async function conferirOtpWhatsapp(whatsapp: string, codigo: string): Promise<boolean> {
  const { data, error } = await anonSemSessao().auth.verifyOtp({ phone: `+${whatsapp}`, token: codigo.trim(), type: "sms" });
  if (error || !data.user) return false;
  // A conta de telefone criada só serve para provar o número: sai da sessão e não guarda nada.
  return true;
}

export type VoucherPublico = {
  id: string; title: string; description: string | null; discount_type: string; discount_value: number; color: string;
  image_url: string | null; badge: string | null; show_discount: boolean; expires_hours: number | null;
  dias_semana: number[] | null; hora_inicio: string | null; hora_fim: string | null; verificacao: string; business_id: string;
};

/** Voucher privado ativo, de um negócio com plano que permite vouchers. Sem isso, o convite não abre. */
export async function carregarVoucherPrivado(voucherId: string) {
  const service = createServiceClient();
  const { data: v } = await service
    .from("vouchers")
    .select("id, title, description, discount_type, discount_value, color, image_url, badge, show_discount, expires_hours, dias_semana, hora_inicio, hora_fim, verificacao, business_id, privado, is_active")
    .eq("id", voucherId)
    .maybeSingle();
  if (!v || !v.privado || !v.is_active) return null;
  const { data: negocio } = await service.from("businesses").select("id, name, slug, logo_url, owner_id").eq("id", v.business_id).maybeSingle();
  if (!negocio || !(await getOwnerHasVouchers(negocio.owner_id))) return null;
  return { voucher: v as unknown as VoucherPublico, negocio };
}
