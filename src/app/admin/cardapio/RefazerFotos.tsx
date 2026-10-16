"use client";

import { useEffect, useRef, useState } from "react";
import CorFundoFotos from "./CorFundoFotos";
import ModoFotos, { type ModoFoto } from "./ModoFotos";
import { createClient } from "@/lib/supabase/client";
import { nomeArquivoUnico, type CardapioPdf, type CardapioSecao } from "@/lib/cardapio";
import { OrbiConcluido, OrbiMiniVerde } from "@/components/orbi/OrbiConcluido";
import { pdfParaImagens } from "@/lib/pdfParaImagens";
import { recortarFoto, type CaixaFoto } from "@/lib/recortarFoto";
import { melhorRecorte, lerCorFundo, guardarCorFundo, COR_PADRAO } from "@/lib/recorteIA";
import OrbiPontos from "@/components/orbi/OrbiPontos";

type Resposta = { categorias?: { nome: string; itens: { titulo: string; foto?: CaixaFoto | null }[] }[]; error?: string };

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Refaz as fotos dos pratos que já estão no cardápio: a Orbi lê o PDF de novo,
 * acha cada prato pelo nome, recorta só o prato (sem selo de preço nem texto)
 * e, se a pessoa quiser, deixa um fundo claro e neutro. Troca só as fotos, não
 * mexe em nome, preço nem descrição.
 */
export function RefazerFotos({ businessId, secoes, pdfs, onChange }: { businessId: string; secoes: CardapioSecao[]; pdfs: CardapioPdf[]; onChange: (s: CardapioSecao[]) => void }) {
  const supabase = useRef(createClient()).current;
  const [fase, setFase] = useState<"parado" | "lendo" | "fotos" | "pronto">("parado");
  const [feitas, setFeitas] = useState({ n: 0, total: 0 });
  const [modo, setModo] = useState<ModoFoto>("recortar");
  const [cor, setCor] = useState(COR_PADRAO);
  useEffect(() => { const c = lerCorFundo(); if (c !== COR_PADRAO) setCor(c); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<{ trocadas: number; faltaram: number } | null>(null);

  const nPratos = secoes.reduce((n, s) => n + s.itens.filter((i) => i.nome.trim()).length, 0);
  if (pdfs.length === 0 || nPratos === 0) return null;

  async function subir(b: Blob, tipo: string, prefixo: string): Promise<string | null> {
    const ext = tipo === "image/png" ? "png" : "jpg";
    const path = `${businessId}/${nomeArquivoUnico(prefixo, ext)}`;
    const { error } = await supabase.storage.from("box-images").upload(path, b, { cacheControl: "3600", upsert: false, contentType: tipo });
    if (error) return null;
    return supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl;
  }

  async function refazer() {
    setErro(null);
    setResumo(null);
    setFase("lendo");
    try {
      // 1) Acha, em cada PDF, onde está a foto de cada prato.
      const achados = new Map<string, { url: string; caixa: CaixaFoto }>();
      for (const p of pdfs) {
        const r = await fetch(p.url);
        if (!r.ok) continue;
        const { imagens } = await pdfParaImagens(await r.blob());
        const urls: string[] = [];
        for (const b of imagens) {
          const u = await subir(b, "image/jpeg", "cardapio-leitura");
          if (u) urls.push(u);
        }
        if (urls.length === 0) continue;
        const res = await fetch("/api/importar-cardapio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, texto: "", imagens: urls }) });
        const json = (await res.json()) as Resposta;
        if (!res.ok) { setErro(json.error ?? "A Orbi não conseguiu ler o PDF agora."); continue; }
        for (const c of json.categorias ?? []) {
          for (const i of c.itens) {
            const url = i.foto ? urls[i.foto.imagem - 1] : null;
            if (i.foto && url && !achados.has(norm(i.titulo))) achados.set(norm(i.titulo), { url, caixa: i.foto });
          }
        }
      }

      // 2) Recorta, tira o fundo (se escolhido) e troca a foto de cada prato reconhecido.
      const alvos = secoes.flatMap((s) => s.itens.filter((i) => achados.has(norm(i.nome))).map((i) => i.id));
      setFeitas({ n: 0, total: alvos.length });
      setFase("fotos");
      const novas = new Map<string, string>();
      let n = 0;
      for (const s of secoes) {
        for (const i of s.itens) {
          const a = achados.get(norm(i.nome));
          if (!a) continue;
          try {
            let blob = await recortarFoto(a.url, a.caixa);
            if (blob && modo === "recortar") {
              blob = (await melhorRecorte(blob, undefined, cor)).blob;
            }
            const u = blob ? await subir(blob, "image/jpeg", "cardapio-prato") : null;
            if (u) novas.set(i.id, u);
          } catch { /* este prato fica como estava */ }
          n += 1;
          setFeitas({ n, total: alvos.length });
        }
      }
      onChange(secoes.map((s) => ({ ...s, itens: s.itens.map((i) => (novas.has(i.id) ? { ...i, foto: novas.get(i.id)!, fotoAjuste: null } : i)) })));
      setResumo({ trocadas: novas.size, faltaram: nPratos - novas.size });
      setFase("pronto");
    } catch {
      setErro("Não consegui refazer as fotos agora. Tente de novo.");
      setFase("parado");
    }
  }

  if (fase === "pronto" && resumo) {
    return (
      <OrbiConcluido className="mt-4" titulo={resumo.trocadas > 0 ? `${resumo.trocadas} ${resumo.trocadas === 1 ? "foto refeita" : "fotos refeitas"}` : "Não achei fotos para refazer"} texto={resumo.trocadas > 0 ? (resumo.faltaram > 0 ? `${resumo.faltaram} ${resumo.faltaram === 1 ? "prato ficou" : "pratos ficaram"} como estava. Dá para ajustar à mão em cada prato.` : "Confira na lista. Em cada prato, toque na foto para ajustar.") : "O PDF não parece ter fotos desses pratos. Você pode ajustar a foto de cada prato à mão."}>
        <button type="button" onClick={() => setFase("parado")} className="min-h-[44px] rounded-full bg-white/80 px-5 text-[14px] font-semibold text-[#0F6B35]">Ok</button>
      </OrbiConcluido>
    );
  }

  const ocupado = fase === "lendo" || fase === "fotos";
  return (
    <div className="mt-4 rounded-[22px] bg-surface-soft p-4">
      <p className="text-[14.5px] font-semibold">Refazer as fotos pelo PDF</p>
      <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">A Orbi lê o PDF de novo e troca a foto de cada prato pelo recorte da foto no PDF. Nome, preço e descrição não mudam.</p>
      <ModoFotos valor={modo} onChange={setModo} disabled={ocupado} semOpcaoSem />
      {modo === "recortar" && <CorFundoFotos valor={cor} onChange={(c) => { setCor(c); guardarCorFundo(c); }} disabled={ocupado} />}
      {erro && <p role="alert" className="mt-1 text-[13px] text-red-600">{erro}</p>}
      <button type="button" onClick={refazer} disabled={ocupado} className={`mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-semibold active:scale-[0.98] ${ocupado ? "bg-surface-white text-on-background ring-1 ring-black/10" : "bg-on-background text-white"}`}>
        {fase === "lendo" ? <><OrbiMiniVerde size={20} />A Orbi está lendo o PDF…</> : fase === "fotos" ? <><OrbiMiniVerde size={20} progresso={feitas.total ? feitas.n / feitas.total : 0} />Refazendo {feitas.n} de {feitas.total}…</> : "Refazer fotos"}
      </button>
      {fase === "fotos" && feitas.total > 0 && <OrbiPontos n={feitas.n} total={feitas.total} className="mx-auto mt-3" />}
      {modo === "recortar" && <p className="mt-1.5 text-[12px] leading-snug text-text-tertiary">Na primeira vez baixa o recorte de fundo (uns 40 MB) e leva alguns segundos por foto. Pode deixar aberto.</p>}
    </div>
  );
}
