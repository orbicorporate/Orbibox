import { lookup } from "node:dns/promises";
import net from "node:net";

function ipPrivado(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:");
}

/** Confere se o endereço é público (http/https, sem rede interna). Lança erro se não for. */
export async function validarUrlPublica(entrada: string): Promise<URL> {
  const url = new URL(entrada);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Protocolo não permitido.");
  if (url.username || url.password) throw new Error("Endereço não permitido.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Endereço não permitido.");
  if (net.isIP(host)) {
    if (ipPrivado(host)) throw new Error("Endereço não permitido.");
    return url;
  }
  const resolvidos = await lookup(host, { all: true });
  if (resolvidos.length === 0 || resolvidos.some((r) => ipPrivado(r.address))) throw new Error("Endereço não permitido.");
  return url;
}

/** fetch que só aceita endereços públicos e confere cada redirecionamento. */
export async function safeFetch(entrada: string, init: RequestInit = {}, maxRedirects = 3): Promise<Response> {
  let atual = entrada;
  for (let i = 0; i <= maxRedirects; i++) {
    const url = await validarUrlPublica(atual);
    const res = await fetch(url, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      atual = new URL(loc, url).toString();
      continue;
    }
    return res;
  }
  throw new Error("Redirecionamentos demais.");
}
