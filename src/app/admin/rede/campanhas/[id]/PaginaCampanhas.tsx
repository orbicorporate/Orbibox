"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { rotuloDesconto } from "../../RedeCampanhas";

function cliente() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

type Linha = {
  page_title: string; page_description: string | null; rede: string; page_ativa: boolean;
  campaign_id: string; title: string; description: string | null; discount_type: string; discount_value: number; aceitar_ate: string | null; is_active: boolean; ja_aceitou: boolean; quantidade: number | null;
};

const cereja = "bg-[linear-gradient(110deg,#A80F28,#C4122F_50%,#E4264C)] text-white shadow-[0_8px_18px_-10px_rgba(196,18,47,0.9)]";

function textoDoErro(msg: string | undefined) {
  if (!msg) return "Não consegui agora. Tente de novo.";
  if (msg.includes("campanha_encerrada")) return "Esta campanha foi encerrada.";
  if (msg.includes("ja_aceitou")) return "Você já aceitou esta campanha.";
  if (msg.includes("fora_da_rede")) return "Este negócio não faz parte dessa rede.";
  if (msg.includes("quantidade_invalida")) return "Coloque quantos vouchers você quer distribuir.";
  return "Não consegui agora. Tente de novo.";
}

/** O parceiro vê a página da rede, escolhe quais campanhas aceitar e quantos vouchers distribuir em cada uma. */
export function PaginaCampanhas({ paginaId, businessId, temVouchers }: { paginaId: string; businessId: string; temVouchers: boolean }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [qtd, setQtd] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});

  const buscar = useCallback(async () => {
    const { data, error } = await cliente().rpc("obter_pagina_campanhas_rede", { p_page_id: paginaId, p_business_id: businessId });
    if (error) return { linhas: null, erro: error.message?.includes("fora_da_rede") ? "Este negócio não faz parte dessa rede. Peça o código de vínculo ao dono da rede." : "Não encontrei essa página de campanhas." };
    return { linhas: ((data as Linha[]) ?? []), erro: null };
  }, [paginaId, businessId]);

  const carregar = useCallback(async () => {
    const r = await buscar();
    if (r.linhas) setLinhas(r.linhas); else setErroGeral(r.erro);
  }, [buscar]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const r = await buscar();
      if (!vivo) return;
      if (r.linhas) setLinhas(r.linhas); else setErroGeral(r.erro);
    })();
    return () => { vivo = false; };
  }, [buscar]);

  async function aceitar(id: string) {
    const n = Number(qtd[id] ?? "");
    if (!n || n < 1) { setErros((e) => ({ ...e, [id]: "Coloque quantos vouchers você quer distribuir." })); return; }
    setOcupado(id); setErros((e) => ({ ...e, [id]: "" }));
    const { error } = await cliente().rpc("aceitar_campanha_rede", { p_campaign_id: id, p_business_id: businessId, p_quantity: n });
    setOcupado(null);
    if (error) { setErros((e) => ({ ...e, [id]: textoDoErro(error.message) })); return; }
    await carregar();
  }

  if (erroGeral) return <p className="mt-10 rounded-[22px] bg-surface-soft px-4 py-5 text-center text-[14px] text-text-secondary">{erroGeral}</p>;
  if (!linhas) return null;
  const topo = linhas[0];
  if (!topo) return <p className="mt-10 text-center text-[14px] text-text-secondary">Esta página ainda não tem campanhas.</p>;

  return (
    <div className="mt-4 pb-10">
      <p className="text-[13px] text-text-tertiary">Rede {topo.rede}</p>
      <h1 className="mt-1 font-[family-name:var(--font-manrope)] text-[28px] font-medium leading-tight tracking-[-0.02em]">{topo.page_title}</h1>
      {topo.page_description && <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{topo.page_description}</p>}
      <p className="mt-3 text-[13.5px] text-text-secondary">Aceite só as campanhas que fazem sentido para o seu negócio e escolha quantos vouchers quer distribuir. Depois de aceita, a campanha é sua: você pausa ou encerra quando quiser.</p>

      {!temVouchers && (
        <div className="mt-4 rounded-[22px] bg-[#FFF6DB] px-4 py-3.5 text-[13.5px] leading-snug text-[#6B4A00]">
          Vouchers fazem parte do plano Nióbio. Ative o plano para aceitar as campanhas da rede.{" "}
          <Link href="/admin/planos" className="font-semibold underline underline-offset-2">Ver planos</Link>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {linhas.map((c) => {
          const encerrada = !c.is_active || !c.page_ativa || (c.aceitar_ate && new Date(c.aceitar_ate) < new Date());
          return (
            <div key={c.campaign_id} className="rounded-[22px] bg-surface-white p-4 shadow-[0_6px_24px_-14px_rgba(17,19,24,0.3)]">
              <p className="text-[17px] font-medium">{c.title}</p>
              <p className="mt-0.5 text-[14px] text-text-secondary">{rotuloDesconto(c.discount_type, c.discount_value)}</p>
              {c.description && <p className="mt-2 text-[13.5px] leading-snug text-text-secondary">{c.description}</p>}
              {c.aceitar_ate && <p className="mt-2 text-[12.5px] text-text-tertiary">Aceitar até {new Date(c.aceitar_ate).toLocaleDateString("pt-BR")}</p>}

              {c.ja_aceitou ? (
                <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#E9F8EF] px-3.5 py-3 text-[13.5px] text-[#16703A]">
                  <span className="min-w-0 flex-1">Aceita, com {c.quantidade} vouchers.</span>
                  <Link href="/admin/vouchers" className="shrink-0 font-semibold underline underline-offset-2">Gerenciar</Link>
                </div>
              ) : encerrada ? (
                <p className="mt-3 rounded-2xl bg-surface-soft px-3.5 py-3 text-[13.5px] text-text-tertiary">Campanha encerrada.</p>
              ) : (
                <div className="mt-3">
                  <div className="flex gap-2">
                    <input inputMode="numeric" value={qtd[c.campaign_id] ?? ""} onChange={(e) => setQtd((q) => ({ ...q, [c.campaign_id]: e.target.value.replace(/\D/g, "") }))} placeholder="Quantos vouchers?" className="min-h-[46px] w-full min-w-0 flex-1 rounded-full border border-divider bg-surface-white px-4 text-[14px] outline-none focus:border-on-background" />
                    <button type="button" onClick={() => aceitar(c.campaign_id)} disabled={!temVouchers || ocupado === c.campaign_id} className={`min-h-[46px] shrink-0 rounded-full px-5 text-[14px] font-semibold disabled:opacity-50 ${cereja}`}>{ocupado === c.campaign_id ? "Aceitando..." : "Aceitar"}</button>
                  </div>
                  {erros[c.campaign_id] && <p className="mt-2 text-[13px] text-[#C4122F]">{erros[c.campaign_id]}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
