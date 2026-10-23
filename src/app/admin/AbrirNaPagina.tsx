"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * App instalado: ao abrir de novo (abertura do zero), leva o dono para a
 * própria página, como visitante. Depois disso o painel abre normalmente, e
 * só sai dele de novo numa próxima abertura do app. Fora do app instalado
 * (navegador no computador, por exemplo) não faz nada.
 */
export function AbrirNaPagina() {
  const router = useRouter();
  useEffect(() => {
    try {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!standalone) return;
      if (sessionStorage.getItem("orbibox_abriu") === "1") return;
      // Dono novo: o primeiro popup de divulgação aparece aqui no painel, então não leva para a página ainda.
      if (!Object.keys(localStorage).some((k) => k.startsWith("orbibox-divulgar:"))) return;
      sessionStorage.setItem("orbibox_abriu", "1");
      router.replace("/abrir");
    } catch {
      // Sem acesso ao armazenamento: segue no painel.
    }
  }, [router]);
  return null;
}
