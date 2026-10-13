import { useEffect } from "react";

/**
 * Enquanto uma folha está aberta, a página de trás não rola. Sem isso, arrastar
 * o dedo na folha passa o movimento para a página, a barra do navegador encolhe
 * e a folha parece sumir ou pular.
 */
export function useTravarRolagem(ativo = true) {
  useEffect(() => {
    if (!ativo) return;
    const antes = document.body.style.overflow;
    const antesHtml = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = antes;
      document.documentElement.style.overscrollBehavior = antesHtml;
    };
  }, [ativo]);
}
