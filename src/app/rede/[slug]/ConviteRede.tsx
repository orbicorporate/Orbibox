"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

// Tabelas e funções da rede ainda não estão nos tipos gerados do banco, por isso o cliente sem tipos.
function cliente() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

type Meu = { id: string; name: string; slug: string; naRede: boolean };

const COOKIE_REDE = "orbi_rede";

function guardarConvite(slug: string | null) {
  document.cookie = slug
    ? `${COOKIE_REDE}=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
    : `${COOKIE_REDE}=; path=/; max-age=0`;
}

export function ConviteRede({ redeNome, redeSlug }: { redeNome: string; redeSlug: string }) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [entrou, setEntrou] = useState<string[]>([]);
  const [logado, setLogado] = useState(false);
  const [meus, setMeus] = useState<Meu[]>([]);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const sb = cliente();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { if (vivo) setPronto(true); return; }
      const { data: negocios } = await sb.from("businesses").select("id, name, slug").eq("owner_id", user.id).order("created_at", { ascending: true });
      const ids = (negocios ?? []).map((n: { id: string }) => n.id);
      const { data: vinculos } = ids.length ? await sb.from("network_members").select("business_id").in("business_id", ids) : { data: [] };
      const dentro = new Set((vinculos ?? []).map((v: { business_id: string }) => v.business_id));
      if (!vivo) return;
      setMeus((negocios ?? []).map((n: { id: string; name: string; slug: string }) => ({ ...n, naRede: dentro.has(n.id) })));
      setLogado(true);
      setPronto(true);
    })();
    return () => { vivo = false; };
  }, []);

  // Guarda o convite pra quem ainda vai criar o Orbibox: o onboarding liga o novo Orbibox à rede.
  useEffect(() => {
    guardarConvite(redeSlug);
  }, [redeSlug]);

  async function entrar(n: Meu) {
    setOcupado(n.id);
    setErro(null);
    const { error } = await cliente().rpc("entrar_na_rede_por_convite", { p_slug: redeSlug, p_business_id: n.id });
    setOcupado(null);
    if (error) {
      setErro(error.message.includes("ja_esta_em_rede") ? "Este Orbibox já faz parte de uma rede." : "Não consegui agora. Tente de novo.");
      return;
    }
    guardarConvite(null);
    setEntrou((x) => [...x, n.id]);
  }

  const proxima = `/rede/${redeSlug}`;
  const livres = meus.filter((m) => !m.naRede && !entrou.includes(m.id));

  return (
    <main className="mx-auto flex min-h-screen max-w-[440px] flex-col justify-center gap-5 px-6 py-10">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Convite</p>
        <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-tight tracking-[-0.02em]">
          Entre na rede {redeNome}
        </h1>
        <p className="mt-2 text-[14.5px] leading-snug text-text-secondary">
          Com o seu Orbibox na rede, a {redeNome} pode editar e acompanhar a sua página pelo painel dela. Cada Orbibox continua com a própria conta e o próprio plano.
        </p>
      </div>

      {pronto && !logado && (
        <div className="flex flex-col gap-2">
          <Link href="/signup" className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-button-primary px-6 text-[15px] font-medium text-white">
            Criar o meu Orbibox
          </Link>
          <Link href={`/login?next=${encodeURIComponent(proxima)}`} className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-surface-soft px-6 text-[15px] font-medium">
            Já tenho Orbibox
          </Link>
          <p className="mt-1 text-center text-[12.5px] text-text-tertiary">Ao criar o seu Orbibox por aqui, ele já entra na rede {redeNome}.</p>
        </div>
      )}

      {pronto && logado && meus.length === 0 && (
        <div className="flex flex-col gap-2">
          <Link href="/onboarding" className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-button-primary px-6 text-[15px] font-medium text-white">
            Criar o meu Orbibox
          </Link>
          <p className="text-center text-[12.5px] text-text-tertiary">Ele já entra na rede {redeNome} ao ficar pronto.</p>
        </div>
      )}

      {pronto && logado && meus.length > 0 && (
        <div className="flex flex-col gap-2">
          {meus.map((n) => {
            const dentro = n.naRede || entrou.includes(n.id);
            return (
              <div key={n.id} className="flex items-center gap-3 rounded-2xl border border-divider py-3 pl-4 pr-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{n.name}</span>
                  <span className="block truncate text-[12px] text-text-tertiary">/{n.slug}</span>
                </span>
                {dentro ? (
                  <span className="shrink-0 rounded-full bg-surface-soft px-3 py-1.5 text-[12.5px] font-medium text-text-secondary">Na rede</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => entrar(n)}
                    disabled={!!ocupado}
                    className="min-h-[44px] shrink-0 rounded-full bg-button-primary px-4 text-[14px] font-medium text-white disabled:opacity-50"
                  >
                    {ocupado === n.id ? "Entrando…" : "Entrar na rede"}
                  </button>
                )}
              </div>
            );
          })}
          {erro && <p role="alert" className="text-[13px] text-red-600">{erro}</p>}
          {livres.length === 0 && <Link href="/admin" className="mt-1 inline-flex min-h-[48px] items-center justify-center rounded-full bg-surface-soft px-6 text-[14.5px] font-medium">Ir para o painel</Link>}
        </div>
      )}
    </main>
  );
}
