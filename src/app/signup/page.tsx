"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { erroDeAuth } from "@/lib/authErros";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [reenvio, setReenvio] = useState<"idle" | "enviando" | "ok" | "erro">("idle");

  async function reenviar() {
    setReenvio("enviando");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setReenvio(error ? "erro" : "ok");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(erroDeAuth(error.message));
      return;
    }
    if (!data.session) {
      // Confirmação de e-mail está ativa no projeto, sem sessão ainda.
      setCheckEmail(true);
      return;
    }
    // Já logado: registra indicação/embaixador e resgata o bônus (se veio por
    // algum desses links) antes de seguir pro onboarding.
    try {
      await Promise.all([
        fetch("/api/referral/register", { method: "POST" }),
        fetch("/api/affiliate/register", { method: "POST" }),
        fetch("/api/bonus/redeem", { method: "POST" }),
      ]);
    } catch { /* silencioso */ }
    router.push("/onboarding");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-soft">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="m4 7 8 6 8-6" />
            </svg>
          </div>
          <h1 className="mt-5 font-[family-name:var(--font-manrope)] text-[24px] font-medium">Falta só confirmar</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            Mandamos um link para <strong className="font-medium text-on-background">{email}</strong>. Abra o e-mail e toque
            no botão de confirmar. Você já cai direto na criação da sua página.
          </p>
          <p className="mt-4 rounded-2xl bg-surface-soft px-4 py-3 text-[13px] leading-snug text-text-secondary">
            Não chegou em 1 minuto? Olhe a pasta de spam ou promoções.
          </p>
          <button
            type="button"
            onClick={reenviar}
            disabled={reenvio === "enviando" || reenvio === "ok"}
            className="mt-5 w-full rounded-full border border-divider bg-surface-white px-5 py-3 text-[14px] font-medium disabled:opacity-60"
          >
            {reenvio === "enviando" ? "Enviando…" : reenvio === "ok" ? "Enviamos de novo ✓" : "Enviar o e-mail de novo"}
          </button>
          {reenvio === "erro" && <p className="mt-2 text-[13px] text-red-600">Não deu pra reenviar agora. Espere um minuto e tente de novo.</p>}
          <div className="mt-5 flex justify-center gap-5 text-[13px]">
            <button type="button" onClick={() => { setCheckEmail(false); setReenvio("idle"); }} className="text-text-secondary underline">
              Corrigir e-mail
            </button>
            <Link href="/login" className="text-on-background underline">
              Já confirmei, entrar
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-medium tracking-[-0.01em]">
          Criar meu Orbibox <span className="orbi-gradient-text">✦</span>
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          A web que se adapta a quem entra.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <input
            required
            placeholder="Seu nome"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
          />
          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
          />
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Criando…" : "Continuar"}
          </Button>
        </form>
        <p className="mt-6 text-center text-[13px] text-text-tertiary">
          Já tem conta?{" "}
          <Link href="/login" className="text-on-background underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
