/** Os três passos de "criar imagem no ChatGPT", em linha: número num
 * círculo, título curto e uma dica pequena embaixo. */
export function PassosPrompt({ anexo = "+ foto ou logo", destino = "a imagem pronta" }: { anexo?: string; destino?: string }) {
  const passos = [
    { t: "Copie", d: "o prompt" },
    { t: "Cole no ChatGPT", d: anexo },
    { t: "Envie aqui", d: destino },
  ];
  return (
    <ol className="mb-4 mt-6 grid grid-cols-3 gap-2">
      {passos.map((p, i) => (
        <li key={i} className="relative flex flex-col items-center text-center">
          {i > 0 && <span aria-hidden className="absolute right-1/2 top-[11px] h-px w-full bg-divider" />}
          <span className="relative z-[1] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-on-background text-[11px] font-medium text-white">{i + 1}</span>
          <span className="mt-2 whitespace-nowrap text-[12.5px] font-medium leading-tight text-on-background">{p.t}</span>
          <span className="mt-1 text-[11.5px] leading-snug text-text-tertiary">{p.d}</span>
        </li>
      ))}
    </ol>
  );
}
