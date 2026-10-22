"use client";

import { useEffect, useState } from "react";
import { AjusteFoto } from "./AjusteFoto";

/**
 * Para telas que enviam a foto direto, sem recorte: depois de escolher o arquivo,
 * abre o editor (luz, contraste, sombras, realces, cor...). "Usar sem ajustar"
 * segue com a foto original, então não atrapalha quem tem pressa.
 */
export function AjusteAntesDeEnviar({
  arquivo, onEnviar, onCancelar, camada,
}: {
  arquivo: File;
  onEnviar: (arquivo: File) => void;
  onCancelar: () => void;
  camada?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(arquivo);
    // Cria o endereço temporário ao receber o arquivo e o libera ao sair.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);

  if (!url) return null;
  return <AjusteFoto url={url} camada={camada} onFechar={onCancelar} onPular={() => onEnviar(arquivo)} onAplicar={onEnviar} />;
}
