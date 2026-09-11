import { createClient } from "@/lib/supabase/server";
import { getAccessInfoForBusiness } from "@/lib/plans";
import { getCurrentBusinessId } from "@/lib/business";
import { VouchersManager } from "./VouchersManager";
import { CupomBoxToggle } from "./CupomBoxToggle";
import { VoucherExplainer } from "./VoucherExplainer";
import Link from "next/link";

type BoxConfigShape = { action?: string };

export default async function VouchersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const access = businessId ? await getAccessInfoForBusiness(businessId) : null;
  const canSave = !!access?.hasVouchers;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", businessId!)
    .single();

  // Titânio pode montar o cupom pra ver como é, mas não tem cupons salvos.
  const { data: vouchers } = canSave
    ? await supabase.from("vouchers").select("*").eq("business_id", business!.id).order("created_at", { ascending: false })
    : { data: [] };

  // Quem resgatou cada cupom (nome e WhatsApp, se a pessoa deixou) — pra
  // mostrar dentro do card de cada cupom.
  const voucherIds = (vouchers ?? []).map((v) => v.id);
  const { data: redemptions } = canSave && voucherIds.length > 0
    ? await supabase.from("voucher_redemptions").select("*").in("voucher_id", voucherIds).order("created_at", { ascending: false })
    : { data: [] };
  const redemptionsByVoucher: Record<string, NonNullable<typeof redemptions>[number][]> = {};
  for (const r of redemptions ?? []) {
    (redemptionsByVoucher[r.voucher_id] ??= []).push(r);
  }

  // Já existe um Box de Cupons na página inicial? Sem isso, os cupons criados
  // aqui não aparecem pra ninguém — é o elo que faltava explicar.
  const { data: boxes } = canSave
    ? await supabase.from("smart_boxes").select("id, config").eq("business_id", business!.id)
    : { data: [] };
  const cupomBox = (boxes ?? []).find((b) => (b.config as BoxConfigShape | null)?.action === "cupom");
  const nextPosition = (boxes ?? []).length;

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">Cupons</h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
        Crie cupons com estoque limitado. Cada resgate gera um código único, sem risco de uso duplicado.
      </p>

      {/* Ativa assim que existe pelo menos um cupom — antes disso não tem
          painel de ninguém pra ver ainda. */}
      {canSave && vouchers && vouchers.length > 0 && (
        <Link
          href="/admin/vouchers/painel"
          className="relative mt-4 flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#FF6A4D] to-[#FF2E7E] py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_28px_rgba(255,46,126,0.35)]"
        >
          📊 Ver painel de controle
        </Link>
      )}

      {canSave && (
        <div className="mt-6 flex flex-col gap-4">
          <VoucherExplainer>
          {/* Explicação curta — só o essencial, separado do resto */}
          <div className="rounded-[24px] bg-surface-soft p-5">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-text-secondary">Como funciona</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-text-secondary">
              O cliente toca no cupom na sua página, deixa o nome e o WhatsApp e recebe um código único na hora. Ele
              mostra pra você no atendimento — é só confirmar aqui embaixo.
            </p>
          </div>

          {/* Exemplo visual — o cupom em si ganha destaque de propósito: é o
              que o cliente realmente vê, então precisa parecer uma oferta de
              verdade (vermelho vivo, brilho), não um card de configuração. */}
          <div className="rounded-[24px] border border-divider bg-surface-white p-5">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Assim o cliente vê e resgata</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <div aria-hidden className="absolute inset-0 -z-10 rounded-[22px] bg-[#FF3B6E] opacity-50 blur-2xl" />
                <div className="rounded-[20px] bg-gradient-to-br from-[#FF6A4D] to-[#FF2E7E] p-4 text-white shadow-[0_10px_34px_rgba(255,46,126,0.45)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-90">🎟️ Oferta especial</p>
                  <p className="mt-1.5 font-[family-name:var(--font-manrope)] text-[24px] font-bold leading-none">10% OFF</p>
                  <p className="mt-1.5 text-[12.5px] opacity-90">na primeira compra</p>
                  <span className="mt-3.5 inline-block rounded-full bg-white/25 px-3.5 py-2 text-[12px] font-semibold backdrop-blur-sm">Pegar meu cupom</span>
                </div>
              </div>
              <span className="shrink-0 text-[18px] text-text-tertiary">→</span>
              <div className="min-w-0 flex-1 rounded-[20px] border border-divider bg-surface-soft p-4 text-center">
                <p className="text-[11px] text-text-tertiary">Código do cliente</p>
                <p className="mt-1.5 font-[family-name:var(--font-manrope)] text-[19px] font-bold tracking-[3px]">A1B2C3</p>
                <p className="mt-2 text-[11.5px] leading-snug text-text-secondary">Ele mostra isso pra você confirmar</p>
              </div>
            </div>
          </div>

          {/* Passo a passo — agora com o passo que faltava: colocar o box na Home */}
          <div className="rounded-[24px] border border-divider bg-surface-white p-5">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Passo a passo</p>
            <div className="mt-4 flex flex-col gap-4">
              {[
                { n: "1", t: "Você cria o cupom", d: "Desconto, quantidade disponível e validade — você decide tudo aqui embaixo." },
                { n: "2", t: "Coloca o box \"Cupons\" na página inicial", d: "Sem isso, o cupom existe mas ninguém vê. É o botão logo abaixo." },
                { n: "3", t: "O cliente resgata", d: "Toca no box, deixa nome e WhatsApp, e recebe um código único na hora." },
                { n: "4", t: "Você confirma no atendimento", d: "Ele mostra o código, você digita em \"Resgatar código\" e pronto." },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[13px] font-semibold text-text-secondary">{s.n}</span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium">{s.t}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-text-secondary">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </VoucherExplainer>

          {/* O elo que faltava: colocar (ou confirmar que já tem) o box na Home */}
          <CupomBoxToggle businessId={business!.id} initialHasBox={!!cupomBox} nextPosition={nextPosition} />
        </div>
      )}

      {!canSave && (
        <div className="mt-4 flex flex-col gap-3">
          {/* Card de venda com benefícios visuais */}
          <div className="orbi-gradient rounded-[24px] p-[2px]">
            <div className="rounded-[22px] bg-surface-white p-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-soft px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-text-secondary">
                🎟️ Recurso Nióbio
              </span>
              <p className="mt-3 font-[family-name:var(--font-manrope)] text-[19px] font-semibold leading-tight">
                Transforme visitantes em clientes com cupons inteligentes
              </p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-text-secondary">
                Não é um cupomzinho comum. É um sistema completo de promoção com controle total, que atrai gente nova e
                faz ela vir até você.
              </p>

              <div className="mt-4 flex flex-col gap-3">
                {[
                  { icon: "🧲", t: "Atrai cliente novo", d: "A oferta aparece na página e no chat da Orbi." },
                  { icon: "🔐", t: "Código único por pessoa", d: "Ninguém repete nem usa o cupom de outro." },
                  { icon: "📦", t: "Estoque sob controle", d: "Você define quantos são. Acabou, fecha sozinho." },
                  { icon: "📱", t: "Valida no seu celular", d: "Digita o código do cliente e confirma na hora." },
                  { icon: "📇", t: "Cada resgate vira contato", d: "Monta uma lista de clientes pra vender de novo." },
                ].map((b, bi) => (
                  <div key={b.t} className="flex animate-[fadeInUp_0.5s_ease] items-start gap-3" style={{ animationDelay: `${bi * 90}ms`, animationFillMode: "backwards" }}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-[17px]">{b.icon}</span>
                    <div>
                      <p className="text-[14px] font-semibold">{b.t}</p>
                      <p className="mt-0.5 text-[13.5px] leading-relaxed text-text-secondary">{b.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview: como o cliente vê e resgata o cupom */}
          <div className="rounded-[24px] border border-divider bg-surface-soft p-5">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Como fica pro seu cliente</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <div aria-hidden className="absolute inset-0 -z-10 rounded-[20px] bg-[#FF3B6E] opacity-50 blur-2xl" />
                <div className="rounded-[18px] bg-gradient-to-br from-[#FF6A4D] to-[#FF2E7E] p-4 text-white shadow-[0_10px_34px_rgba(255,46,126,0.45)]">
                  <p className="text-[11px] font-medium uppercase tracking-wide opacity-90">🎟️ Oferta especial</p>
                  <p className="mt-1 font-[family-name:var(--font-manrope)] text-[22px] font-bold leading-none">10% OFF</p>
                  <p className="mt-1.5 text-[12px] opacity-90">na primeira compra</p>
                  <span className="mt-3 inline-block rounded-full bg-white/25 px-3 py-1.5 text-[12px] font-semibold">Pegar meu cupom →</span>
                </div>
              </div>
              <span className="text-[20px] text-text-tertiary">→</span>
              <div className="flex-1 rounded-[18px] border border-divider bg-surface-white p-4 text-center">
                <p className="text-[11px] text-text-tertiary">Seu código</p>
                <p className="mt-1 font-[family-name:var(--font-manrope)] text-[20px] font-bold tracking-wider">A1B2C3</p>
                <p className="mt-1.5 text-[11px] leading-snug text-text-secondary">Mostre no atendimento</p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-text-tertiary">
              O cliente toca no cupom na sua página, deixa o WhatsApp e recebe esse código único. Aí é só levar até você.
            </p>
          </div>

          <div className="rounded-2xl bg-surface-soft p-4 text-center">
            <p className="text-[14px] font-medium">✨ Monte seu primeiro cupom abaixo pra ver como é fácil</p>
            <p className="mt-0.5 text-[13px] text-text-tertiary">Você configura tudo agora. Na hora de salvar e ativar, é só assinar o Nióbio.</p>
          </div>
        </div>
      )}

      <VouchersManager businessId={business!.id} initialVouchers={vouchers ?? []} canSave={canSave} redemptionsByVoucher={redemptionsByVoucher} />
    </div>
  );
}
