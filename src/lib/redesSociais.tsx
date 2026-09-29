/**
 * Redes sociais não viram box na Home: viram uma fileira de bolinhas com o
 * ícone da rede. Aqui fica o reconhecimento pelo link e os ícones.
 */

export type Rede = "instagram" | "linkedin" | "facebook" | "tiktok" | "youtube" | "x" | "pinterest" | "threads" | "spotify" | "behance";

const NOMES: Record<Rede, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  pinterest: "Pinterest",
  threads: "Threads",
  spotify: "Spotify",
  behance: "Behance",
};

/** Cor oficial de cada rede (o Instagram usa o degradê dele). */
export const FUNDO_DA_REDE: Record<Rede, string> = {
  instagram: "radial-gradient(circle at 30% 107%, #FDF497 0%, #FDF497 5%, #FD5949 45%, #D6249F 60%, #285AEB 90%)",
  linkedin: "#0A66C2",
  facebook: "#1877F2",
  tiktok: "#111111",
  youtube: "#FF0033",
  x: "#111111",
  pinterest: "#E60023",
  threads: "#111111",
  spotify: "#1DB954",
  behance: "#1769FF",
};
/** Cor do anel que "respira" em volta (a principal da marca). */
export const COR_DA_REDE: Record<Rede, string> = {
  instagram: "#E1306C",
  linkedin: "#0A66C2",
  facebook: "#1877F2",
  tiktok: "#25F4EE",
  youtube: "#FF0033",
  x: "#555555",
  pinterest: "#E60023",
  threads: "#555555",
  spotify: "#1DB954",
  behance: "#1769FF",
};

export function nomeDaRede(r: Rede) {
  return NOMES[r];
}

/** Reconhece a rede pelo link. Qualquer outro link continua sendo box. */
export function redeDoLink(url?: string | null): Rede | null {
  if (!url) return null;
  let host = "";
  try {
    host = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
  if (host.endsWith("instagram.com") || host === "instagr.am") return "instagram";
  if (host.endsWith("linkedin.com") || host === "lnkd.in") return "linkedin";
  if (host.endsWith("facebook.com") || host === "fb.com" || host === "fb.me" || host === "m.me") return "facebook";
  if (host.endsWith("tiktok.com")) return "tiktok";
  if (host.endsWith("youtube.com") || host === "youtu.be") return "youtube";
  if (host === "x.com" || host.endsWith("twitter.com")) return "x";
  if (host.includes("pinterest.") || host === "pin.it") return "pinterest";
  if (host.endsWith("threads.net") || host.endsWith("threads.com")) return "threads";
  if (host.endsWith("spotify.com")) return "spotify";
  if (host.endsWith("behance.net")) return "behance";
  return null;
}

export function IconeRede({ rede, size = 20 }: { rede: Rede; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  switch (rede) {
    case "instagram":
      return (
        <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.9">
          <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
          <circle cx="12" cy="12" r="4.1" />
          <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" stroke="none" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...p} fill="currentColor">
          <circle cx="6.4" cy="6.1" r="1.9" />
          <rect x="4.8" y="9.2" width="3.2" height="10.3" rx=".4" />
          <path d="M10.4 9.2h3.05v1.45c.55-.95 1.7-1.75 3.35-1.75 3.05 0 3.7 2 3.7 4.6v6h-3.2v-5.3c0-1.25-.05-2.75-1.7-2.75-1.7 0-1.95 1.3-1.95 2.65v5.4h-3.25z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...p} fill="currentColor">
          <path d="M13.6 21v-7.6h2.6l.4-3.05h-3V8.5c0-.9.25-1.5 1.55-1.5h1.6V4.3c-.3-.05-1.25-.13-2.35-.13-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3.05h2.6V21z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...p} fill="currentColor">
          <path d="M16.7 3c.35 2.2 1.65 3.6 3.9 3.8v3.05a7.4 7.4 0 0 1-3.85-1.2v6.35a5.65 5.65 0 1 1-5.65-5.65c.3 0 .6.02.9.07v3.12a2.6 2.6 0 1 0 1.65 2.42V3z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...p} fill="currentColor" fillRule="evenodd">
          <path d="M6.2 5.3h11.6A4.2 4.2 0 0 1 22 9.5v5a4.2 4.2 0 0 1-4.2 4.2H6.2A4.2 4.2 0 0 1 2 14.5v-5a4.2 4.2 0 0 1 4.2-4.2zM10 8.9v6.2l5.3-3.1z" />
        </svg>
      );
    case "x":
      return (
        <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
          <path d="M4.5 4h4.2l10.8 16h-4.2z" />
          <path d="M19 4l-6.1 6.9M11.1 13.1L5 20" />
        </svg>
      );
    case "pinterest":
      return (
        <svg {...p} fill="currentColor">
          <path d="M12.3 2.5C7 2.5 4.4 6.3 4.4 9.5c0 1.9.7 3.6 2.3 4.3.25.1.5 0 .56-.28l.23-.9c.07-.28.04-.38-.17-.62-.45-.54-.74-1.23-.74-2.2 0-2.84 2.12-5.38 5.53-5.38 3.02 0 4.68 1.84 4.68 4.3 0 3.24-1.43 5.97-3.56 5.97-1.17 0-2.05-.97-1.77-2.16.34-1.43 1-2.97 1-4 0-.92-.5-1.69-1.52-1.69-1.2 0-2.17 1.25-2.17 2.92 0 1.06.36 1.78.36 1.78l-1.45 6.13c-.43 1.82-.06 4.05-.03 4.27.02.14.19.17.27.07.11-.14 1.55-1.92 2.04-3.7.14-.5.8-3.1.8-3.1.39.75 1.54 1.41 2.76 1.41 3.63 0 6.1-3.31 6.1-7.74 0-3.35-2.84-6.47-7.15-6.47z" />
        </svg>
      );
    case "threads":
      return (
        <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <path d="M17.6 8.3C16.8 5.6 14.8 4 12 4 7.9 4 5.5 7 5.5 12s2.4 8 6.5 8c3.2 0 5.6-1.8 5.6-4.5 0-2.4-2-3.9-5-3.9-2.2 0-3.5 1-3.5 2.4 0 1.3 1.1 2.1 2.6 2.1 2.4 0 3.6-1.9 3.6-5.3" />
        </svg>
      );
    case "spotify":
      return (
        <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M7.3 9.4c3.3-1 6.8-.7 9.6.9M7.9 12.6c2.7-.8 5.4-.5 7.6.8M8.5 15.6c2-.5 4-.3 5.6.6" />
        </svg>
      );
    case "behance":
      return (
        <svg {...p} fill="currentColor">
          <path d="M2.5 6.5h5.3c2 0 3.3 1 3.3 2.6 0 1.1-.6 1.8-1.4 2.1 1.1.3 1.9 1.2 1.9 2.5 0 1.9-1.5 3-3.6 3H2.5zm2.4 4.1h2.6c.8 0 1.3-.4 1.3-1.1s-.5-1.1-1.3-1.1H4.9zm0 4.2h2.8c.9 0 1.4-.5 1.4-1.2 0-.8-.5-1.2-1.4-1.2H4.9zM17.4 9.4c2.4 0 3.9 1.7 3.9 4.2v.6h-5.8c.1 1.1.8 1.7 1.9 1.7.8 0 1.4-.4 1.6-.9h2.2c-.4 1.6-1.9 2.6-3.8 2.6-2.5 0-4.1-1.6-4.1-4.1s1.6-4.1 4.1-4.1zm-1.9 3.3h3.6c-.1-.9-.8-1.5-1.7-1.5s-1.7.6-1.9 1.5zM15 6.8h4.9v1.3H15z" />
        </svg>
      );
  }
}
