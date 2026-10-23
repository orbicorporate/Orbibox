import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/appUrl";

// Buscadores e robôs de resposta de IA (que só buscam a página quando alguém pergunta algo e citam a
// fonte) ficam livres nas páginas públicas das marcas. Robôs de treino de IA e de raspagem em massa são
// barrados (quem respeita robots.txt para; o resto o limite de requisições da API e o firewall seguram).
// Painel, API e telas de cadastro ficam fora para todos.
const PRIVADO = ["/admin", "/api", "/onboarding", "/login", "/signup", "/master", "/parceiro"];

export default function robots(): MetadataRoute.Robots {
  const busca = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "Perplexity-User", "PerplexityBot"];
  const treino = ["GPTBot", "CCBot", "ClaudeBot", "anthropic-ai", "Google-Extended", "Bytespider", "Amazonbot", "Applebot-Extended", "meta-externalagent", "Diffbot", "ImagesiftBot", "omgili", "SemrushBot", "AhrefsBot", "MJ12bot", "DotBot"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVADO },
      { userAgent: busca, allow: "/", disallow: PRIVADO },
      { userAgent: treino, disallow: "/" },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
