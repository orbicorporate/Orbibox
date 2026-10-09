import Image from "next/image";
import { Reveal } from "./Reveal";
import { FOTOS_ESCRITORIO, LOCAL_ESCRITORIO } from "./escritorio";

/** Faixa pequena de confiança: o escritório e a equipe por trás do Orbibox. */
export function Escritorio() {
  const fotos = FOTOS_ESCRITORIO.slice(0, 6);
  if (fotos.length === 0) return null;
  return (
    <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-4">
      <Reveal>
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-[family-name:var(--font-manrope)] text-[22px] font-medium leading-tight tracking-[-0.01em] sm:text-[26px]">Feito por gente de verdade.</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-text-secondary">
            O Orbibox nasce na Nume{LOCAL_ESCRITORIO ? `, em ${LOCAL_ESCRITORIO}` : ""}. Se precisar, tem uma equipe do outro lado.
          </p>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {fotos.map((f, i) => (
            <div key={f.src} className={`relative aspect-[4/3] overflow-hidden rounded-[20px] bg-surface-soft ${fotos.length % 2 === 1 && i === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
              <Image src={f.src} alt={f.alt} fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover" />
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
