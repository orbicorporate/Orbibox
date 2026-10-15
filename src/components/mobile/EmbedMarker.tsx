"use client";

import { useLayoutEffect } from "react";

// Quando o painel está aberto dentro do editor no lugar (iframe), esconde o
// cabeçalho e os menus pra sobrar só o formulário. Com ?foco=<id>, esconde
// também tudo na tela que não seja aquela parte, pra abrir direto no que o
// dono tocou (o banner, o título, um botão...).
export function EmbedMarker() {
  useLayoutEffect(() => {
    if (window.self === window.top) return;
    document.documentElement.dataset.embed = "1";
    const foco = new URLSearchParams(window.location.search).get("foco");
    if (!foco) return;
    const main = document.querySelector("main");
    if (!main) return;

    function aplicar() {
      const alvo = document.getElementById(foco!);
      if (!alvo || !main) return;
      let no: HTMLElement | null = alvo;
      while (no && no !== main) {
        const pai: HTMLElement | null = no.parentElement;
        if (!pai) break;
        for (const irmao of Array.from(pai.children) as HTMLElement[]) {
          if (irmao === no || irmao.classList.contains("embed-save")) continue;
          if (irmao.dataset.embedOculto !== "1") irmao.dataset.embedOculto = "1";
        }
        no = pai;
      }
    }

    aplicar();
    // A tela monta aos poucos (e o card pode abrir depois de um toque): reaplica por alguns segundos.
    const obs = new MutationObserver(aplicar);
    obs.observe(main, { childList: true, subtree: true });
    const t = window.setTimeout(() => obs.disconnect(), 4000);
    return () => {
      obs.disconnect();
      window.clearTimeout(t);
    };
  }, []);
  return null;
}
