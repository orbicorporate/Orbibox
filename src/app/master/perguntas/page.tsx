import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Perguntas dos donos" };

// O que os donos perguntam à Orbi no Suporte e na Home do painel. Serve pra
// achar o que confunde no produto e o que falta explicar.
type Meta = { pergunta?: string; resposta?: string; fonte?: string };

export default async function PerguntasPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("funnel_events")
    .select("id, user_id, business_id, evento, meta, created_at")
    .in("evento", ["suporte_pergunta", "copiloto_pergunta"])
    .order("created_at", { ascending: false })
    .limit(300);
  const eventos = data ?? [];

  // Nome do negócio: pelo business_id, ou pelo dono (user_id) quando não veio.
  const ids = Array.from(new Set(eventos.map((e) => e.business_id).filter((v): v is string => !!v)));
  const donos = Array.from(new Set(eventos.filter((e) => !e.business_id).map((e) => e.user_id).filter((v): v is string => !!v)));
  const [{ data: porId }, { data: porDono }] = await Promise.all([
    ids.length ? supabase.from("businesses").select("id, name, slug").in("id", ids) : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
    donos.length ? supabase.from("businesses").select("owner_id, name, slug").in("owner_id", donos) : Promise.resolve({ data: [] as { owner_id: string; name: string; slug: string }[] }),
  ]);
  const nomeId = new Map((porId ?? []).map((b) => [b.id, b.name]));
  const nomeDono = new Map((porDono ?? []).map((b) => [b.owner_id, b.name]));

  // Palavras que mais aparecem nas perguntas, pra ver o padrão de dúvida.
  const PARADAS = new Set(["como", "que", "meu", "minha", "para", "pra", "uma", "com", "não", "nao", "por", "onde", "qual", "fazer", "faço", "faco", "coloco", "colocar", "isso", "esse", "essa", "dos", "das", "mais", "tem", "ter", "sobre", "ele", "ela", "eu", "o", "a", "de", "do", "da", "e", "no", "na", "um", "os", "as", "se", "em", "é"]);
  const contagem = new Map<string, number>();
  for (const e of eventos) {
    const p = ((e.meta ?? {}) as Meta).pergunta ?? "";
    for (const w of p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z]{4,}/g) ?? []) {
      if (!PARADAS.has(w)) contagem.set(w, (contagem.get(w) ?? 0) + 1);
    }
  }
  const temas = [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-semibold tracking-[-0.02em]">Perguntas dos donos</h1>
        <p className="mt-1 text-[14px] text-text-secondary">O que perguntam à Orbi no Suporte e na Home. Últimas {eventos.length}.</p>
      </div>

      {temas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {temas.map(([w, n]) => (
            <span key={w} className="rounded-full bg-white px-3 py-1.5 text-[13px] ring-1 ring-black/[0.08]">{w} <span className="text-text-tertiary">{n}</span></span>
          ))}
        </div>
      )}

      {eventos.length === 0 ? (
        <p className="text-[14px] text-text-tertiary">Ainda não há perguntas registradas.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {eventos.map((e) => {
            const m = (e.meta ?? {}) as Meta;
            const nome = (e.business_id && nomeId.get(e.business_id)) || (e.user_id && nomeDono.get(e.user_id)) || "Sem negócio";
            const onde = e.evento === "suporte_pergunta" ? "Suporte" : "Home";
            return (
              <li key={e.id} className="rounded-[18px] bg-white p-4 ring-1 ring-black/[0.08]">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-text-tertiary">
                  <span className="font-semibold text-on-background">{nome}</span>
                  <span className={`rounded-full px-2 py-0.5 font-medium ${onde === "Suporte" ? "bg-[#EEF1FB] text-[#3B5BDB]" : "bg-[#E9F8EF] text-[#1F9E4C]"}`}>{onde}</span>
                  {m.fonte === "erro" && <span className="rounded-full bg-[#FDECEE] px-2 py-0.5 font-medium text-[#E5484D]">Sem resposta</span>}
                  <span className="ml-auto">{new Date(e.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="mt-2 text-[15px] font-medium leading-snug">{m.pergunta || "(vazia)"}</p>
                {m.resposta && <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-text-secondary">{m.resposta}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
