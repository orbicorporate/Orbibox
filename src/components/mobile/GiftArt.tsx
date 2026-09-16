"use client";

/**
 * A arte do gift card. Quando "liberado" (pago), aparece limpa e colorida,
 * pronta pra presentear. Quando "bloqueado" (ainda não pago), leva uma
 * marca d'água por cima, pra ninguém usar um gift que não foi acertado
 * com a loja.
 *
 * O fundo é a arte que a loja subiu (art_url). Sem arte, cai num degradê
 * bonito padrão, pra funcionar mesmo antes de a loja configurar.
 */
export function GiftArt({
  valorCents,
  paraQuem,
  deQuem,
  mensagem,
  negocio,
  codigo,
  artUrl,
  bloqueado,
}: {
  valorCents: number;
  paraQuem?: string | null;
  deQuem?: string | null;
  mensagem?: string | null;
  negocio: string;
  codigo: string;
  artUrl?: string | null;
  bloqueado: boolean;
}) {
  const valor = (valorCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="relative aspect-[1.6/1] w-full overflow-hidden rounded-[22px] text-white shadow-[0_12px_36px_rgba(17,19,24,0.2)]">
      {/* Fundo: arte da loja ou degradê padrão */}
      {artUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #6D28D9 0%, #B0309E 50%, #C2650A 100%)" }} />
      )}
      {/* Véu escuro pra o texto ficar legível sobre qualquer arte */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.5) 100%)" }} />

      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm">Gift Card</span>
          <span className="text-[11px] font-medium opacity-90">{negocio}</span>
        </div>

        <div>
          {paraQuem && <p className="text-[12px] opacity-85">Para {paraQuem}</p>}
          <p className="font-[family-name:var(--font-manrope)] text-[38px] font-bold leading-none tracking-[-0.02em]">{valor}</p>
          {mensagem && <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug opacity-90">&ldquo;{mensagem}&rdquo;</p>}
          <div className="mt-2 flex items-center justify-between">
            {deQuem && <p className="text-[11.5px] opacity-85">de {deQuem}</p>}
            <p className="ml-auto font-mono text-[11px] tracking-wider opacity-75">{codigo}</p>
          </div>
        </div>
      </div>

      {/* Marca d'água de bloqueado: faixas + carimbo. Some quando liberado. */}
      {bloqueado && (
        <>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 2px, transparent 2px, transparent 14px)" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="-rotate-[14deg] rounded-xl border-2 border-white/70 bg-black/25 px-4 py-1.5 text-[13px] font-bold uppercase tracking-[0.15em] backdrop-blur-[1px]">
              A liberar
            </span>
          </div>
        </>
      )}
    </div>
  );
}
