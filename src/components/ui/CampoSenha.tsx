"use client";

import { useState, type InputHTMLAttributes } from "react";

/** Campo de senha com botão de olho para mostrar ou esconder o que foi digitado. */
export function CampoSenha({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={ver ? "text" : "password"} className={`${className} w-full`} style={{ paddingRight: 48 }} />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={ver}
        className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-text-secondary active:scale-95"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {ver && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}
