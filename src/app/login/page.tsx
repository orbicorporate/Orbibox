"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { erroDeAuth } from "@/lib/authErros";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [naoConfirmado, setNaoConfirmado] = useState(false);
  const [reenvio, setReenvio] = useState<"idle" | "enviando" | "ok" | "erro">("idle");
  // Veio de um link de confirmação que não abriu sessão (link velho, já usado
  // ou aberto em outro navegador). Na maioria das vezes o e-mail já está
  // confirmado, então é só entrar.
  const vindoDoLink = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("confirmado") === "1",
    () => false,
  );

  async function reenviar() {
    if (!email.trim()) return;
    setReenvio("enviando");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setReenvio(error ? "erro" : "ok");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNaoConfirmado(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setNaoConfirmado(error.message.toLowerCase().includes("email not confirmed"));
      setError(erroDeAuth(error.message));
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-medium tracking-[-0.01em]">
          Entrar no Orbibox
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Acesse o painel do seu negócio.
        </p>
        {vindoDoLink && (
          <p className="mt-6 rounded-2xl bg-surface-soft px-4 py-3 text-[13px] leading-snug text-text-secondary">
            Esse link de confirmação já foi usado ou expirou. Seu e-mail provavelmente já está confirmado: é só entrar abaixo.
          </p>
        )}
        <form onSubmit={handleSubmit} className={`${vindoDoLink ? "mt-5" : "mt-8"} flex flex-col gap-4`}>
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
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
          />
          <Link href="/esqueci-senha" className="-mt-2 self-end text-[13px] text-text-secondary underline">
            Esqueci minha senha
          </Link>
          {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
          {naoConfirmado && (
            <button
              type="button"
              onClick={reenviar}
              disabled={reenvio === "enviando" || reenvio === "ok"}
              className="-mt-1 self-start text-[13px] font-medium text-on-background underline disabled:no-underline disabled:opacity-60"
            >
              {reenvio === "enviando" ? "Enviando…" : reenvio === "ok" ? "Link enviado de novo ✓ (veja o spam)" : reenvio === "erro" ? "Não deu, tente em 1 minuto" : "Enviar link de confirmação de novo"}
            </button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <p className="mt-6 text-center text-[13px] text-text-tertiary">
          Ainda não tem conta?{" "}
          <Link href="/signup" className="text-on-background underline">
            Criar meu Orbibox ✦
          </Link>
        </p>
      </div>
    </main>
  );
}
