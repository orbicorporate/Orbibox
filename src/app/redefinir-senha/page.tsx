"use client";

import { useEffect, useState } from "react";
import { CampoSenha } from "@/components/ui/CampoSenha";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const supabase = createClient();
  const [pronto, setPronto] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // O link do e-mail traz um código de recuperação na URL. O cliente do
  // Supabase troca isso por uma sessão temporária e avisa pelo evento
  // PASSWORD_RECOVERY. Só esse evento vale: se a troca falhar (link aberto em
  // outro navegador, já usado), NÃO dá pra aproveitar uma sessão que já estava
  // aberta aqui, senão a senha nova seria gravada na conta errada.
  useEffect(() => {
    const veioDeLink = /[?&]code=|type=recovery|access_token=/.test(window.location.search + window.location.hash);
    let ok = false;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { ok = true; setPronto(true); }
    });
    const timeout = setTimeout(() => { if (!ok) setLinkInvalido(true); }, veioDeLink ? 4000 : 0);
    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Não deu pra salvar a senha, tenta de novo.");
      return;
    }
    setSucesso(true);
    setTimeout(() => {
      router.push("/abrir");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-medium tracking-[-0.01em]">
          Nova senha
        </h1>

        {linkInvalido ? (
          <>
            <p className="mt-1.5 text-[15px] leading-relaxed text-text-secondary">
              Esse link não é mais válido, já foi usado ou expirou. Pede um novo.
            </p>
            <Link href="/esqueci-senha" className="mt-6 block text-center text-[14px] text-on-background underline">
              Pedir novo link
            </Link>
            <Link href="/login" className="mt-3 block text-center text-[14px] text-text-secondary underline">
              Voltar ao login
            </Link>
          </>
        ) : sucesso ? (
          <p className="mt-1.5 text-[15px] leading-relaxed text-text-secondary">
            Senha atualizada! Te levando pro seu Orbibox…
          </p>
        ) : (
          <>
            <p className="mt-1 text-[15px] text-text-secondary">
              Escolha uma senha nova pra sua conta.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <CampoSenha
                
                required
                minLength={6}
                placeholder="Senha nova"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!pronto}
                className="rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background disabled:opacity-50"
              />
              {error && <p className="text-[13px] text-red-600">{error}</p>}
              <Button type="submit" disabled={loading || !pronto}>
                {!pronto ? "Confirmando link…" : loading ? "Salvando…" : "Salvar senha"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
