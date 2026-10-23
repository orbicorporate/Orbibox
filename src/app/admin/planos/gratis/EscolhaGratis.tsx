"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CandidatoGratis } from "@/lib/planoGratis";

export type FotoGratis = { id: string; url: string };

const FICA_DESLIGADO = ["Vouchers", "Gift Cards", "IA no atendimento", "PDFs", "Números (Pulse)", "Conversas"];

function Marcador({ marcado }: { marcado: boolean }) {
  return (
    <span aria-hidden className={`grid h-6 w-6 flex-none place-items-center rounded-full border-2 ${marcado ? "border-on-background bg-on-background text-white" : "border-divider bg-white"}`}>
      {marcado && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>}
    </span>
  );
}

function Secao({ titulo, sub, contagem, limite, children }: { titulo: string; sub: string; contagem: number; limite: number; children: React.ReactNode }) {
  return (
    <section className="mt-7 border-t border-divider pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[18px] font-medium tracking-[-0.01em]">{titulo}</h2>
        <span className={`flex-none text-[14px] tabular-nums ${contagem >= limite ? "text-on-background" : "text-text-secondary"}`}>{contagem} de {limite}</span>
      </div>
      <p className="mt-1 text-[14px] leading-snug text-text-secondary">{sub}</p>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Linha({ c, marcado, cheio, aoAlternar }: { c: CandidatoGratis; marcado: boolean; cheio: boolean; aoAlternar: () => void }) {
  const travado = !marcado && cheio;
  return (
    <button type="button" role="checkbox" aria-checked={marcado} disabled={travado} onClick={aoAlternar} className={`flex min-h-[60px] items-center gap-3 rounded-full border bg-white p-2 pr-4 text-left transition-transform active:scale-[0.99] ${marcado ? "border-on-background" : "border-divider"} ${travado ? "opacity-45" : ""}`}>
      {c.foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.foto} alt="" className="h-11 w-11 flex-none rounded-full object-cover" />
      ) : (
        <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-surface-soft text-[15px] text-text-secondary">{c.titulo.charAt(0).toUpperCase()}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15.5px]">{c.titulo}</span>
        {c.sub && <span className="block truncate text-[13px] text-text-secondary">{c.sub}</span>}
      </span>
      <Marcador marcado={marcado} />
    </button>
  );
}

export function EscolhaGratis({ businessId, nome, bolinhas, destaques, fotos, limites, testeAcabou }: {
  businessId: string;
  nome: string;
  bolinhas: CandidatoGratis[];
  destaques: CandidatoGratis[];
  fotos: FotoGratis[];
  limites: { bolinhas: number; boxes: number; fotos: number };
  testeAcabou: boolean;
}) {
  const router = useRouter();
  const [bol, setBol] = useState<string[]>(() => bolinhas.slice(0, limites.bolinhas).map((c) => c.chave));
  const [dest, setDest] = useState<string[]>(() => destaques.slice(0, limites.boxes).map((c) => c.chave));
  const [fts, setFts] = useState<string[]>(() => fotos.slice(0, limites.fotos).map((f) => f.id));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const alternar = (lista: string[], set: (v: string[]) => void, chave: string, max: number) => {
    if (lista.includes(chave)) set(lista.filter((k) => k !== chave));
    else if (lista.length < max) set([...lista, chave]);
  };

  const desativados = (bolinhas.length - bol.length) + (destaques.length - dest.length) + Math.max(0, fotos.length - fts.length);

  async function confirmar() {
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch("/api/plano-gratis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, bolinhas: bol, destaques: dest, fotos: fotos.length > limites.fotos ? fts : [] }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) { setErro(j.error ?? "Não consegui salvar agora. Tente de novo."); setSalvando(false); return; }
      router.replace("/admin");
      router.refresh();
    } catch {
      setErro("Sem conexão. Tente de novo.");
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col pb-10">
      <p className="mt-2 text-[14px] text-text-secondary">{testeAcabou ? "Seu teste terminou" : "Sua assinatura terminou"}</p>
      <h1 className="mt-1 font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-tight tracking-[-0.02em]">Escolha o que fica no ar</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
        O link de {nome} continua ativo, de graça, com o essencial. Escolha o que você quer manter. Nada é apagado: o resto fica guardado e volta com um toque quando você assinar.
      </p>

      <Secao titulo="Bolinhas" sub="Os atalhos redondos da sua página." contagem={bol.length} limite={limites.bolinhas}>
        {bolinhas.length === 0 && <p className="text-[14px] text-text-secondary">Você não tem bolinhas ativas.</p>}
        {bolinhas.map((c) => <Linha key={c.chave} c={c} marcado={bol.includes(c.chave)} cheio={bol.length >= limites.bolinhas} aoAlternar={() => alternar(bol, setBol, c.chave, limites.bolinhas)} />)}
      </Secao>

      <Secao titulo="Boxes" sub="Os cartões em destaque na sua página." contagem={dest.length} limite={limites.boxes}>
        {destaques.length === 0 && <p className="text-[14px] text-text-secondary">Você não tem boxes em destaque.</p>}
        {destaques.map((c) => <Linha key={c.chave} c={c} marcado={dest.includes(c.chave)} cheio={dest.length >= limites.boxes} aoAlternar={() => alternar(dest, setDest, c.chave, limites.boxes)} />)}
      </Secao>

      {fotos.length > limites.fotos && (
        <Secao titulo="Fotos" sub="As fotos que ficam no seu banco de imagens. As páginas que já usam uma foto continuam com ela." contagem={fts.length} limite={limites.fotos}>
          <div className="grid grid-cols-4 gap-2">
            {fotos.map((f) => {
              const on = fts.includes(f.id);
              const travado = !on && fts.length >= limites.fotos;
              return (
                <button key={f.id} type="button" role="checkbox" aria-checked={on} aria-label="Manter esta foto" disabled={travado} onClick={() => alternar(fts, setFts, f.id, limites.fotos)} className={`relative aspect-square overflow-hidden rounded-2xl ring-2 ${on ? "ring-on-background" : "ring-transparent"} ${travado ? "opacity-40" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" className="h-full w-full object-cover" />
                  {on && <span className="absolute right-1 top-1"><Marcador marcado /></span>}
                </button>
              );
            })}
          </div>
        </Secao>
      )}

      <section className="mt-7 border-t border-divider pt-6">
        <h2 className="text-[18px] font-medium tracking-[-0.01em]">Fica desligado no grátis</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {FICA_DESLIGADO.map((t) => <span key={t} className="rounded-full bg-surface-soft px-3.5 py-1.5 text-[13.5px] text-text-secondary">{t}</span>)}
        </div>
        <p className="mt-3 text-[14px] leading-snug text-text-secondary">Sua página também mostra um selo pequeno do Orbibox no rodapé.</p>
      </section>

      {erro && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{erro}</p>}

      <button type="button" onClick={confirmar} disabled={salvando} className="mt-7 min-h-[54px] w-full rounded-full bg-on-background text-[16px] text-white active:scale-[0.99] disabled:opacity-60">
        {salvando ? "Salvando…" : desativados > 0 ? `Manter o grátis e desativar ${desativados}` : "Manter o grátis"}
      </button>
      <Link href="/admin/planos?fim=1" className="mt-3 flex min-h-[50px] w-full items-center justify-center rounded-full border border-divider bg-white text-[15px] text-on-background active:scale-[0.99]">
        Prefiro assinar e manter tudo
      </Link>
    </div>
  );
}
