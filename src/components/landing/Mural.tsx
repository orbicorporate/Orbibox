import { TEMAS_LANDING, type InspireLanding } from "./temas";

/** Duas fileiras de vitrines passando em sentidos opostos, com fotos reais. */
export function Mural({ inspire }: { inspire: InspireLanding }) {
  const cards = TEMAS_LANDING.flatMap((t) =>
    (inspire[t.id]?.photos ?? []).filter((p) => p.url).slice(0, 5).map((p) => ({ url: p.url, titulo: p.title || t.fotos, chip: t.chip })),
  );
  if (cards.length < 6) return null;
  const meio = Math.ceil(cards.length / 2);
  const fileiras = [cards.slice(0, meio), cards.slice(meio)];
  return (
    <div className="relative space-y-4 overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      {fileiras.map((f, n) => (
        <div key={n} className="group flex w-max gap-4" style={{ animation: `lpMarquee ${70 + n * 14}s linear infinite ${n ? "reverse" : "normal"}` }}>
          {[...f, ...f].map((c, k) => (
            <figure key={k} className="relative h-[210px] w-[160px] shrink-0 overflow-hidden rounded-[22px] bg-surface-soft shadow-[0_10px_30px_-14px_rgba(17,19,24,0.35)] motion-reduce:transition-none sm:h-[250px] sm:w-[190px]" aria-hidden={k >= f.length}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.url} alt={k < f.length ? c.titulo : ""} loading="lazy" className="h-full w-full object-cover" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10 text-white">
                <span className="block text-[10px] uppercase tracking-[0.14em] text-white/70">{c.chip}</span>
                <span className="block truncate text-[13px]">{c.titulo}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      ))}
    </div>
  );
}
