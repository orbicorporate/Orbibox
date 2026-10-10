"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

// Tabelas da rede ainda não estão nos tipos gerados do banco, por isso o cliente sem tipos.
function cliente() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

type Codigo = { code: string; expires_at: string };

function textoDoErro(msg: string | undefined): string {
  if (!msg) return "Não consegui agora. Tente de novo.";
  if (msg.includes("ja_esta_em_rede")) return "Este Orbibox já faz parte de uma rede.";
  if (msg.includes("sem_permissao")) return "Só quem administra este Orbibox pode gerar o código.";
  return "Não consegui agora. Tente de novo.";
}

/**
 * Entrar numa rede: a loja gera um código e passa para a marca (o dono da rede),
 * que adiciona a loja no painel dele. O consentimento fica com a loja.
 */
export function CodigoRede({ businessId }: { businessId: string }) {
  const [carregando, setCarregando] = useState(true);
  const [rede, setRede] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<Codigo | null>(null);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const sb = cliente();
      const { data: membro } = await sb.from("network_members").select("networks(name)").eq("business_id", businessId).maybeSingle();
      if (!vivo) return;
      const nome = (membro as { networks?: { name?: string } | { name?: string }[] | null } | null)?.networks;
      const n = Array.isArray(nome) ? nome[0]?.name : nome?.name;
      if (membro) {
        setRede(n ?? "uma rede");
      } else {
        const { data: c } = await sb
          .from("network_link_codes")
          .select("code, expires_at")
          .eq("business_id", businessId)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (vivo && c) setCodigo(c as Codigo);
      }
      if (vivo) setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [businessId]);

  async function gerar() {
    setGerando(true);
    setErro(null);
    const { data, error } = await cliente().rpc("gerar_codigo_rede", { p_business_id: businessId });
    setGerando(false);
    if (error) { setErro(textoDoErro(error.message)); return; }
    const linha = (Array.isArray(data) ? data[0] : data) as Codigo | undefined;
    if (linha) setCodigo(linha);
  }

  async function copiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo.code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch { /* sem permissão de área de transferência: o código segue visível */ }
  }

  async function sair() {
    if (!window.confirm("Sair da rede? A marca deixa de ver os números desta loja.")) return;
    setSaindo(true);
    const { error } = await cliente().from("network_members").delete().eq("business_id", businessId);
    setSaindo(false);
    if (error) { setErro("Não consegui sair agora. Tente de novo."); return; }
    setRede(null);
  }

  if (carregando) return null;

  const validade = codigo ? new Date(codigo.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : null;

  return (
    <section className="mt-8" aria-labelledby="titulo-rede">
      <p id="titulo-rede" className="text-[13px] uppercase tracking-wide text-text-tertiary">Rede</p>
      <div className="mt-2.5 rounded-[22px] border border-divider bg-surface-white p-4">
        {rede ? (
          <>
            <p className="text-[15px] font-semibold">Faz parte da rede {rede}</p>
            <p className="mt-1 text-[13px] leading-snug text-text-tertiary">A marca acompanha esta loja na rede dela. Suas conversas e seus contatos continuam só seus.</p>
            <button type="button" onClick={sair} disabled={saindo} className="mt-3 min-h-[44px] rounded-full border border-divider px-5 text-[14px] font-medium text-red-600 disabled:opacity-50">
              {saindo ? "Saindo..." : "Sair da rede"}
            </button>
          </>
        ) : (
          <>
            <p className="text-[15px] font-semibold">Código da rede</p>
            <p className="mt-1 text-[13px] leading-snug text-text-tertiary">Sua marca tem uma rede de lojas? Gere um código e passe para ela. Ela adiciona esta loja no painel dela.</p>
            {codigo ? (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-on-background/30 px-4 py-3">
                  <span className="font-mono text-[22px] font-medium tracking-[0.12em]">{codigo.code}</span>
                  <button type="button" onClick={copiar} className="min-h-[44px] rounded-full border border-divider px-4 text-[13.5px] font-medium">
                    {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="mt-2 text-[12.5px] text-text-tertiary">Vale até {validade} e só pode ser usado uma vez.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Meu código para entrar na rede no Orbibox: ${codigo.code}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[44px] items-center rounded-full bg-button-primary px-5 text-[14px] font-medium text-white"
                  >
                    Enviar pelo WhatsApp
                  </a>
                  <button type="button" onClick={gerar} disabled={gerando} className="min-h-[44px] rounded-full border border-divider px-5 text-[14px] font-medium disabled:opacity-50">
                    {gerando ? "Gerando..." : "Gerar outro"}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={gerar} disabled={gerando} className="mt-3 min-h-[44px] rounded-full bg-button-primary px-5 text-[14px] font-medium text-white disabled:opacity-50">
                {gerando ? "Gerando..." : "Gerar código"}
              </button>
            )}
          </>
        )}
        {erro && <p role="alert" className="mt-3 text-[13px] text-red-600">{erro}</p>}
      </div>
    </section>
  );
}
