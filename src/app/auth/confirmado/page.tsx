"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";

// Depois de confirmar o e-mail: registra indicação/embaixador e resgata o
// bônus (mesmo passo que o cadastro faz quando já entra logado) e segue pro
// onboarding.
export default function ConfirmadoPage() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          fetch("/api/referral/register", { method: "POST" }),
          fetch("/api/affiliate/register", { method: "POST" }),
          fetch("/api/bonus/redeem", { method: "POST" }),
        ]);
      } catch { /* silencioso */ }
      router.replace("/onboarding");
    })();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-main px-6 text-center">
      <OrbiOrb size={96} className="mb-6" />
      <p className="font-[family-name:var(--font-manrope)] text-[22px] font-medium">E-mail confirmado ✦</p>
      <p className="mt-2 text-[14px] text-text-secondary">Preparando seu Orbibox…</p>
    </main>
  );
}
