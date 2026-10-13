"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { VoucherQuadrado } from "@/components/mobile/VoucherQuadrado";
import { useTravarRolagem } from "@/hooks/useTravarRolagem";
import { OrbiWorking } from "@/components/orbi/OrbiWorking";
import type { CampanhaData } from "@/app/api/campanha-data/route";

/**
 * Folha com a campanha pronta de uma data comemorativa: o voucher com a
 * cara da data (ativa num toque) e os textos pra divulgar (copia num toque).
 */
export function CampanhaDataSheet({
  businessId,
  data,
  hasVouchers,
  onClose,
  onAtivada,
}: {
  businessId: string;
  data: { nome: string; dias: number; clima: string };
  hasVouchers: boolean;
  onClose: () => void;
  onAtivada?: () => void;
}) {
  useTravarRolagem();
  const supabase = createClient();
  const [foto, setFoto] = useState<string | null>(null);
  const [anteriores, setAnteriores] = useState<string[]>([]);
  const [campanha, setCampanha] = useState<CampanhaData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ativando, setAtivando] = useState(false);
  const [ativado, setAtivado] = useState(false);
  const [copiado, setCopiado] = useState<number | null>(null);

  function gerar() {
    setErro(null);
    const ant = campanha ? [...anteriores, campanha.voucher.titulo] : anteriores;
    setAnteriores(ant);
    setCampanha(null);
    buscar(ant);
  }

  async function buscar(ant: string[] = []) {
    try {
      const res = await fetch("/api/campanha-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, dataNome: data.nome, dias: data.dias, clima: data.clima, anteriores: ant }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCampanha(json);
      setFoto((json as CampanhaData).foto ?? null);
    } catch {
      setErro("Não consegui montar agora. Tenta de novo.");
    }
  }

  useEffect(() => {
    buscar();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ativar() {
    if (!campanha || ativando) return;
    setAtivando(true);
    const v = campanha.voucher;
    const { error } = await supabase.from("vouchers").insert({
      business_id: businessId,
      title: v.titulo,
      description: v.descricao,
      discount_type: v.tipo,
      discount_value: v.valor,
      quantity_total: v.quantidade,
      expires_hours: 72,
      badge: v.selo,
      color: "cherry",
      image_url: foto,
    });
    setAtivando(false);
    if (error) { setErro("Não consegui ativar o voucher. Tenta de novo."); return; }
    setAtivado(true);
    onAtivada?.();
  }

  async function copiar(i: number, texto: string) {
    try { await navigator.clipboard.writeText(texto); setCopiado(i); setTimeout(() => setCopiado(null), 1800); } catch { /* sem clipboard */ }
  }

  const oferta = campanha ? (campanha.voucher.tipo === "percent" ? `${campanha.voucher.valor}% OFF` : `R$ ${campanha.voucher.valor} OFF`) : "";

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={`Campanha de ${data.nome}`}>
      <button type="button" aria-label="Fechar" onClick={onClose} className="veu-entra absolute inset-0 bg-black/40" />
      <div className="folha-sobe relative max-h-[90dvh] w-full overscroll-contain max-w-[440px] overflow-y-auto rounded-t-[28px] bg-background-main px-6 pb-10 pt-3">
        <span className="mx-auto mb-5 block h-1.5 w-11 rounded-full bg-on-background/15" aria-hidden />

        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-text-tertiary">{data.nome} · {data.dias === 0 ? "hoje" : data.dias === 1 ? "amanhã" : `em ${data.dias} dias`}</p>
        <h2 className="mt-2 font-[family-name:var(--font-manrope)] text-[24px] font-semibold leading-tight tracking-[-0.02em]">Sua campanha está pronta</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">A Orbi montou um voucher e os textos de divulgação com a cara do seu negócio. É só conferir.</p>

        {!campanha && !erro && (
          <div className="mt-8 rounded-[22px] bg-surface-white p-5">
            <OrbiWorking label={`Montando sua campanha de ${data.nome}…`} />
            <div className="mt-3 h-[150px] animate-pulse rounded-[18px] bg-surface-soft" />
          </div>
        )}

        {erro && (
          <div className="mt-6 rounded-[20px] bg-[#FBEBE8] p-5 text-center">
            <p className="text-[14px] text-[#B0463C]">{erro}</p>
            <button type="button" onClick={gerar} className="mt-3 min-h-[44px] rounded-full bg-on-background px-5 text-[14px] font-medium text-white">Tentar de novo</button>
          </div>
        )}

        {campanha && (
          <div className="acao-entra">
            {/* Voucher */}
            <p className="mt-7 text-[12px] font-medium uppercase tracking-[0.14em] text-text-tertiary">Voucher</p>
            <div className="mt-2.5 flex flex-col items-center rounded-[22px] bg-surface-soft px-4 py-5">
              <VoucherQuadrado
                v={{
                  title: campanha.voucher.titulo,
                  description: campanha.voucher.descricao,
                  color: "cherry",
                  image_url: foto,
                  badge: campanha.voucher.selo,
                  discount_type: campanha.voucher.tipo,
                  discount_value: campanha.voucher.valor,
                  quantity_total: campanha.voucher.quantidade,
                  quantity_claimed: 0,
                  show_discount: true,
                }}
              />
              <p className="mt-3 text-[12px] text-text-tertiary">{campanha.voucher.quantidade} unidades · vale 72h depois de pego</p>
            </div>

            {!ativado && (
              <details className="mt-3 rounded-[18px] bg-surface-white ring-1 ring-black/[0.06]">
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-4 text-[14px] font-medium">
                  <span>{foto ? "Trocar a foto" : "Adicionar uma foto"}</span>
                  <span className="text-[12.5px] text-text-tertiary">{campanha.fotoDe ? `Foto de ${campanha.fotoDe}` : foto ? "Foto escolhida" : "Recomendado"}</span>
                </summary>
                <div className="px-4 pb-4">
                  <ImageUpload value={foto} businessId={businessId} lockedRatio="quadrado" promptKind="capa" promptSubject={campanha.voucher.titulo} onChange={setFoto} />
                </div>
              </details>
            )}

            {ativado ? (
              <div className="acao-entra mt-3 flex items-center gap-3 rounded-[18px] bg-[#EEF7F0] px-4 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F9E4C]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
                <p className="min-w-0 flex-1 text-[14px] font-medium">Voucher no ar na sua página</p>
                <Link href="/admin/vouchers" className="shrink-0 text-[13px] font-medium underline underline-offset-4">Ver</Link>
              </div>
            ) : hasVouchers ? (
              <button type="button" onClick={ativar} disabled={ativando} className="mt-3 min-h-[52px] w-full rounded-full bg-on-background text-[15px] font-medium text-white transition-transform active:scale-[.98] disabled:opacity-50">
                {ativando ? "Ativando…" : "Ativar voucher"}
              </button>
            ) : (
              <Link href="/admin/planos" className="mt-3 flex min-h-[52px] w-full items-center justify-center rounded-full bg-on-background text-[15px] font-medium text-white">
                Vouchers são do Nióbio. Conhecer
              </Link>
            )}

            {/* Posts */}
            <p className="mt-8 text-[12px] font-medium uppercase tracking-[0.14em] text-text-tertiary">Pra divulgar</p>
            <div className="mt-2.5 flex flex-col gap-3">
              {campanha.posts.map((p, i) => (
                <div key={i} className="rounded-[20px] bg-surface-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-medium text-text-secondary">{p.canal}</p>
                    <button type="button" onClick={() => copiar(i, p.texto)} className="min-h-[36px] shrink-0 rounded-full bg-surface-soft px-3.5 text-[12.5px] font-medium" aria-live="polite">
                      {copiado === i ? "Copiado ✓" : "Copiar"}
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed">{p.texto}</p>
                </div>
              ))}
            </div>

            {campanha.ideia && (
              <div className="mt-3 rounded-[20px] border border-dashed border-divider px-4 py-3.5">
                <p className="text-[12px] font-medium text-text-tertiary">Ideia pro balcão</p>
                <p className="mt-1 text-[14px] leading-relaxed text-text-secondary">{campanha.ideia}</p>
              </div>
            )}

            <p className="mt-8 text-[12px] font-medium uppercase tracking-[0.14em] text-text-tertiary">Não gostou?</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button type="button" onClick={gerar} className="min-h-[48px] rounded-full bg-surface-white text-[14px] font-medium ring-1 ring-black/[0.08] active:scale-[.98]">Nova sugestão</button>
              <Link href={`/admin/vouchers?novo=1&campanha=${encodeURIComponent(data.nome)}`} className="flex min-h-[48px] items-center justify-center rounded-full bg-surface-white text-[14px] font-medium ring-1 ring-black/[0.08] active:scale-[.98]">Criar a minha</Link>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
