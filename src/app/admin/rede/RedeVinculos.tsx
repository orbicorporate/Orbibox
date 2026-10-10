"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

// Tabelas da rede ainda não estão nos tipos gerados do banco, por isso o cliente sem tipos.
function cliente() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

type Rede = { id: string; name: string };
type Loja = { business_id: string; name: string; instagram_handle: string | null; logo_url: string | null; address: string | null; linked_at: string };
type Previa = { business_id: string; name: string; instagram_handle: string | null; logo_url: string | null; address: string | null };

function textoDoErro(msg: string | undefined): string {
  if (!msg) return "Não consegui agora. Tente de novo.";
  if (msg.includes("codigo_invalido")) return "Código não encontrado, já usado ou vencido. Peça um novo para a loja.";
  if (msg.includes("ja_esta_em_rede")) return "Esta loja já faz parte de uma rede.";
  if (msg.includes("sem_permissao")) return "Você precisa criar a sua rede antes.";
  return "Não consegui agora. Tente de novo.";
}

function Avatar({ nome, logo }: { nome: string; logo: string | null }) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[16px] font-medium text-text-secondary" aria-hidden>
      {nome.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Lojas reais da rede: o dono da rede cria a rede, cola o código que a loja gerou,
 * confere quem é e adiciona. Os números da rede (abaixo) ainda são de exemplo.
 */
export function RedeVinculos() {
  const [carregando, setCarregando] = useState(true);
  const [rede, setRede] = useState<Rede | null>(null);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [nomeRede, setNomeRede] = useState("");
  const [codigo, setCodigo] = useState("");
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregarLojas = useCallback(async (id: string) => {
    const { data, error } = await cliente().rpc("listar_lojas_da_rede", { p_network_id: id });
    if (!error && Array.isArray(data)) setLojas(data as Loja[]);
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await cliente().from("networks").select("id, name").maybeSingle();
      if (!vivo) return;
      if (data) {
        setRede(data as Rede);
        await carregarLojas((data as Rede).id);
      }
      if (vivo) setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [carregarLojas]);

  async function criarRede() {
    if (nomeRede.trim().length < 2) { setErro("Dê um nome para a sua rede."); return; }
    setOcupado(true);
    setErro(null);
    const sb = cliente();
    const { data: id, error } = await sb.rpc("criar_rede", { p_name: nomeRede });
    setOcupado(false);
    if (error || !id) { setErro(textoDoErro(error?.message)); return; }
    setRede({ id: id as string, name: nomeRede.trim() });
  }

  async function buscar() {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    setPrevia(null);
    const { data, error } = await cliente().rpc("consultar_codigo_rede", { p_code: codigo });
    setOcupado(false);
    if (error) { setErro(textoDoErro(error.message)); return; }
    const linha = (Array.isArray(data) ? data[0] : data) as Previa | undefined;
    if (linha) setPrevia(linha);
    else setErro(textoDoErro("codigo_invalido"));
  }

  async function vincular() {
    if (!rede || !previa) return;
    setOcupado(true);
    setErro(null);
    const { error } = await cliente().rpc("vincular_loja_por_codigo", { p_code: codigo, p_network_id: rede.id });
    setOcupado(false);
    if (error) { setErro(textoDoErro(error.message)); return; }
    setAviso(`${previa.name} entrou na sua rede.`);
    setPrevia(null);
    setCodigo("");
    await carregarLojas(rede.id);
  }

  async function remover(l: Loja) {
    if (!window.confirm(`Tirar ${l.name} da rede?`)) return;
    const { error } = await cliente().from("network_members").delete().eq("business_id", l.business_id);
    if (error) { setErro("Não consegui remover agora."); return; }
    setLojas((prev) => prev.filter((x) => x.business_id !== l.business_id));
  }

  if (carregando) return null;

  return (
    <section className="mt-4 rounded-[24px] border border-divider bg-surface-white p-4" aria-labelledby="titulo-vinculos">
      {!rede ? (
        <>
          <h2 id="titulo-vinculos" className="font-[family-name:var(--font-manrope)] text-[18px] font-medium">Crie a sua rede</h2>
          <p className="mt-1 text-[13px] leading-snug text-text-tertiary">Depois disso, cada loja gera um código no Orbibox dela e você adiciona aqui.</p>
          <label className="mt-3 block text-[13px] text-text-secondary" htmlFor="nome-rede">Nome da rede</label>
          <input
            id="nome-rede"
            value={nomeRede}
            onChange={(e) => setNomeRede(e.target.value)}
            maxLength={80}
            placeholder="Ex.: Aurora"
            className="mt-1 min-h-[48px] w-full rounded-full border border-divider bg-surface-white px-4 text-[15px] outline-none focus:border-on-background/40"
          />
          <button type="button" onClick={criarRede} disabled={ocupado} className="mt-3 min-h-[48px] rounded-full bg-button-primary px-6 text-[15px] font-medium text-white disabled:opacity-50">
            {ocupado ? "Criando..." : "Criar rede"}
          </button>
        </>
      ) : (
        <>
          <h2 id="titulo-vinculos" className="font-[family-name:var(--font-manrope)] text-[18px] font-medium">Lojas da rede {rede.name}</h2>
          <p className="mt-1 text-[13px] leading-snug text-text-tertiary">Peça o código que a loja gerou em Configurações, na parte Rede.</p>

          <div className="mt-3 flex gap-2">
            <input
              value={codigo}
              onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setPrevia(null); setErro(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && codigo.trim()) buscar(); }}
              placeholder="ORB-XXXXXX"
              aria-label="Código da loja"
              autoCapitalize="characters"
              spellCheck={false}
              className="min-h-[48px] min-w-0 flex-1 rounded-full border border-divider bg-surface-white px-4 font-mono text-[15px] tracking-[0.1em] outline-none focus:border-on-background/40"
            />
            <button type="button" onClick={buscar} disabled={ocupado || codigo.trim().length < 6} className="min-h-[48px] shrink-0 rounded-full bg-button-primary px-5 text-[14.5px] font-medium text-white disabled:opacity-40">
              {ocupado && !previa ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {previa && (
            <div className="mt-3 rounded-2xl border border-divider p-3">
              <div className="flex items-center gap-3">
                <Avatar nome={previa.name} logo={previa.logo_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{previa.name}</p>
                  <p className="truncate text-[13px] text-text-tertiary">{[previa.instagram_handle ? `@${previa.instagram_handle.replace(/^@/, "")}` : null, previa.address].filter(Boolean).join(" · ") || "Sem endereço informado"}</p>
                </div>
              </div>
              <p className="mt-2 text-[12.5px] text-text-tertiary">Confira se é a loja certa antes de adicionar.</p>
              <button type="button" onClick={vincular} disabled={ocupado} className="mt-2 min-h-[48px] w-full rounded-full bg-button-primary text-[15px] font-medium text-white disabled:opacity-50">
                {ocupado ? "Adicionando..." : "Adicionar à minha rede"}
              </button>
            </div>
          )}

          {erro && <p role="alert" className="mt-3 text-[13px] text-red-600">{erro}</p>}
          {aviso && <p role="status" className="mt-3 text-[13px] text-[#2B6B00]">{aviso}</p>}

          {lojas.length > 0 ? (
            <ul className="mt-4 flex flex-col divide-y divide-divider">
              {lojas.map((l) => (
                <li key={l.business_id} className="flex items-center gap-3 py-2.5">
                  <Avatar nome={l.name} logo={l.logo_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium">{l.name}</p>
                    <p className="truncate text-[12.5px] text-text-tertiary">{l.instagram_handle ? `@${l.instagram_handle.replace(/^@/, "")}` : l.address ?? "Sem contato informado"}</p>
                  </div>
                  <button type="button" onClick={() => remover(l)} className="min-h-[44px] shrink-0 rounded-full px-3 text-[13px] text-text-tertiary underline underline-offset-4">Remover</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[13px] text-text-tertiary">Nenhuma loja adicionada ainda.</p>
          )}
        </>
      )}
    </section>
  );
}
