import { NextRequest, NextResponse } from "next/server";
import { askClaudeJSON } from "@/lib/anthropic";
import { AI_MODEL_RAPIDO } from "@/lib/aiModel";
import { createClient } from "@/lib/supabase/server";

/**
 * Busca fotos prontas (banco de imagens) pra um item, em três etapas:
 * 1. A Orbi entende o contexto (negócio, item e o que a pessoa digitou) e
 *    traduz a ideia em cenas fotografáveis, em inglês, que é como os bancos
 *    respondem bem. "Roubo de caminhão" não existe como foto; "caminhão
 *    estacionado à noite", "câmera de segurança em pátio" existem.
 * 2. Busca todas essas cenas no Pexels (fotos profissionais, uso comercial
 *    livre). Sem chave do Pexels, cai no Openverse.
 * 3. A Orbi lê a descrição de cada foto encontrada e fica só com as que
 *    combinam de verdade com o contexto, na ordem de relevância.
 */
export const maxDuration = 40;

export type FotoPronta = { id: string; thumb: string; full: string; autor: string; fonte: string; alt?: string };

type Orientacao = "landscape" | "portrait" | "square";
type Plano = { cenas: string[]; sugestoes: string[] };

async function buscaPexels(q: string, orientacao: Orientacao, key: string): Promise<FotoPronta[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=20&orientation=${orientacao}&size=large`;
  const r = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const j = (await r.json()) as { photos?: { id: number; photographer: string; alt?: string; src: { medium: string; large2x: string } }[] };
  return (j.photos ?? []).map((p) => ({ id: `px-${p.id}`, thumb: p.src.medium, full: p.src.large2x, autor: p.photographer, fonte: "Pexels", alt: p.alt ?? "" }));
}

// Openverse mistura foto profissional com foto de celular: pede só
// fotografia, tamanho grande e conteúdo seguro, e descarta o que for
// pequeno demais pra virar capa.
async function buscaOpenverse(q: string): Promise<FotoPronta[]> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=20&license_type=commercial&category=photograph&size=large&mature=false`;
  const r = await fetch(url, { headers: { "User-Agent": "Orbibox/1.0" }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: { id: string; url: string; thumbnail?: string; creator?: string; source?: string; title?: string; width?: number; height?: number }[] };
  return (j.results ?? [])
    .filter((p) => (p.width ?? 0) >= 1200 && (p.height ?? 0) >= 800)
    .map((p) => ({ id: `ov-${p.id}`, thumb: p.thumbnail || p.url, full: p.url, autor: p.creator || "", fonte: p.source || "Openverse", alt: p.title ?? "" }));
}

/** Intercala os resultados das buscas (a mais específica primeiro) e tira repetidos. */
function intercalar(listas: FotoPronta[][], max: number): FotoPronta[] {
  const vistos = new Set<string>();
  const out: FotoPronta[] = [];
  for (let i = 0; out.length < max && listas.some((l) => i < l.length); i++) {
    for (const l of listas) {
      const f = l[i];
      if (f && !vistos.has(f.full)) {
        vistos.add(f.full);
        out.push(f);
        if (out.length >= max) break;
      }
    }
  }
  return out;
}

async function planejar(negocio: string, sobre: string, assunto: string, pedido: string): Promise<Plano | null> {
  const { data } = await askClaudeJSON<Plano>({
    model: AI_MODEL_RAPIDO,
    maxTokens: 600,
    system: `Você é diretor de arte e escolhe fotos de banco de imagens (Pexels) para capas de produtos e serviços de pequenos negócios brasileiros.

Bancos de imagem só encontram o que é FOTOGRAFÁVEL: objetos, pessoas, lugares, ações, luz. Conceitos abstratos ("roubo", "proteção", "tranquilidade", "economia") não viram foto sozinhos. Seu trabalho é entender o contexto do negócio e transformar a ideia em cenas concretas que comuniquem aquilo visualmente.

Exemplo: associação de proteção veicular, item "Roubo de caminhão" →
cenas: "semi truck parked at night", "truck on highway at dusk", "security camera parking lot night", "truck driver in cab", "fleet of trucks yard"
sugestões: "Caminhão à noite", "Estrada com caminhão", "Pátio com segurança"

Regras:
- cenas: 5 buscas em inglês, 2 a 5 palavras, cada uma uma cena diferente e concreta. A primeira é a mais fiel ao item; as outras variam ângulo, ambiente e emoção, sempre dentro do tema.
- Respeite o setor: se o negócio é de caminhões, não traga carros de passeio; se é comida japonesa, não traga pizza.
- Evite cenas negativas pesadas (acidente com feridos, crime violento); prefira a versão aspiracional ou de segurança.
- Nada de marcas, logos ou nomes próprios.
- sugestões: 3 ideias curtas em português (2 a 4 palavras) de outras cenas que a pessoa pode tocar pra buscar.`,
    messages: [
      {
        role: "user",
        content: `Negócio: ${negocio}\nSobre o negócio: ${sobre.slice(0, 500) || "(sem descrição)"}\nItem da vitrine: ${assunto || "(sem nome)"}\n${pedido ? `A pessoa pediu: "${pedido}"` : "A pessoa não digitou nada, sugira pelo item."}`,
      },
    ],
    schema: {
      type: "object",
      properties: {
        cenas: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
        sugestoes: { type: "array", items: { type: "string" }, maxItems: 3 },
      },
      required: ["cenas", "sugestoes"],
    },
  });
  if (!data || !Array.isArray(data.cenas) || data.cenas.length === 0) return null;
  return { cenas: data.cenas.map((c) => String(c).trim()).filter(Boolean).slice(0, 5), sugestoes: (data.sugestoes ?? []).map(String).slice(0, 3) };
}

/** A Orbi lê a descrição de cada foto e devolve só as que combinam, em ordem. */
async function escolherMelhores(fotos: FotoPronta[], contexto: string): Promise<FotoPronta[]> {
  const comAlt = fotos.filter((f) => (f.alt ?? "").trim());
  if (comAlt.length < 6) return fotos;
  const lista = comAlt.map((f, i) => `${i}: ${f.alt!.slice(0, 140)}`).join("\n");
  try {
    const { data } = await askClaudeJSON<{ escolhidas: number[] }>({
      model: AI_MODEL_RAPIDO,
      maxTokens: 400,
      system:
        "Você escolhe fotos para a capa de um item de um pequeno negócio. Recebe o contexto e uma lista numerada com a descrição de cada foto. Devolva os números das fotos que combinam de verdade com o contexto, da mais adequada para a menos. Descarte as que fogem do tema, do setor ou que ficariam estranhas como capa. Máximo de 27.",
      messages: [{ role: "user", content: `Contexto: ${contexto}\n\nFotos:\n${lista}` }],
      schema: {
        type: "object",
        properties: { escolhidas: { type: "array", items: { type: "integer" } } },
        required: ["escolhidas"],
      },
    });
    const idx = (data?.escolhidas ?? []).filter((n) => Number.isInteger(n) && n >= 0 && n < comAlt.length);
    if (idx.length < 3) return fotos;
    const vistos = new Set<number>();
    return idx.filter((n) => (vistos.has(n) ? false : (vistos.add(n), true))).map((n) => comAlt[n]);
  } catch {
    return fotos;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, assunto, busca, formato } = (await req.json()) as {
      businessId?: string;
      assunto?: string;
      busca?: string;
      formato?: string;
    };
    if (!businessId) return NextResponse.json({ error: "Faltou o negócio." }, { status: 400 });

    const supabase = await createClient();
    const { data: biz } = await supabase.from("businesses").select("name, about_business").eq("id", businessId).maybeSingle();
    if (!biz) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

    const pedido = (busca ?? "").trim();
    const sobre = String(biz.about_business ?? "");

    // Mesmo quando a pessoa digita, passa pela Orbi: ela entende o contexto
    // e transforma a ideia em cenas que o banco de imagens encontra.
    let plano: Plano | null = null;
    try {
      plano = await planejar(biz.name, sobre, assunto ?? "", pedido);
    } catch {
      /* sem IA: busca literal */
    }
    const cenas = plano?.cenas.length ? plano.cenas : [pedido || assunto || biz.name];

    const orientacao: Orientacao = formato === "quadrado" ? "square" : formato === "retrato" ? "portrait" : "landscape";
    const key = process.env.PEXELS_API_KEY;
    let listas = key ? await Promise.all(cenas.map((t) => buscaPexels(t, orientacao, key).catch(() => []))) : [];
    if (listas.every((l) => l.length === 0)) listas = await Promise.all(cenas.map((t) => buscaOpenverse(t).catch(() => [])));
    const candidatas = intercalar(listas, 80);

    const contexto = `Negócio: ${biz.name} (${sobre.slice(0, 200)}). Item: ${assunto || "-"}. ${pedido ? `Pedido: ${pedido}.` : ""} Cenas buscadas: ${cenas.join("; ")}.`;
    const fotos = (await escolherMelhores(candidatas, contexto)).slice(0, 27);

    return NextResponse.json({ busca: pedido, cenas, sugestoes: plano?.sugestoes ?? [], fotos });
  } catch (e) {
    console.error("fotos-prontas", e);
    return NextResponse.json({ error: "Não consegui buscar fotos agora." }, { status: 500 });
  }
}
