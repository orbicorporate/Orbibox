"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { AccessInfo } from "@/lib/plans";
import type { Database } from "@/lib/supabase/types";

type Plan = Database["public"]["Tables"]["plans"]["Row"];
type Cycle = "monthly" | "yearly";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_LABEL: Record<string, string> = {
  trialing: "Em teste grátis",
  active: "Ativo",
  comped: "Cortesia",
  past_due: "Pagamento pendente",
  canceled: "Cancelado",
  incomplete: "Pendente",
};

export function PlanosClient({ plans, access }: { plans: Plan[]; access: AccessInfo }) {
  const [cycle, setCycle] = useState<Cycle>((access.subscription?.billing_cycle as Cycle) ?? "monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPlanId = access.subscription?.plan_id ?? null;
  const currentStatus = access.subscription?.status ?? null;
  const inGoodStanding = currentStatus === "active" || currentStatus === "trialing" || currentStatus === "comped";

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
    <div className="mt-6 flex flex-col gap-6">
      {currentStatus && (
        <Card className="!p-4">
          <p className="text-[13px] text-text-secondary">Seu plano atual</p>
          <p className="mt-0.5 text-[16px] font-medium">
            {plans.find((p) => p.id === currentPlanId)?.name ?? currentPlanId} ·{" "}
            <span className="text-text-secondary">{STATUS_LABEL[currentStatus] ?? currentStatus}</span>
          </p>
          {access.trialEndsAt && access.isTrialing && (
            <p className="mt-1 text-[13px] text-text-secondary">
              Teste grátis até {new Date(access.trialEndsAt).toLocaleDateString("pt-BR")}
            </p>
          )}
          {access.subscription?.stripe_customer_id && (
            <button
              onClick={handleGerenciarAssinatura}
              disabled={loadingPortal}
              className="mt-3 text-[13px] font-medium text-on-background underline"
            >
              {loadingPortal ? "Abrindo…" : "Gerenciar cartão / cancelar assinatura"}
            </button>
          )}
        </Card>
      )}

      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-surface-soft p-1">
          <button
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${cycle === "monthly" ? "bg-surface-white shadow-sm" : "text-text-secondary"}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${cycle === "yearly" ? "bg-surface-white shadow-sm" : "text-text-secondary"}`}
          >
            Anual · desconto
          </button>
        </div>
      </div>

      {plans.map((plan) => {
        const priceCents = cycle === "yearly" ? plan.yearly_price_cents : plan.monthly_price_cents;
        const isCurrent = currentPlanId === plan.id && inGoodStanding;

        return (
          <Card key={plan.id} className="flex flex-col gap-3">
            <div>
              <p className="text-[18px] font-medium">{plan.name}</p>
              <p className="mt-1 text-[14px] text-text-secondary">{plan.description}</p>
            </div>
            <p className="text-[24px] font-medium">
              {formatBRL(priceCents)}
              <span className="text-[14px] font-normal text-text-secondary">
                {cycle === "yearly" ? "/ano" : "/mês"}
              </span>
            </p>
            <ul className="flex flex-col gap-1 text-[14px] text-text-secondary">
              <li>{plan.max_businesses >= 999 ? "Múltiplos negócios numa conta só" : `Até ${plan.max_businesses} negócio(s)`}</li>
              <li>{plan.has_ai_chat ? "Chat com a Orbi (IA) incluso" : "Sem chat com IA"}</li>
            </ul>
            <Button
              variant={isCurrent ? "secondary" : "primary"}
              disabled={isCurrent || loadingPlan !== null}
              onClick={() => handleAssinar(plan.id)}
              className="mt-2"
            >
              {isCurrent ? "Seu plano atual" : loadingPlan === plan.id ? "Abrindo checkout…" : "Assinar"}
            </Button>
          </Card>
        );
      })}

      {error && <p className="text-center text-[13px] text-red-600">{error}</p>}

      <p className="text-center text-[12px] text-text-tertiary">
        3 dias de teste grátis com acesso completo (pede cartão no cadastro). Cobrança só depois do período de teste.
      </p>
    </div>
  );
}
