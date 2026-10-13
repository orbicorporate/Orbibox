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
import { IconePresente, IconeReais, IconePorcento, IconePessoas, IconeRelogio, IconeCalendario, IconeInfinito, IconeLapis, IconeCheck, IconeFechar, IconeVoltar, IconeFoto, IconeEstrela } from "./IconesLinha";
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
const PRAZOS = [
  { horas: "24", rotulo: "1 dia" },
  { horas: "48", rotulo: "2 dias" },
  { horas: "168", rotulo: "7 dias" },
  { horas: "720", rotulo: "30 dias" },
  { horas: "", rotulo: "Sem prazo" },
];
const OPCOES: { id: "gift" | "fixed" | "percent"; nome: string; sub: string; icone: React.ReactNode }[] = [
  { id: "percent", nome: "Porcentagem", sub: "Ex: 10% de desconto", icone: <IconePorcento size={24} /> },
  { id: "fixed", nome: "Valor em reais", sub: "Ex: R$ 15 de desconto", icone: <IconeReais size={24} /> },
  { id: "gift", nome: "Brinde", sub: "Ex: sobremesa grátis", icone: <IconePresente size={24} /> },
];

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
  const [prazoOutro, setPrazoOutro] = useState(false);
  const [prazoDias, setPrazoDias] = useState("");
  const [tituloEditado, setTituloEditado] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [foto, setFoto] = useState<string | null>(itemBase?.image_url ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);
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
      description: descricao.trim(),
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
      return setEtapa(revisando ? 3 : 2);
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
    let v: Voucher | null;
    if (criado) {
      const d = rascunho();
      const res = await supabase.from("vouchers").update({
        title: d.title,
        description: d.description || null,
        discount_type: d.discountType,
        discount_value: d.discountType === "gift" ? 0 : Number(d.discountValue),
        quantity_total: Number(d.quantityTotal),
        expires_hours: d.expiresHours.trim() ? Number(d.expiresHours) : null,
        image_url: d.imageUrl,
      }).eq("id", criado.id).select().single();
      v = conferirSalvo(res) ? (res.data as Voucher) : null;
    } else {
      v = await onPublicar(rascunho());
    }
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
    3: { h: criado ? "Editar sua promoção" : "Confira e publique", sub: criado ? "Mude o que quiser. Ao salvar, a promoção no ar já é atualizada." : "É assim que vai aparecer na sua página. Se estiver bom, é só publicar." },
    4: { h: "Sua promoção está no ar", sub: "Agora é só chamar as pessoas. Escolha como." },
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex h-[100dvh] flex-col bg-background-main" role="dialog" aria-modal="true" aria-label="Criar promoção">
      {/* Topo: voltar, passo e fechar */}
      <div className="mx-auto flex w-full max-w-[440px] items-center gap-3 px-5 pt-4">
        {etapa > 1 && (etapa < 4 || false) ? (
          <button type="button" onClick={() => { setErro(null); setEtapa((e) => (criado && e === 3 ? 4 : (e - 1) as 1 | 2 | 3 | 4)); }} aria-label="Voltar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft">
            <IconeVoltar size={18} />
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
        <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft"><IconeFechar size={18} /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[440px] px-5 pb-6 pt-6">
          <h2 className="font-[family-name:var(--font-manrope)] text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">{titulos[etapa].h}</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-text-secondary">{titulos[etapa].sub}</p>

          {etapa === 1 && (
            <div className="mt-6 flex flex-col gap-4">
              {itemBase && (
                <div className="flex items-center gap-3 rounded-[22px] bg-surface-white p-3 ring-1 ring-black/[0.06]">
                  {itemBase.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={itemBase.image_url} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-soft text-text-tertiary"><IconeFoto size={22} /></span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[11.5px] font-medium uppercase tracking-wide text-text-tertiary"><IconeEstrela size={13} /> A Orbi sugeriu</span>
                    <span className="mt-0.5 block truncate text-[17px] font-semibold">{itemBase.title}</span>
                  </span>
                </div>
              )}

              <div role="radiogroup" aria-label="O que a pessoa ganha" className="flex flex-col gap-2.5">
                {OPCOES.map((o) => {
                  const on = tipo === o.id;
                  return (
                    <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => { setTipo(o.id); setErro(null); }}
                      className={`flex min-h-[84px] items-center gap-4 rounded-[24px] px-5 text-left transition-colors active:scale-[0.99] ${on ? "bg-on-background text-white" : "bg-surface-white ring-1 ring-black/[0.07]"}`}>
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${on ? "bg-white/15" : "bg-surface-soft"}`}>{o.icone}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[17px] font-semibold leading-tight">{o.nome}</span>
                        <span className={`mt-0.5 block text-[13.5px] leading-snug ${on ? "text-white/70" : "text-text-tertiary"}`}>{o.sub}</span>
                      </span>
                      {on && <IconeCheck size={22} />}
                    </button>
                  );
                })}
              </div>

              {tipo !== "" && tipo !== "gift" && (
                <div className="acao-entra">
                  <label htmlFor="promocao-desconto" className={rotulo}>{tipo === "percent" ? "Quantos por cento" : "Quantos reais"}</label>
                  <div className="mt-2 flex items-center gap-3 rounded-[24px] bg-surface-white px-5 py-4 ring-1 ring-black/[0.07] focus-within:ring-2 focus-within:ring-on-background">
                    {tipo === "fixed" && <span className="text-[26px] font-medium text-text-tertiary">R$</span>}
                    <input id="promocao-desconto" value={valor} onChange={(e) => { setValor(e.target.value.replace(/[^\d.,]/g, "")); setErro(null); }} inputMode="decimal" placeholder={tipo === "percent" ? "10" : "15"} autoFocus className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-manrope)] text-[34px] font-semibold outline-none placeholder:text-text-tertiary/50" />
                    {tipo === "percent" && <span className="text-[26px] font-medium text-text-tertiary">%</span>}
                  </div>
                  <p className="mt-2 text-[13px] text-text-tertiary">No cartão aparece: <span className="font-semibold text-on-background">{tipo === "percent" ? `${valor || "10"}% OFF` : `R$ ${valor || "15"} OFF`}</span></p>
                </div>
              )}
              {tipo === "gift" && <p className="acao-entra rounded-[20px] bg-surface-soft px-4 py-3.5 text-[14px] leading-relaxed text-text-secondary">Você escreve qual é o brinde no último passo, antes de publicar.</p>}
            </div>
          )}

          {etapa === 2 && (
            <div className="mt-6 flex flex-col gap-7">
              <div>
                <p className={`${rotulo} flex items-center gap-2`}><IconePessoas size={16} /> Quantas pessoas podem pegar</p>
                <div className="mt-3 grid grid-cols-4 gap-2.5">
                  {QUANTIDADES.map((q) => (
                    <button key={q} type="button" onClick={() => { setQtd(q); setErro(null); }} aria-pressed={qtd === q} className={`min-h-[64px] rounded-[20px] font-[family-name:var(--font-manrope)] text-[20px] font-semibold transition-colors active:scale-[0.98] ${qtd === q ? "bg-on-background text-white" : "bg-surface-white ring-1 ring-black/[0.07]"}`}>{q}</button>
                  ))}
                </div>
                <input value={qtd} onChange={(e) => { setQtd(e.target.value.replace(/\D/g, "")); setErro(null); }} inputMode="numeric" placeholder="Outro número" aria-label="Quantas pessoas podem pegar" className="mt-2.5 w-full rounded-[20px] bg-surface-white px-5 py-4 text-[16px] outline-none ring-1 ring-black/[0.07] focus:ring-2 focus:ring-on-background" />
              </div>

              <div>
                <p className={`${rotulo} flex items-center gap-2`}><IconeRelogio size={16} /> Quanto tempo para usar</p>
                <p className="mt-1.5 text-[13px] leading-snug text-text-tertiary">Conta a partir do momento em que a pessoa pega o voucher.</p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {PRAZOS.map((o) => {
                    const on = !prazoOutro && prazo === o.horas;
                    return (
                      <button key={o.rotulo} type="button" onClick={() => { setPrazoOutro(false); setPrazo(o.horas); }} aria-pressed={on} className={`flex min-h-[64px] items-center gap-3 rounded-[20px] px-4 text-left text-[15px] font-medium transition-colors active:scale-[0.98] ${on ? "bg-on-background text-white" : "bg-surface-white ring-1 ring-black/[0.07]"}`}>
                        {o.horas === "" ? <IconeInfinito size={20} /> : <IconeCalendario size={20} />}
                        {o.rotulo}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setPrazoOutro(true)} aria-pressed={prazoOutro} className={`col-span-2 flex min-h-[64px] items-center gap-3 rounded-[20px] px-4 text-left text-[15px] font-medium transition-colors active:scale-[0.98] ${prazoOutro ? "bg-on-background text-white" : "bg-surface-white ring-1 ring-black/[0.07]"}`}>
                    <IconeLapis size={20} /> Outro prazo
                  </button>
                </div>
                {prazoOutro && (
                  <div className="acao-entra mt-2.5 flex items-center gap-3 rounded-[20px] bg-surface-white px-5 py-3.5 ring-1 ring-black/[0.07] focus-within:ring-2 focus-within:ring-on-background">
                    <input value={prazoDias} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); setPrazoDias(d); setPrazo(d ? String(Number(d) * 24) : ""); }} inputMode="numeric" placeholder="Quantos dias" aria-label="Quantos dias" autoFocus className="min-w-0 flex-1 bg-transparent text-[18px] font-semibold outline-none" />
                    <span className="text-[14px] text-text-tertiary">dias</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {etapa === 3 && (
            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col items-center rounded-[22px] bg-surface-soft px-4 py-5">
                <VoucherQuadrado
                  v={{
                    title: titulo.trim() || "Nome da promoção",
                    description: descricao.trim() || null,
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

              <div>
                <p className={rotulo}>Texto do voucher (opcional)</p>
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} maxLength={140} placeholder="Ex: Válido de segunda a quinta, no almoço" className="mt-1.5 w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => { setRevisando(true); setEtapa(1); }} className="flex min-h-[64px] items-center gap-3 rounded-[20px] bg-surface-white px-4 text-left ring-1 ring-black/[0.07] active:scale-[0.98]">
                  <IconeLapis size={18} />
                  <span className="min-w-0"><span className="block text-[12px] text-text-tertiary">Desconto</span><span className="block truncate text-[14.5px] font-semibold">{tipo === "percent" ? `${valor}%` : tipo === "fixed" ? `R$ ${valor}` : "Brinde"}</span></span>
                </button>
                <button type="button" onClick={() => { setRevisando(true); setEtapa(2); }} className="flex min-h-[64px] items-center gap-3 rounded-[20px] bg-surface-white px-4 text-left ring-1 ring-black/[0.07] active:scale-[0.98]">
                  <IconeLapis size={18} />
                  <span className="min-w-0"><span className="block text-[12px] text-text-tertiary">Vagas e prazo</span><span className="block truncate text-[14.5px] font-semibold">{qtd} · {prazo === "" ? "sem prazo" : Number(prazo) % 24 === 0 ? `${Number(prazo) / 24} d` : `${prazo} h`}</span></span>
                </button>
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

              <button type="button" onClick={destacar} disabled={emDestaque || destacando} className={`flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium transition-transform active:scale-[0.98] ${emDestaque ? "bg-[#EEF7F0] text-[#1F7A3D]" : "bg-on-background text-white disabled:opacity-60"}`}>
                {emDestaque ? <><IconeCheck size={18} /> Em destaque na sua página</> : destacando ? "Colocando…" : "Colocar em destaque na minha página"}
              </button>
              <p className="-mt-1 text-center text-[12.5px] leading-snug text-text-tertiary">
                {emDestaque ? "Quem abrir seu link já vê esta promoção logo no começo." : "A promoção aparece no começo da sua página, onde todo mundo vê."}
              </p>

              <button type="button" onClick={() => { setErro(null); setEtapa(3); }} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-surface-white text-[15px] font-medium ring-1 ring-black/[0.08] active:scale-[0.98]">
                <IconeLapis size={18} /> Editar texto, valor ou foto
              </button>

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
              {publicando ? (criado ? "Salvando…" : "Publicando…") : criado ? "Salvar alterações" : "Publicar promoção"}
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
