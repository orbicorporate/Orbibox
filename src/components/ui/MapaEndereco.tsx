"use client";

import { consultaMapa } from "@/lib/enderecoMapa";
import { useContext, useState, useSyncExternalStore } from "react";
import { HorarioContext } from "./HorarioContext";
import { statusHorario } from "@/lib/horario";

// Muda a cada minuto, pra "Aberto agora" se manter certo. No servidor fica vazio.
const assinarMinuto = (cb: () => void) => { const t = setInterval(cb, 60000); return () => clearInterval(t); };
const minutoAtual = () => String(Math.floor(Date.now() / 60000));

/** Mapa do Google embutido com botão para ampliar e reduzir. Só carrega quando chega perto na tela. */
export function MapaEndereco({ endereco, className = "" }: { endereco: string; className?: string }) {
  const [grande, setGrande] = useState(true);
  const horario = useContext(HorarioContext);
  const minuto = useSyncExternalStore(assinarMinuto, minutoAtual, () => "");
  const st = horario && minuto ? statusHorario(horario) : null;
  return (
    <div className={className}>
    {st && (
      <p className="mb-2 flex items-center gap-2 text-[13px] font-medium">
        <span className={`h-2 w-2 rounded-full ${st.aberto ? "bg-[#1F9E4C]" : "bg-[#C4122F]"}`} aria-hidden />
        {st.texto}
      </p>
    )}
    <div className={`relative overflow-hidden rounded-[14px] bg-surface-soft transition-[height] duration-300 ${grande ? "h-[min(42vh,300px)]" : "h-[170px]"}`}>
      <iframe
        title={`Mapa: ${endereco}`}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(consultaMapa(endereco))}&z=17&t=h&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-full w-full border-0"
      />
      <button
        type="button"
        onClick={() => setGrande((v) => !v)}
        aria-label={grande ? "Reduzir mapa" : "Ampliar mapa"}
        className="absolute bottom-2 right-2 flex min-h-[40px] items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] shadow-[0_2px_10px_rgba(17,19,24,0.25)] active:scale-[0.97]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {grande ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
        </svg>
        {grande ? "Reduzir" : "Ampliar"}
      </button>
    </div>
    </div>
  );
}
