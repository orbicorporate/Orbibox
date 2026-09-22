import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { GiftManager } from "./GiftManager";

export default async function GiftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);

  const [{ data: settings }, { data: gifts }] = await Promise.all([
    supabase.from("gift_settings").select("*").eq("business_id", businessId!).maybeSingle(),
    supabase.from("gift_cards").select("id, code, value_cents, from_name, to_name, message, status, created_at").eq("business_id", businessId!).order("created_at", { ascending: false }).limit(100),
  ]);

  const semGifts = (gifts ?? []).length === 0;

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">Gift Cards</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
        Seus clientes montam um vale-presente, combinam o pagamento com você no WhatsApp, e você libera. A arte fica bloqueada até você confirmar.
      </p>

      {semGifts && (
        <div className="mt-4 rounded-[22px] border border-divider bg-surface-white p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Como aproveitar</p>
          <div className="mt-3 flex flex-col gap-3">
            {[
              { n: "1", t: "Ative o box \"Presentear\" na sua Home", d: "É por ele que o cliente encontra a opção de montar um vale-presente." },
              { n: "2", t: "O cliente monta o gift sozinho", d: "Escolhe o valor, escreve a mensagem e diz pra quem é. Fica reservado, esperando você." },
              { n: "3", t: "Combina o pagamento no WhatsApp", d: "Ele te chama, vocês acertam a forma de pagar, e você libera aqui embaixo." },
              { n: "4", t: "Quem recebe usa como voucher", d: "A pessoa presenteada mostra o código na hora de comprar, você confirma o uso." },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[13px] font-semibold text-text-secondary">{s.n}</span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{s.t}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-text-secondary">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <GiftManager businessId={businessId!} initialSettings={settings ?? null} initialGifts={gifts ?? []} />
    </div>
  );
}
