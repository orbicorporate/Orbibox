"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShareOrbiboxButton } from "@/components/mobile/ShareOrbiboxButton";

type Props = {
  nome: string;
  slug: string;
  link: string;
  categorias: string[];
  porCategoria: { nome: string; n: number }[];
  totalItens: number;
  semCategoria: number;
  boxes: number;
  temWhatsapp: boolean;
  temEndereco: boolean;
  visitas: number;
};

const pilula = "inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[15px] font-medium transition-transform active:scale-[0.98]";
const primario = `${pilula} w-full bg-on-background text-white`;
const fino = "inline-flex min-h-[40px] items-center rounded-full px-4 text-[13px] font-medium text-text-secondary ring-[0.5px] ring-black/25";

export function Comecar(p: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState<number | null>(null);
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [escolhidas, setEscolhidas] = useState<string[]>(p.categorias);
  const [nova, setNova] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const feitos = [
    p.categorias.length > 0,
    p.totalItens >= 3 && p.porCategoria.some((c) => c.n > 0),
    p.boxes >= 3 && p.temWhatsapp,
    p.visitas > 0,
  ];
  const atual = feitos.findIndex((f) => !f);
  const aberta = aberto ?? (atual === -1 ? 3 : atual);

  // Sem categorias ainda: a Orbi já traz sugestões prontas.
  useEffect(() => {
    if (p.categorias.length > 0) return;
    let vivo = true;
    fetch("/api/comecar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "sugerir" }) })
      .then((r) => r.json())
      .then((d) => { if (vivo && Array.isArray(d.categorias)) { setSugestoes(d.categorias); setEscolhidas(d.categorias); } })
      .catch(() => {});
    return () => { vivo = false; };
  }, [p.categorias.length]);

  async function chamar(acao: string, extra: object = {}) {
    setErro(null);
    setOcupado(acao);
    try {
      const r = await fetch("/api/comecar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, ...extra }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Não consegui agora. Tente de novo.");
      setAberto(null);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui agora.");
    } finally {
      setOcupado(null);
    }
  }

  function alternar(c: string) {
    setEscolhidas((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]));
  }
  function adicionar() {
    const c = nova.trim().slice(0, 30);
    if (!c) return;
    if (!escolhidas.includes(c)) setEscolhidas((a) => [...a, c]);
    if (!sugestoes.includes(c) && !p.categorias.includes(c)) setSugestoes((a) => [...a, c]);
    setNova("");
  }
  const todasChips = Array.from(new Set([...p.categorias, ...sugestoes, ...escolhidas]));

  const titulos = [
    { t: "Categorias", d: "O menu do seu catálogo" },
    { t: "Produtos e serviços", d: "Preencha cada categoria" },
    { t: "Página inicial", d: "Botões, contato e endereço" },
    { t: "Divulgar", d: "Coloque no ar" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">Vamos montar o catálogo</h1>
        <p className="mt-1 text-[14px] text-text-secondary">{atual === -1 ? "Tudo pronto. Agora é divulgar." : `Passo ${atual + 1} de 4`}</p>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {feitos.map((f, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${f ? "bg-[#1F9E4C]" : i === atual ? "bg-on-background" : "bg-black/10"}`} />)}
        </div>
      </div>

      {titulos.map((tt, i) => {
        const feito = feitos[i];
        const aqui = aberta === i;
        return (
          <section key={tt.t} className={`rounded-[24px] bg-white p-4 ring-1 ring-black/[0.06] ${aqui ? "shadow-[0_14px_30px_-18px_rgba(17,19,24,0.3)]" : ""}`}>
            <button type="button" onClick={() => setAberto(aqui ? -1 : i)} className="flex w-full items-center gap-3 text-left">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold ${feito ? "bg-[#1F9E4C] text-white" : "bg-on-background text-white"}`}>{feito ? "✓" : i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold leading-tight">{tt.t}</span>
                <span className="block text-[12.5px] text-text-tertiary">{tt.d}</span>
              </span>
              <span className={`text-text-tertiary transition-transform ${aqui ? "rotate-90" : ""}`} aria-hidden>›</span>
            </button>

            {aqui && i === 0 && (
              <div className="mt-4">
                <p className="text-[14px] text-text-secondary">Toque nas categorias que combinam com você. A Orbi organiza seus itens nelas.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {todasChips.map((c) => {
                    const on = escolhidas.includes(c);
                    return (
                      <button key={c} type="button" onClick={() => alternar(c)} aria-pressed={on} className={`min-h-[40px] rounded-full px-4 text-[14px] font-medium transition-colors ${on ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{c}</button>
                    );
                  })}
                  {todasChips.length === 0 && <span className="text-[13px] text-text-tertiary">A Orbi está pensando em sugestões…</span>}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); adicionar(); }} className="mt-3 flex items-center gap-2 rounded-full bg-surface-soft p-1.5 pl-4">
                  <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Outra categoria" className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none" enterKeyHint="done" />
                  <button type="submit" disabled={!nova.trim()} className="rounded-full bg-white px-4 py-2 text-[13px] font-medium disabled:opacity-40">Adicionar</button>
                </form>
                <button type="button" disabled={escolhidas.length === 0 || ocupado === "salvar"} onClick={() => void chamar("salvar", { categorias: escolhidas })} className={`${primario} mt-4 disabled:opacity-40`}>
                  {ocupado === "salvar" ? "Organizando…" : feito ? "Salvar e organizar" : "Salvar categorias"}
                </button>
              </div>
            )}

            {aqui && i === 1 && (
              <div className="mt-4">
                {p.categorias.length === 0 ? (
                  <p className="text-[14px] text-text-secondary">Faça o passo 1 primeiro, para eu saber onde colocar cada item.</p>
                ) : (
                  <>
                    <Link href="/admin/vitrine?inspire=1" className="flex items-center justify-between gap-3 rounded-2xl bg-on-background px-4 py-3.5 text-white active:scale-[0.99]">
                      <span><span className="block text-[14.5px] font-medium">Veja vitrines prontas antes</span><span className="block text-[12.5px] text-white/70">Modelos com fotos bem escolhidas</span></span>
                      <span aria-hidden>›</span>
                    </Link>
                    <ol className="mt-3 flex flex-col gap-1.5 text-[14px] text-text-secondary">
                      <li>1. Toque em Adicionar na categoria.</li>
                      <li>2. Escolha uma boa foto: nítida, de perto, luz clara.</li>
                      <li>3. Coloque nome e preço.</li>
                    </ol>
                    <ul className="mt-3 flex flex-col gap-2">
                      {p.porCategoria.map((c) => (
                        <li key={c.nome} className="flex items-center gap-3 rounded-2xl bg-surface-soft py-2 pl-4 pr-2">
                          <span className="min-w-0 flex-1"><span className="block truncate text-[14.5px] font-medium">{c.nome}</span><span className="block text-[12px] text-text-tertiary">{c.n === 0 ? "Vazia" : c.n === 1 ? "1 item" : `${c.n} itens`}</span></span>
                          <Link href={`/admin/vitrine?novo=1&cat=${encodeURIComponent(c.nome)}`} className="rounded-full bg-white px-4 py-2 text-[13px] font-medium">+ Adicionar</Link>
                        </li>
                      ))}
                    </ul>
                    {p.semCategoria > 0 && <p className="mt-3 text-[12.5px] text-text-tertiary">{p.semCategoria} {p.semCategoria === 1 ? "item está" : "itens estão"} sem categoria. Abra o Catálogo para organizar.</p>}
                    <Link href="/admin/vitrine" className={`${primario} mt-4`}>Abrir meu catálogo</Link>
                  </>
                )}
              </div>
            )}

            {aqui && i === 2 && (
              <div className="mt-4">
                {p.boxes === 0 ? (
                  <>
                    <p className="text-[14px] text-text-secondary">Sua página inicial ainda está sem botões. A Orbi cria os principais agora.</p>
                    <button type="button" disabled={ocupado === "botoes"} onClick={() => void chamar("botoes")} className={`${primario} mt-4 disabled:opacity-40`}>{ocupado === "botoes" ? "Criando…" : "Criar botões da página"}</button>
                  </>
                ) : (
                  <>
                    <ul className="flex flex-col gap-2">
                      {[
                        { ok: p.temWhatsapp, t: "WhatsApp", d: "Seu contato em destaque", href: "/admin/config/marca#contatos", cta: "Colocar" },
                        { ok: p.temEndereco, t: "Endereço com mapa", d: "Se atende no local", href: "/admin/config/marca#contatos", cta: "Colocar" },
                        { ok: p.boxes >= 3, t: "Botões e bolinhas", d: `${p.boxes} ligados. Crie mais ou mude a ordem`, href: "/admin/boxes", cta: "Abrir" },
                      ].map((x) => (
                        <li key={x.t} className="flex items-center gap-3 rounded-2xl bg-surface-soft py-2.5 pl-3 pr-2">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${x.ok ? "bg-[#1F9E4C] text-white" : "bg-black/10 text-text-tertiary"}`}>{x.ok ? "✓" : ""}</span>
                          <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-medium">{x.t}</span><span className="block text-[12px] text-text-tertiary">{x.d}</span></span>
                          <Link href={x.href} className="rounded-full bg-white px-4 py-2 text-[13px] font-medium">{x.ok ? "Ver" : x.cta}</Link>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-[12.5px] text-text-tertiary">Dica: WhatsApp sempre em primeiro, seu produto principal logo depois.</p>
                  </>
                )}
              </div>
            )}

            {aqui && i === 3 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 rounded-full bg-surface-soft p-1.5 pl-4">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{p.link.replace(/^https?:\/\//, "")}</span>
                  <ShareOrbiboxButton url={p.link} title={p.nome} className="shrink-0 rounded-full bg-on-background px-4 py-2 text-[13px] font-medium text-white">Divulgar</ShareOrbiboxButton>
                </div>
                <p className="mt-3 text-[13.5px] text-text-secondary">Coloque na bio do Instagram, nos stories e no WhatsApp.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className={fino}>Ver minha página</a>
                  <Link href="/admin" className={fino}>Ir para o início</Link>
                </div>
              </div>
            )}
          </section>
        );
      })}
      {erro && <p className="px-1 text-[13px] text-red-600">{erro}</p>}
    </div>
  );
}
