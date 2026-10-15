"use client";

import { useLayoutEffect } from "react";

// Quando o painel está aberto dentro do editor no lugar (iframe), esconde o
// cabeçalho e os menus pra sobrar só o formulário.
export function EmbedMarker() {
  useLayoutEffect(() => {
    if (window.self !== window.top) document.documentElement.dataset.embed = "1";
  }, []);
  return null;
}
