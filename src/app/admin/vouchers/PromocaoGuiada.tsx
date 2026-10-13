"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";
import { VoucherQuadrado } from "@/components/mobile/VoucherQuadrado";
import { useTravarRolagem } from "@/hooks/useTravarRolagem";
import type { VoucherColor } from "@/lib/voucherThemes";
import type { Database } from "@/lib/supabase/types";
import { SeletorDesconto } from "./SeletorDesconto";
import { PrazoVoucher } from "./PrazoVoucher";
import { LinkDoVoucher } from "./LinkDoVoucher";

type Voucher = Database["public"]["Tables"]["vouchers"]["Row"];

export type ItemBase = { id: string; title: string; image_url: string | null };

export type RascunhoPromocao = {
  title: string;
  description: string;
  discountType: "percent" | "fixed" | "gift";
  discountValue: string;
  quantityTotal: string;
  expiresHours: string;
  imageUrl: string | null;
  badge: string;
  color: VoucherColor;
  mostrarDesconto: boolean;
};

const QUANTIDADES = ["10", "20", "50", "100"];

/**
 * Criar uma promoção em três passos curtos, uma pergunta por tela: o que a
 * pessoa ganha, quantas pessoas e por quanto tempo, e a conferência final.
 * Quando vem de uma sugestão da Orbi (um produto, uma data), já chega com o
 * produto e a foto escolhidos. No fim, oferece colocar a promoção em
 * destaque na página e divulgar o link, sem a pessoa precisar procurar nada.
 */
export function PromocaoGuiada({
  itemBase,
  campanha,
  businessId,
  linkBase,
  destaques,
  onPublicar,
  onPersonalizar,
  onFechar,
}: {
  itemBase: ItemBase | null;
  /** Nome da data comemorativa, quando a promoção nasce de uma campanha. */
  campanha?: string | null;
  businessId: string;
  /** Endereço público da página, ex: https://orbibox.../minha-loja */
  linkBase?: string;
  destaques: { t: string; id: string }[];
  onPublicar: (d: RascunhoPromocao) => Promise<Voucher | null>;
  onPersonalizar: (d: RascunhoPromocao) => void;
  onFechar: () => void;
}) {
  useTravarRolagem();
  const supabase = createClient();
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);
  const [tipo, setTipo] = useState<"percent" | "fixed" | "gift" | "">("");
  const [valor, setValor] = useState("");
  const [qtd, setQtd] = useState("20");
  const [prazo, setPrazo] = useState("168");
  const [tituloEditado, setTituloEditado] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(itemBase?.image_url ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [criado, setCriado] = useState<Voucher | null>(null);
  const [emDestaque, setEmDestaque] = useState(false);
  const [destacando, setDestacando] = useState(false);

  const sufixo = itemBase ? ` em ${itemBase.title}` : campanha ? ` na ${campanha}` : "";
  const tituloAuto =
    tipo === "percent" && valor ? `${valor}% de desconto${sufixo}`
    : tipo === "fixed" && valor ? `R$ ${valor} de desconto${sufixo}`
    : tipo === "gift" ? (itemBase ? `Brinde na compra de ${itemBase.title}` : campanha ? `Brinde de ${campanha}` : "")
    : "";
  const titulo = (tituloEditado ?? tituloAuto).slice(0, 60);

  function rascunho(): RascunhoPromocao {
    return {
      title: titulo.trim(),
      description: "",
      discountType: tipo === "" ? "percent" : tipo,
      discountValue: tipo === "gift" ? "0" : valor,
      quantityTotal: qtd,
      expiresHours: prazo,
      imageUrl: foto,
      badge: campanha ? campanha.slice(0, 24) : "",
      color: "cherry",
      mostrarDesconto: true,
    };
  }

  function avancar() {
    setErro(null);
    if (etapa === 1) {
      const n = Number(valor);
      if (!tipo) return setErro("Toque em uma das três opções para escolher o que a pessoa ganha.");
      if (tipo !== "gift" && !(n > 0)) return setErro(tipo === "percent" ? "Digite a porcentagem de desconto." : "Digite o valor do desconto em reais.");
      if (tipo === "percent" && n > 100) return setErro("A porcentagem vai de 1 a 100.");
      return setEtapa(2);
    }
    if (etapa === 2) {
      if (!(Number(qtd) >= 1)) return setErro("Digite quantas pessoas podem pegar. Pode ser um número pequeno, como 10.");
      return setEtapa(3);
    }
  }

  async function publicar() {
    if (publicando) return;
    setErro(null);
    if (!titulo.trim()) return setErro(tipo === "gift" ? "Escreva o nome do brinde, por exemplo: Sobremesa grátis." : "Dê um nome para a promoção.");
    setPublicando(true);
    const v = await onPublicar(rascunho());
    setPublicando(false);
    if (!v) return setErro("Não consegui publicar agora. Confira a internet e tente de novo.");
    setCriado(v);
    setEtapa(4);
  }

  async function destacar() {
    if (!criado || destacando) return;
    setDestacando(true);
    const lista = [...destaques.filter((d) => !(d.t === "voucher" && d.id === criado.id)), { t: "voucher", id: criado.id }];
    const res = await supabase.from("businesses").update({ home_destaques: lista }).eq("id", businessId);
    setDestacando(false);
    if (conferirSalvo(res)) setEmDestaque(true);
  }

  const rotulo = "text-[12.5px] font-semibold uppercase tracking-wide text-text-tertiary";
  const titulos: Record<number, { h: string; sub: string }> = {
    1: {
      h: itemBase ? `Uma promoção para ${itemBase.title}` : campanha ? `Uma promoção de ${campanha}` : "Vamos criar sua promoção",
      sub: "Uma promoção é um voucher: a pessoa toca no seu link, pega um código e vem até você. Primeiro, o que ela ganha?",
    },
    2: { h: "Quantas pessoas e por quanto tempo?", sub: "Poucas unidades dão urgência e a pessoa age mais rápido. Você pode mudar isso depois." },
    3: { h: "Confira e publique", sub: "É assim que vai aparecer na sua página. Se estiver bom, é só publicar." },
    4: { h: "Sua promoção está no ar", sub: "Agora é só chamar as pessoas. Escolha como." },
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex h-[100dvh] flex-col bg-background-main" role="dialog" aria-modal="true" aria-label="Criar promoção">
      {/* Topo: voltar, passo e fechar */}
      <div className="mx-auto flex w-full max-w-[440px] items-center gap-3 px-5 pt-4">
        {etapa > 1 && etapa < 4 ? (
          <button type="button" onClick={() => { setErro(null); setEtapa((e) => (e - 1) as 1 | 2 | 3); }} aria-label="Voltar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
          </button>
        ) : (
          <span className="h-10 w-10 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          {etapa < 4 && <p className="text-center text-[12.5px] font-medium text-text-tertiary">Passo {etapa} de 3</p>}
          <div className="mt-1.5 flex gap-1.5" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${etapa >= n ? "bg-on-background" : "bg-on-background/12"}`} />
            ))}
          </div>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[14px]">✕</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[440px] px-5 pb-6 pt-6">
          <h2 className="font-[family-name:var(--font-manrope)] text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">{titulos[etapa].h}</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-text-secondary">{titulos[etapa].sub}</p>

          {etapa === 1 && (
            <div className="mt-6 flex flex-col gap-4">
              {itemBase && (
                <div className="flex items-center gap-3 rounded-2xl bg-surface-white p-2.5 ring-1 ring-black/[0.06]">
                  {itemBase.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={itemBase.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="h-12 w-12 shrink-0 rounded-xl bg-surface-soft" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-medium uppercase tracking-wide text-text-tertiary">A Orbi sugeriu</span>
                    <span className="block truncate text-[15px] font-semibold">{itemBase.title}</span>
                  </span>
                </div>
              )}
              <SeletorDesconto tipo={tipo} valor={valor} idCampo="promocao-desconto" invalido={!!erro} onTipo={(t) => { setTipo(t); setErro(null); }} onValor={(v) => { setValor(v); setErro(null); }} />
            </div>
          )}

          {etapa === 2 && (
            <div className="mt-6 flex flex-col gap-6">
              <div>
                <p className={rotulo}>Quantas pessoas podem pegar</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUANTIDADES.map((q) => (
                    <button key={q} type="button" onClick={() => { setQtd(q); setErro(null); }} aria-pressed={qtd === q} className={`min-h-[44px] min-w-[64px] rounded-full px-4 text-[14px] font-medium ${qtd === q ? "bg-button-primary text-white" : "bg-surface-white text-text-secondary ring-1 ring-black/[0.08]"}`}>{q}</button>
                  ))}
                </div>
                <input value={qtd} onChange={(e) => { setQtd(e.target.value.replace(/\D/g, "")); setErro(null); }} inputMode="numeric" placeholder="Outro número" aria-label="Quantas pessoas podem pegar" className="mt-3 w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              </div>
              <div>
                <p className={rotulo}>Quanto tempo a pessoa tem para usar</p>
                <p className="mt-1 text-[12.5px] leading-snug text-text-tertiary">Conta a partir do momento em que ela pega o voucher.</p>
                <PrazoVoucher horas={prazo} onChange={setPrazo} />
              </div>
            </div>
          )}

          {etapa === 3 && (
            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col items-center rounded-[22px] bg-surface-soft px-4 py-5">
                <VoucherQuadrado
                  v={{
                    title: titulo.trim() || "Nome da promoção",
                    description: null,
                    color: "cherry",
                    image_url: foto,
                    badge: campanha ? campanha.slice(0, 24) : null,
                    discount_type: tipo === "" ? "percent" : tipo,
                    discount_value: Number(valor) || 0,
                    quantity_total: Number(qtd) || 1,
                    quantity_claimed: 0,
                    show_discount: true,
                  }}
                />
              </div>

              <div>
                <p className={rotulo}>{tipo === "gift" ? "Qual é o brinde?" : "Nome da promoção"}</p>
                <input value={titulo} onChange={(e) => { setTituloEditado(e.target.value); setErro(null); }} placeholder={tipo === "gift" ? "Ex: Sobremesa grátis" : "Ex: 10% na primeira compra"} maxLength={60} className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              </div>

              <details open={!foto} className="rounded-2xl bg-surface-white ring-1 ring-black/[0.06]">
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-4 text-[14px] font-medium">
                  <span>{foto ? "Trocar a foto" : "Adicionar uma foto"}</span>
                  <span className="text-[12.5px] text-text-tertiary">{foto ? "Foto escolhida" : "Recomendado"}</span>
                </summary>
                <div className="px-4 pb-4">
                  <p className="mb-2 text-[12.5px] leading-snug text-text-tertiary">Uma foto do produto ou do ambiente chama mais atenção. Pode enviar uma ou pedir para a Orbi criar.</p>
                  <ImageUpload value={foto} businessId={businessId} lockedRatio="quadrado" promptKind="capa" promptSubject={titulo || itemBase?.title || undefined} onChange={setFoto} />
                </div>
              </details>

              <button type="button" onClick={() => onPersonalizar(rascunho())} className="mx-auto min-h-[44px] px-3 text-[13.5px] text-text-secondary underline underline-offset-4">
                Quero mudar a cor, a etiqueta ou a descrição
              </button>
            </div>
          )}

          {etapa === 4 && criado && (
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex flex-col items-center rounded-[22px] bg-surface-soft px-4 py-5">
                <VoucherQuadrado v={{ title: criado.title, description: criado.description, color: criado.color, image_url: criado.image_url, badge: criado.badge, discount_type: criado.discount_type, discount_value: criado.discount_value, quantity_total: criado.quantity_total, quantity_claimed: 0, show_discount: criado.show_discount }} />
              </div>

              <button type="button" onClick={destacar} disabled={emDestaque || destacando} className={`min-h-[56px] w-full rounded-full text-[15px] font-medium transition-transform active:scale-[0.98] ${emDestaque ? "bg-[#EEF7F0] text-[#1F7A3D]" : "bg-on-background text-white disabled:opacity-60"}`}>
                {emDestaque ? "Em destaque na sua página ✓" : destacando ? "Colocando…" : "Colocar em destaque na minha página"}
              </button>
              <p className="-mt-1 text-center text-[12.5px] leading-snug text-text-tertiary">
                {emDestaque ? "Quem abrir seu link já vê esta promoção logo no começo." : "A promoção aparece no começo da sua página, onde todo mundo vê."}
              </p>

              {linkBase && <LinkDoVoucher url={`${linkBase}?v=${criado.id}`} titulo={criado.title} />}

              {linkBase && (
                <a href={linkBase} target="_blank" rel="noreferrer" className="mx-auto min-h-[44px] px-3 pt-2 text-[13.5px] text-text-secondary underline underline-offset-4">
                  Ver como ficou na minha página
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rodapé fixo: o botão principal sempre à vista */}
      <div className="border-t border-divider bg-background-main px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto w-full max-w-[440px]">
          {erro && <p role="alert" className="mb-2 text-[13.5px] leading-snug text-red-600">{erro}</p>}
          {etapa < 3 && (
            <button type="button" onClick={avancar} className="min-h-[54px] w-full rounded-full bg-button-primary text-[15px] font-medium text-white transition-transform active:scale-[0.98]">Continuar</button>
          )}
          {etapa === 3 && (
            <button type="button" onClick={publicar} disabled={publicando} className="min-h-[54px] w-full rounded-full bg-button-primary text-[15px] font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-50">
              {publicando ? "Publicando…" : "Publicar promoção"}
            </button>
          )}
          {etapa === 4 && (
            <button type="button" onClick={onFechar} className="min-h-[54px] w-full rounded-full bg-surface-soft text-[15px] font-medium transition-transform active:scale-[0.98]">Concluir</button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
