import type { MetadataRoute } from "next";

// Buscadores e a prévia do WhatsApp continuam livres. Painel e API ficam fora, e os robôs de
// treino de IA e de raspagem em massa são barrados (quem respeita robots.txt para; o resto o
// limite de requisições da API e o firewall seguram).
export default function robots(): MetadataRoute.Robots {
  const bloqueados = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "CCBot", "ClaudeBot", "anthropic-ai", "Google-Extended", "PerplexityBot", "Bytespider", "Amazonbot", "Applebot-Extended", "meta-externalagent", "Diffbot", "ImagesiftBot", "omgili", "SemrushBot", "AhrefsBot", "MJ12bot", "DotBot"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/onboarding", "/login", "/signup"] },
      { userAgent: bloqueados, disallow: "/" },
    ],
  };
}
