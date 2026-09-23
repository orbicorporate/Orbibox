"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function EsqueciSenhaPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    // Não revela se o e-mail existe ou não, mesma mensagem nos dois casos,
    // evita que alguém use esse formulário pra descobrir contas cadastradas.
    if (!error) setEnviado(true);
    else setError("Não deu pra enviar agora, tenta de novo em instantes.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-medium tracking-[-0.01em]">
          Esqueci minha senha
        </h1>
        {enviado ? (
          <>
            <p className="mt-1.5 text-[15px] leading-relaxed text-text-secondary">
              Se esse e-mail tiver uma conta no Orbibox, mandamos um link pra você criar uma senha nova. Confere sua caixa de entrada (e o spam).
            </p>
            <Link href="/login" className="mt-6 block text-center text-[14px] text-on-background underline">
              Voltar pro login
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-[15px] text-text-secondary">
              Digite o e-mail da sua conta, a gente manda um link pra você redefinir.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <input
                type="email"
                required
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
              />
              {error && <p className="text-[13px] text-red-600">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando…" : "Enviar link"}
              </Button>
            </form>
            <p className="mt-6 text-center text-[13px] text-text-tertiary">
              <Link href="/login" className="text-on-background underline">
                Voltar pro login
              </Link>
            </p>
          </>
        )}
      </Card>
    </main>
  );
}
