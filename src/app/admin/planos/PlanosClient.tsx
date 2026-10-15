"use client";

import { useState, type CSSProperties } from "react";
import type { AccessInfo } from "@/lib/plans";
import type { Database } from "@/lib/supabase/types";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

type Plan = Database["public"]["Tables"]["plans"]["Row"];
type Cycle = "monthly" | "yearly";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

const STATUS_LABEL: Record<string, string> = {
  trialing: "Em teste grátis",
  active: "Ativo",
  comped: "Cortesia",
  past_due: "Pagamento pendente",
  canceled: "Cancelado",
  incomplete: "Pendente",
};

// Features detalhadas por plano, mais rico que só o banco, pra vender melhor.
const FEATURES: Record<string, { label: string; highlight?: boolean; nota?: string }[]> = {
  titanio: [
    { label: "1 catálogo + 1 página de negócio" },
    { label: "Botões ilimitados (WhatsApp, mapa, links…)" },
    { label: "Catálogo com fotos e categorias" },
    { label: "QR Code da sua página" },
    { label: "Análises de visitas (Pulse)" },
    { label: "Agendamento de posts e ofertas" },
  ],
  niobio: [
    { label: "Orbi, a IA que atende 24h", highlight: true, nota: "Responde seus clientes a qualquer hora, inclusive de madrugada." },
    { label: "Recomenda produtos no chat", highlight: true, nota: "Sugere o item certo e leva a pessoa até a compra." },
    { label: "Captura contatos sozinha", highlight: true, nota: "Quem conversa deixa o WhatsApp, sem formulário." },
    { label: "Vouchers com código único", highlight: true, nota: "Cada cliente resgata o seu, e cada código vale uma vez." },
    { label: "Rede de lojas com código", highlight: true, nota: "Franquia ou várias lojas? Acompanhe todas num painel só." },
    { label: "Vários administradores", highlight: true, nota: "Sua equipe edita junto, cada um com o seu acesso." },
  ],
};

const TAGLINE: Record<string, string> = {
  titanio: "Pra começar com presença profissional",
  niobio: "Pra vender no automático com IA",
};

function Check({ highlight }: { highlight?: boolean }) {
  return (
    <span className={`mt-0.5 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full ${highlight ? "orbi-gradient shadow-[0_0_10px_rgba(110,231,216,0.6)]" : "bg-surface-soft"}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={highlight ? "#111318" : "#6b7280"} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

// Quem terminou o teste sem assinar ganha este desconto no primeiro ano do plano anual.
const DESCONTO_FIM_TESTE = 15;

export function PlanosClient({ plans, access }: { plans: Plan[]; access: AccessInfo }) {
  const oferta = access.testeAcabou;
  const [cycle, setCycle] = useState<Cycle>(oferta ? "yearly" : ((access.subscription?.billing_cycle as Cycle) ?? "monthly"));
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPlanId = access.subscription?.plan_id ?? null;
  const currentStatus = access.subscription?.status ?? null;
  // Teste sem cartão não é um plano escolhido: os dois planos ficam abertos pra assinar.
  const semCartao = access.testeSemCartao;
  const inGoodStanding = !semCartao && (currentStatus === "active" || currentStatus === "trialing" || currentStatus === "comped");

  // Ordena: Nióbio (premium) primeiro, pra dar destaque.
  const ordered = [...plans].sort((a, b) => b.monthly_price_cents - a.monthly_price_cents);

  async function handleGerenciarAssinatura() {
    setError(null);
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Não foi possível abrir o portal.");
      window.open(data.url, "_self");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setLoadingPortal(false);
    }
  }

  async function handleAssinar(planId: string) {
    setError(null);
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle: cycle }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Não foi possível iniciar o checkout.");
      window.open(data.url, "_self");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-5">
      {oferta && (
        <div className="niobio-borda animate-[fadeInUp_0.4s_ease] rounded-[22px] p-[2px]">
          <div className="relative overflow-hidden rounded-[20px] bg-surface-white p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">Seu teste terminou</p>
            <p className="mt-1 font-[family-name:var(--font-manrope)] text-[19px] font-semibold leading-snug">
              Mas você ganhou {DESCONTO_FIM_TESTE}% de desconto no plano anual <span aria-hidden>✦</span>
            </p>
            <p className="mt-1 text-[13px] leading-snug text-text-secondary">Vale pro Titânio ou pro Nióbio, o que você escolher, no primeiro ano.</p>
          </div>
        </div>
      )}
      {semCartao && !oferta && (
        <div className="animate-[fadeInUp_0.4s_ease] rounded-[20px] border border-divider bg-surface-white p-4">
          <p className="text-[13px] text-text-secondary">Agora</p>
          <p className="mt-0.5 text-[16px] font-semibold">{access.testeAcabou ? "Seu teste grátis terminou" : "Teste grátis com tudo liberado"}</p>
          {!access.testeAcabou && access.trialEndsAt && (
            <p className="mt-1 text-[13px] text-text-secondary">
              Até {new Date(access.trialEndsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}, sem cartão. Se assinar antes, os dias que faltam continuam grátis.
            </p>
          )}
        </div>
      )}
      {currentStatus && !semCartao && (
        <div className="animate-[fadeInUp_0.4s_ease] rounded-[20px] border border-divider bg-surface-white p-4">
          <p className="text-[13px] text-text-secondary">Seu plano atual</p>
          <p className="mt-0.5 text-[16px] font-semibold">
            {plans.find((p) => p.id === currentPlanId)?.name ?? currentPlanId}{" "}
            <span className="ml-1 rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-medium text-text-secondary">{STATUS_LABEL[currentStatus] ?? currentStatus}</span>
          </p>
          {access.trialEndsAt && access.isTrialing && (
            <p className="mt-1 text-[13px] text-text-secondary">Teste grátis até {new Date(access.trialEndsAt).toLocaleDateString("pt-BR")}</p>
          )}
          {access.subscription?.stripe_customer_id && (
            <button onClick={handleGerenciarAssinatura} disabled={loadingPortal} className="mt-3 text-[13px] font-medium text-on-background underline">
              {loadingPortal ? "Abrindo…" : "Gerenciar cartão / cancelar assinatura"}
            </button>
          )}
        </div>
      )}

      {/* Toggle de ciclo com selo de economia */}
      <div className="flex flex-col items-center gap-2">
        <div className="inline-flex rounded-full bg-surface-soft p-1">
          <button
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-5 py-2 text-[13px] font-medium transition-all ${cycle === "monthly" ? "bg-surface-white shadow-sm" : "text-text-secondary"}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-medium transition-all ${cycle === "yearly" ? "bg-surface-white shadow-sm" : "text-text-secondary"}`}
          >
            Anual
            <span className="rounded-full orbi-gradient px-1.5 py-0.5 text-[10px] font-bold text-on-background">{oferta ? `-${DESCONTO_FIM_TESTE}%` : "-2 meses"}</span>
          </button>
        </div>
      </div>

      {ordered.map((plan, idx) => {
        const comDesconto = oferta && cycle === "yearly";
        const anualCheio = plan.yearly_price_cents;
        const priceCents = cycle === "yearly" ? (comDesconto ? Math.round(anualCheio * (100 - DESCONTO_FIM_TESTE) / 100) : anualCheio) : plan.monthly_price_cents;
        const monthlyEquivalent = cycle === "yearly" ? Math.round(priceCents / 12) : plan.monthly_price_cents;
        const isCurrent = currentPlanId === plan.id && inGoodStanding;
        const isPremium = plan.has_ai_chat;
        const features = FEATURES[plan.id] ?? [];

        return (
          <div
            key={plan.id}
            className={`relative animate-[fadeInUp_0.5s_ease] ${isPremium ? "niobio-wrap" : ""}`}
            style={{ animationDelay: `${idx * 80}ms`, animationFillMode: "backwards" }}
          >
            {/* Badge "mais popular" no premium */}
            {isPremium && (
              <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
                <span className="flex items-center gap-1 rounded-full bg-on-background px-3 py-1 text-[11px] font-bold text-white shadow-lg">
                  ✦ Mais popular
                </span>
              </div>
            )}

            <div className={isPremium ? "niobio-borda rounded-[26px] p-[2px]" : ""}>
            <div className={`relative flex flex-col gap-4 overflow-hidden rounded-[24px] bg-surface-white p-6 ${isPremium ? "niobio-corpo" : "border border-divider"}`}>
              {isPremium && (
                <>
                  <span className="niobio-varre" aria-hidden />
                  <span className="niobio-estrela" style={{ right: 22, top: 20 }} aria-hidden>✦</span>
                  <span className="niobio-estrela" style={{ right: 58, top: 56, animationDelay: "0.9s", fontSize: 10 }} aria-hidden>✦</span>
                  <span className="niobio-estrela" style={{ left: 30, bottom: 96, animationDelay: "1.7s", fontSize: 9 }} aria-hidden>✦</span>
                </>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isPremium && <OrbiParticleSphere size={28} vivid className="rounded-full" />}
                    <p className="text-[20px] font-semibold">{plan.name}</p>
                  </div>
                  <p className="mt-1 text-[13px] text-text-secondary">{TAGLINE[plan.id] ?? plan.description}</p>
                </div>
              </div>

              <div className="flex items-end gap-1.5">
                <p className="text-[32px] font-bold leading-none tracking-tight">{formatBRL(monthlyEquivalent)}</p>
                <span className="mb-0.5 text-[14px] text-text-secondary">/mês</span>
              </div>
              {cycle === "yearly" && (
                <p className="-mt-2 text-[12px] text-text-tertiary">
                  {comDesconto ? (
                    <><span className="line-through">{formatBRL(anualCheio)}</span> <span className="font-medium text-text-secondary">{formatBRL(priceCents)}</span> no primeiro ano, cobrado uma vez</>
                  ) : (
                    <>{formatBRL(priceCents)} cobrado uma vez por ano</>
                  )}
                </p>
              )}
              {isPremium && (
                <p className="relative -mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1 text-[12.5px] font-medium text-text-secondary">
                  <span className="orbi-gradient-text font-semibold" aria-hidden>+</span> Inclui tudo do Titânio
                </p>
              )}

              <ul className="flex flex-col gap-2.5">
                {features.map((f, i) => (
                  <li key={i} className={`flex items-start gap-2.5 ${isPremium ? "niobio-item" : ""}`} style={isPremium ? ({ "--i": i } as CSSProperties) : undefined}>
                    <Check highlight={f.highlight} />
                    <span className="min-w-0">
                      <span className={`block text-[14px] leading-snug ${f.highlight ? "font-medium text-on-background" : "text-text-secondary"}`}>{f.label}</span>
                      {f.nota && <span className="mt-0.5 block text-[12.5px] leading-snug text-text-tertiary">{f.nota}</span>}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleAssinar(plan.id)}
                disabled={isCurrent || loadingPlan !== null}
                className={`mt-1 w-full rounded-full py-3.5 text-[14px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-60 ${
                  isCurrent
                    ? "bg-surface-soft text-text-secondary"
                    : isPremium
                      ? "orbi-gradient btn-brilho relative overflow-hidden text-on-background"
                      : "bg-button-primary text-white"
                }`}
              >
                {isCurrent ? "✓ Seu plano atual" : loadingPlan === plan.id ? "Abrindo checkout…" : isPremium ? "✦ Assinar Nióbio" : "Assinar Titânio"}
              </button>
            </div>
            </div>
          </div>
        );
      })}

      {error && <p className="text-center text-[13px] text-red-600">{error}</p>}

      <div className="mt-1 flex flex-col items-center gap-1.5 text-center">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary">
          {semCartao && !access.testeAcabou ? "🎁 Os dias de teste que faltam continuam grátis" : "Cancele quando quiser"}
        </p>
        <p className="text-[11px] text-text-tertiary">
          {semCartao && !access.testeAcabou ? "A primeira cobrança só acontece quando o teste terminar." : "Sem fidelidade. A assinatura renova sozinha e você controla tudo por aqui."}
        </p>
      </div>
    </div>
  );
}
