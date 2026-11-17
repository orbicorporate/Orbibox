"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { LogoRedonda } from "@/components/ui/LogoRedonda";
import { VoucherQRCode } from "@/components/mobile/VoucherQRCode";
import { voucherGradient, voucherTheme } from "@/lib/voucherThemes";
import { descontoGrande } from "@/lib/voucherDesconto";
import { rotuloJanela } from "@/lib/validadeVoucher";
import { ERROS_CONVITE, formatarCodigo, limparCodigo } from "@/lib/convites";

type VoucherInfo = {
  id: string; title: string; description: string | null; discount_type: string; discount_value: number; color: string;
  image_url: string | null; badge: string | null; show_discount: boolean; expires_hours: number | null;
  dias_semana: number[] | null; hora_inicio: string | null; hora_fim: string | null; verificacao: string;
};
type Negocio = { name: string; slug: string; logo_url: string | null };
type ConviteInfo = { estado: string; nome: string | null; mascara: string | null; pedeNumero: boolean; pedeCodigoWhatsapp: boolean; mesmoAparelho?: boolean };
type Pronto = { code: string; nome: string | null; expiresAt: string | null; vencido: boolean };
type Fase = "carregando" | "codigo" | "confirmar" | "otp" | "pronto" | "fim";

const CHAVE_DISP = "orbi_dispositivo";
const chaveCodigo = (id: string) => `orbi_convite_${id}`;

function dispositivo(): string {
  try {
    let d = localStorage.getItem(CHAVE_DISP);
    if (!d || d.length < 8) {
      d = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `d${Date.now()}${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(CHAVE_DISP, d);
    }
    return d;
  } catch {
    return `volatil-${Math.random().toString(36).slice(2)}${Date.now()}`;
  }
}

function montarPronto(r: Record<string, unknown>, nomePadrao: string | null): Pronto {
  const expiresAt = (r.expires_at as string | null) ?? null;
  return { code: String(r.code), nome: (r.nome as string | null) ?? nomePadrao, expiresAt, vencido: !!expiresAt && new Date(expiresAt).getTime() < Date.now() };
}

async function chamar(url: string, corpo: Record<string, unknown>) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  let j: Record<string, unknown> = {};
  try { j = await r.json(); } catch { /* resposta vazia */ }
  return { http: r.status, ...j } as Record<string, unknown> & { http: number };
}

function Icone({ d, tam = 18, cor = "currentColor" }: { d: string; tam?: number; cor?: string }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
const I = {
  cadeado: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z",
  alerta: "M12 9v4M12 17h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  check: "M5 13l4 4L19 7",
  copiar: "M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15V5a1 1 0 0 1 1-1h10",
  relogio: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  pessoa: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};

export function ConviteFlow({ voucherId, slug, nomeNegocio, logoUrl, codigoInicial }: { voucherId: string; slug: string; nomeNegocio: string; logoUrl: string | null; codigoInicial: string }) {
  const [fase, setFase] = useState<Fase>("carregando");
  const [voucher, setVoucher] = useState<VoucherInfo | null>(null);
  const [negocio, setNegocio] = useState<Negocio>({ name: nomeNegocio, slug, logo_url: logoUrl });
  const [codigo, setCodigo] = useState(formatarCodigo(codigoInicial));
  const [whats, setWhats] = useState("");
  const [otp, setOtp] = useState("");
  const [convite, setConvite] = useState<ConviteInfo | null>(null);
  const [pronto, setPronto] = useState<Pronto | null>(null);
  const [erro, setErro] = useState<{ chave: string; extra?: string } | null>(null);
  const [mascara, setMascara] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [espera, setEspera] = useState(0);
  const disp = useRef("");

  const tema = voucherTheme(voucher?.color);
  const cor = tema.ctaText;

  /** Decide o próximo passo a partir do que o servidor diz sobre o código. */
  const seguir = useCallback(async (cod: string, info: ConviteInfo | null, v: VoucherInfo | null) => {
    if (!info || info.estado === "invalido") { setErro({ chave: "codigo_invalido" }); setFase("codigo"); return; }
    if (info.estado === "usado") { setErro({ chave: "ja_usado" }); setFase("fim"); return; }
    if (info.estado === "cancelado") { setErro({ chave: "cancelado" }); setFase("fim"); return; }
    if (info.estado === "bloqueado") { setErro({ chave: "bloqueado" }); setFase("fim"); return; }
    setConvite(info);
    setMascara(info.mascara);
    if (info.estado === "ativado" && info.mesmoAparelho) {
      const r = await chamar("/api/convites/ativar", { voucherId, codigo: cod, dispositivo: disp.current });
      if (r.ok) {
        setPronto(montarPronto(r, info.nome));
        setFase("pronto");
        return;
      }
    }
    void v;
    setErro(null);
    setFase("confirmar");
  }, [voucherId]);

  const abrir = useCallback(async (cod: string) => {
    const r = await chamar("/api/convites/abrir", { voucherId, codigo: cod || undefined, dispositivo: disp.current });
    if (!r.ok) { setErro({ chave: String(r.erro ?? "indisponivel") }); setFase("fim"); return null; }
    const v = r.voucher as VoucherInfo;
    setVoucher(v);
    setNegocio(r.negocio as Negocio);
    return { v, info: (r.convite as ConviteInfo | null) ?? null };
  }, [voucherId]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      disp.current = dispositivo();
      let cod = limparCodigo(codigoInicial);
      if (cod.length < 8) { try { cod = limparCodigo(localStorage.getItem(chaveCodigo(voucherId)) ?? ""); } catch { /* sem storage */ } }
      const base = await abrir(cod.length === 8 ? cod : "");
      if (!vivo || !base) return;
      if (cod.length === 8) { setCodigo(formatarCodigo(cod)); await seguir(cod, base.info, base.v); }
      else setFase("codigo");
    })();
    return () => { vivo = false; };
  }, [abrir, seguir, codigoInicial, voucherId]);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function enviarCodigo(e: FormEvent) {
    e.preventDefault();
    const cod = limparCodigo(codigo);
    if (cod.length < 8 || ocupado) { setErro({ chave: "codigo_invalido" }); return; }
    setOcupado(true); setErro(null);
    const base = await abrir(cod);
    if (base) await seguir(cod, base.info, base.v);
    setOcupado(false);
  }

  async function liberar(e?: FormEvent, comOtp?: string) {
    e?.preventDefault();
    if (ocupado) return;
    const cod = limparCodigo(codigo);
    setOcupado(true); setErro(null);
    const r = await chamar("/api/convites/ativar", {
      voucherId, codigo: cod, whatsapp: whats || undefined, otp: comOtp, dispositivo: disp.current,
    });
    setOcupado(false);
    if (r.etapa === "codigo_enviado") { setMascara(String(r.mascara ?? "")); setOtp(""); setEspera(30); setFase("otp"); return; }
    if (r.ok) {
      try { localStorage.setItem(chaveCodigo(voucherId), cod); } catch { /* sem storage */ }
      setPronto(montarPronto(r, convite?.nome ?? null));
      setFase("pronto");
      return;
    }
    const chave = String(r.erro ?? "indisponivel");
    setErro({ chave, extra: typeof r.restantes === "number" ? `Restam ${r.restantes} ${r.restantes === 1 ? "tentativa" : "tentativas"}.` : undefined });
    if (["bloqueado", "ja_usado", "cancelado", "esgotado", "indisponivel"].includes(chave)) setFase("fim");
  }

  async function copiar(txt: string) {
    try { await navigator.clipboard.writeText(txt); setCopiado(true); setTimeout(() => setCopiado(false), 1800); } catch { /* sem clipboard */ }
  }

  const passo = fase === "codigo" || fase === "carregando" ? 1 : fase === "pronto" ? 3 : 2;
  const janela = voucher ? rotuloJanela(voucher) : null;
  const vencimento = pronto?.expiresAt ? new Date(pronto.expiresAt) : null;
    const msg = erro ? (ERROS_CONVITE[erro.chave] ?? ERROS_CONVITE.indisponivel) : null;

  const botao = "mt-4 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold text-white shadow-[0_10px_26px_-10px_rgba(0,0,0,0.5)] transition active:scale-[0.98] disabled:opacity-55 motion-reduce:transition-none";
  const campo = "mt-1.5 w-full rounded-2xl border-2 border-divider bg-white px-4 py-3.5 text-[18px] font-semibold outline-none transition-colors focus:border-[color:var(--cor)] focus-visible:ring-4 focus-visible:ring-[color:var(--cor-suave)]";
  const vars = { ["--cor" as string]: cor, ["--cor-suave" as string]: `${cor}26` } as React.CSSProperties;

  return (
    <main
      className="min-h-dvh px-4 pb-12 pt-6"
      style={{ ...vars, backgroundImage: `radial-gradient(120% 60% at 50% -10%, ${tema.via}30 0%, transparent 62%)` }}
    >
      <div className="mx-auto w-full max-w-[440px]">
        {/* Quem convida */}
        <header className="flex items-center gap-3">
          {negocio.logo_url ? <LogoRedonda src={negocio.logo_url} className="h-11 w-11" margem="p-1" /> : (
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[16px] font-semibold ring-1 ring-divider" aria-hidden>{negocio.name.charAt(0).toUpperCase()}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{negocio.name}</p>
            <p className="mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold" style={{ backgroundColor: `${cor}18`, color: cor }}>
              <Icone d={I.cadeado} tam={12} /> Convite exclusivo
            </p>
          </div>
        </header>

        <h1 className="mt-6 font-[family-name:var(--font-manrope)] text-[27px] font-semibold leading-[1.15] tracking-[-0.015em]">
          {fase === "pronto" ? (pronto?.nome ? `Pronto, ${pronto.nome}!` : "Seu voucher está liberado") : convite?.nome ? `Oi, ${convite.nome}! Seu convite chegou` : "Seu convite chegou"}
        </h1>
        <p className="mt-1.5 text-[14.5px] leading-snug text-text-secondary">
          {fase === "pronto" ? `Mostre o código abaixo em ${negocio.name}.` : "Este voucher é pessoal e vale uma vez só."}
        </p>

        {/* Etapas */}
        {fase !== "fim" && (
          <ol className="mt-5 flex items-center gap-2" aria-label="Etapas">
            {["Código", "Confirmar", "Voucher"].map((r, i) => {
              const n = i + 1; const feito = n < passo; const atual = n === passo;
              return (
                <li key={r} className="flex flex-1 items-center gap-2" aria-current={atual ? "step" : undefined}>
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-full text-[12px] font-bold" style={{ backgroundColor: feito || atual ? cor : "#E4E6EA", color: feito || atual ? "#fff" : "#6B7079" }}>
                    {feito ? <Icone d={I.check} tam={13} /> : n}
                  </span>
                  <span className={`text-[12.5px] ${atual ? "font-semibold" : "text-text-tertiary"}`}>{r}</span>
                  {n < 3 && <span className="h-px flex-1 bg-divider" aria-hidden />}
                </li>
              );
            })}
          </ol>
        )}

        {/* O voucher, para a pessoa saber o que está liberando */}
        {voucher && fase !== "fim" && (
          <section aria-label="Voucher" className="relative mt-5 overflow-hidden rounded-[28px] p-5 text-white shadow-[0_18px_40px_-16px_rgba(0,0,0,0.55)]" style={{ background: voucherGradient(voucher.color), boxShadow: `0 18px 40px -16px ${tema.glow}` }}>
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                {voucher.badge && <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">{voucher.badge}</span>}
                <p className="mt-2 text-[19px] font-semibold leading-tight">{voucher.title}</p>
                {voucher.show_discount !== false && <p className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-extrabold leading-none tracking-tight">{descontoGrande(voucher)}</p>}
                {voucher.description && <p className="mt-2.5 text-[13.5px] leading-snug text-white/85">{voucher.description}</p>}
              </div>
              {voucher.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={voucher.image_url} alt="" className="h-20 w-20 flex-none rounded-2xl object-cover ring-2 ring-white/30" />
              )}
            </div>
            {(janela || voucher.expires_hours) && fase !== "pronto" && (
              <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-white/85">
                <Icone d={I.relogio} tam={14} />
                {janela ?? ""}{janela && voucher.expires_hours ? " · " : ""}{voucher.expires_hours ? `vale por ${voucher.expires_hours >= 48 ? `${Math.round(voucher.expires_hours / 24)} dias` : `${voucher.expires_hours} horas`} depois de liberado` : ""}
              </p>
            )}
          </section>
        )}

        {/* Mensagem de erro, perto do campo */}
        {msg && (
          <div role="alert" className="mt-4 flex gap-3 rounded-2xl border border-[#F2B8B5] bg-[#FCE4E1] p-4 text-[#8C1D18]">
            <span className="mt-0.5 flex-none"><Icone d={I.alerta} tam={20} /></span>
            <div>
              <p className="text-[14.5px] font-semibold">{msg.titulo}</p>
              <p className="mt-0.5 text-[13.5px] leading-snug">{msg.texto}{erro?.extra ? ` ${erro.extra}` : ""}</p>
            </div>
          </div>
        )}

        {fase === "carregando" && (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-[14px] text-text-tertiary" role="status">
            <span className="h-5 w-5 rounded-full border-2 border-divider motion-safe:animate-spin" style={{ borderTopColor: cor }} aria-hidden /> Abrindo seu convite…
          </div>
        )}

        {fase === "codigo" && (
          <form onSubmit={enviarCodigo} className="mt-5 rounded-[28px] bg-surface-white p-5 shadow-[0_8px_30px_rgba(17,19,24,0.06)]">
            <label htmlFor="codigo" className="text-[14px] font-semibold">Código do convite</label>
            <p className="mt-0.5 text-[13px] text-text-secondary">Está na mensagem que você recebeu, com 8 letras e números.</p>
            <input
              id="codigo" value={codigo} onChange={(e) => { setCodigo(formatarCodigo(e.target.value)); setErro(null); }}
              inputMode="text" autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={9}
              placeholder="ABCD-EFGH" aria-invalid={!!erro} className={`${campo} text-center uppercase tracking-[0.18em]`}
            />
            <button type="submit" disabled={ocupado || limparCodigo(codigo).length < 8} className={botao} style={{ backgroundColor: cor }}>
              {ocupado ? "Conferindo…" : "Continuar"}
            </button>
          </form>
        )}

        {fase === "confirmar" && convite && (
          <form onSubmit={(e) => liberar(e)} className="mt-5 rounded-[28px] bg-surface-white p-5 shadow-[0_8px_30px_rgba(17,19,24,0.06)]">
            {convite.pedeNumero ? (
              <>
                <label htmlFor="whats" className="text-[14px] font-semibold">Seu WhatsApp</label>
                <p className="mt-0.5 text-[13px] text-text-secondary">Digite o número em que você recebeu o convite{convite.mascara ? `, ele termina em ${convite.mascara.slice(-4)}` : ""}.</p>
                <input
                  id="whats" value={whats} onChange={(e) => { setWhats(e.target.value.replace(/[^\d()+\s-]/g, "")); setErro(null); }}
                  inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" aria-invalid={!!erro} className={campo}
                />
                <button type="submit" disabled={ocupado || whats.replace(/\D/g, "").length < 10} className={botao} style={{ backgroundColor: cor }}>
                  {ocupado ? "Conferindo…" : "Liberar meu voucher"}
                </button>
              </>
            ) : convite.pedeCodigoWhatsapp ? (
              <>
                <p className="text-[14px] font-semibold">Vamos confirmar que é você</p>
                <p className="mt-0.5 text-[13px] text-text-secondary">Enviamos um código de 6 números para o WhatsApp {convite.mascara ?? "do convite"}.</p>
                <button type="submit" disabled={ocupado} className={botao} style={{ backgroundColor: cor }}>
                  {ocupado ? "Enviando…" : "Enviar código para o WhatsApp"}
                </button>
              </>
            ) : (
              <>
                <p className="text-[14px] font-semibold">{convite.nome ? `Tudo certo, ${convite.nome}.` : "Tudo certo com o seu código."}</p>
                <p className="mt-0.5 text-[13px] text-text-secondary">Ao liberar, o voucher fica neste aparelho. Mostre o código no atendimento.</p>
                <button type="submit" disabled={ocupado} className={botao} style={{ backgroundColor: cor }}>
                  {ocupado ? "Liberando…" : "Liberar meu voucher"}
                </button>
              </>
            )}
            <button type="button" onClick={() => { setFase("codigo"); setErro(null); }} className="mt-2 min-h-[44px] w-full text-[13.5px] font-medium text-text-secondary">Usar outro código</button>
          </form>
        )}

        {fase === "otp" && (
          <form onSubmit={(e) => liberar(e, otp)} className="mt-5 rounded-[28px] bg-surface-white p-5 shadow-[0_8px_30px_rgba(17,19,24,0.06)]">
            <label htmlFor="otp" className="text-[14px] font-semibold">Código que chegou no WhatsApp</label>
            <p className="mt-0.5 text-[13px] text-text-secondary">Enviamos 6 números para {mascara ?? "o número do convite"}.</p>
            <input
              id="otp" value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setErro(null); }}
              inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-invalid={!!erro} className={`${campo} text-center tracking-[0.4em]`}
            />
            <button type="submit" disabled={ocupado || otp.length < 6} className={botao} style={{ backgroundColor: cor }}>
              {ocupado ? "Conferindo…" : "Confirmar e liberar"}
            </button>
            <button type="button" disabled={espera > 0 || ocupado} onClick={() => liberar()} className="mt-2 min-h-[44px] w-full text-[13.5px] font-medium text-text-secondary disabled:opacity-50">
              {espera > 0 ? `Pedir outro código em ${espera}s` : "Não chegou? Enviar de novo"}
            </button>
          </form>
        )}

        {fase === "pronto" && pronto && (
          <section aria-label="Seu código" className="mt-5 rounded-[28px] bg-surface-white p-5 text-center shadow-[0_8px_30px_rgba(17,19,24,0.06)] motion-safe:animate-[convite-entra_0.45s_ease-out]">
            {pronto.vencido ? (
              <div role="alert" className="rounded-2xl bg-[#FCE4E1] p-4 text-[#8C1D18]">
                <p className="text-[15px] font-semibold">Este voucher venceu</p>
                <p className="mt-0.5 text-[13.5px]">Fale com {negocio.name} se achar que é um engano.</p>
              </div>
            ) : (
              <>
                <p className="text-[12.5px] font-semibold uppercase tracking-wide text-text-tertiary">Seu código</p>
                <p className="mt-1 font-[family-name:var(--font-manrope)] text-[42px] font-extrabold leading-none tracking-[0.14em]" style={{ color: cor }}>{pronto.code}</p>
                <button type="button" onClick={() => copiar(pronto.code)} className="mx-auto mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-[14px] font-semibold" style={{ backgroundColor: `${cor}16`, color: cor }}>
                  <Icone d={copiado ? I.check : I.copiar} tam={16} /> {copiado ? "Código copiado" : "Copiar código"}
                </button>
                <div className="mt-4"><VoucherQRCode code={pronto.code} size={176} /></div>
                {vencimento && (
                  <p className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] text-text-secondary">
                    <Icone d={I.relogio} tam={15} /> Vale até {vencimento.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                  </p>
                )}
                {janela && <p className="mt-1 text-[13px] text-text-secondary">{janela}</p>}
              </>
            )}
            <ul className="mt-5 space-y-2.5 text-left">
              {[
                [I.pessoa, "Leve um documento. O nome do convite é conferido no atendimento."],
                [I.cadeado, "O voucher é pessoal e vale uma vez só. Não adianta repassar."],
              ].map(([d, t]) => (
                <li key={t} className="flex gap-3 rounded-2xl bg-surface-soft p-3.5 text-[13.5px] leading-snug">
                  <span className="mt-0.5 flex-none" style={{ color: cor }}><Icone d={d} tam={18} /></span>{t}
                </li>
              ))}
            </ul>
            <a href={`/${negocio.slug}`} className="mt-4 inline-flex min-h-[44px] items-center text-[13.5px] font-medium text-text-secondary underline underline-offset-4">Conhecer {negocio.name}</a>
          </section>
        )}

        {fase === "fim" && (
          <Fim negocio={negocio}>
            {!msg && <p className="text-[14px] text-text-secondary">Este convite não está disponível.</p>}
          </Fim>
        )}

        <p className="mt-8 text-center text-[12px] text-text-tertiary">Convite enviado por {negocio.name} · Orbibox</p>
      </div>
    </main>
  );
}

function Fim({ negocio, children }: { negocio: Negocio; children?: ReactNode }) {
  return (
    <div className="mt-4 text-center">
      {children}
      <a href={`/${negocio.slug}`} className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-full border border-divider bg-white px-6 text-[14px] font-semibold">Conhecer {negocio.name}</a>
    </div>
  );
}
