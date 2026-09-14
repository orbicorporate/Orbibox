import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Tira travessão, que a marca não usa em lugar nenhum.
function limpar(texto: string): string {
  return texto.replace(/\s*[—–]\s*/g, ", ").trim();
}

type Canal = { canal: string; quando: string; texto: string; dica: string };

/**
 * Monta o plano de divulgação de um voucher: pra que serve, como usar no
 * balcão e textos prontos por canal. A ideia é o dono não precisar pensar
 * em nada, só copiar e mandar.
 */
export async function POST(req: NextRequest) {
  try {
    const { voucherId } = await req.json();
    if (!voucherId) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: voucher } = await supabase
      .from("vouchers")
      .select("id, business_id, title, description, discount_type, discount_value, quantity_total, quantity_claimed, expires_hours, badge")
      .eq("id", voucherId)
      .maybeSingle();
    if (!voucher) return NextResponse.json({ error: "Voucher não encontrado." }, { status: 404 });

    const { data: business } = await supabase
      .from("businesses")
      .select("name, slug, about_business, differentials, brand_voice_summary, address")
      .eq("id", voucher.business_id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!business) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

    const desconto = voucher.discount_type === "percent"
      ? `${voucher.discount_value}% de desconto`
      : `R$ ${voucher.discount_value} de desconto`;
    const restam = voucher.quantity_total - voucher.quantity_claimed;
    const validade = voucher.expires_hours
      ? `quem pega tem ${voucher.expires_hours}h pra usar`
      : "sem prazo pra usar depois de pego";

    const system = `Você é a Orbi, consultora de marketing do Orbibox. Ajuda donos de pequenos negócios brasileiros a divulgar um voucher e fazer ele render de verdade.

Contexto do negócio:
- Nome: ${business.name}
- Sobre: ${business.about_business || "não informado"}
- Diferenciais: ${business.differentials || "não informados"}
- Tom de voz: ${business.brand_voice_summary || "natural e próximo"}
${business.address ? `- Endereço: ${business.address}` : ""}

Contexto do voucher:
- Título: ${voucher.title}
- Descrição: ${voucher.description || "sem descrição"}
- Oferta: ${desconto}
- Quantidade: ${voucher.quantity_total} no total, ${restam} ainda disponíveis
- Validade: ${validade}
${voucher.badge ? `- Selo: ${voucher.badge}` : ""}

Responda SOMENTE em JSON válido, sem markdown, sem texto antes ou depois:
{"estrategia":{"alvo":"...","porque":"..."}, "canais":[{"canal":"...","quando":"...","texto":"...","dica":"..."}], "no_balcao":["...","...","..."], "evite":["...","..."]}

Regras:
- "estrategia.alvo": UMA frase curta (até 12 palavras) dizendo pra quem esse voucher serve ou o que ele destrava. É a manchete, tem que ser direta. Ex: "Pra destravar quem pediu orçamento e sumiu".
- "estrategia.porque": 1 ou 2 frases explicando por que isso funciona pra ESSE negócio, citando algo concreto (o prazo, o desconto, o tipo de cliente). Específico, nunca genérico.
- "canais": exatamente 4 itens, nesta ordem: Status do WhatsApp, Story do Instagram, Mensagem direta pra cliente antigo, Grupo ou comunidade local. Cada um com:
  - "canal": o nome do canal
  - "quando": melhor momento pra postar, concreto (ex: "terça de manhã, quando o movimento cai")
  - "texto": a mensagem pronta pra copiar e colar, no tom da marca, em português do Brasil. Curta, natural, como uma pessoa real escreveria. Pode usar 1 ou 2 emojis, nunca mais. Não use travessão.
  - "dica": uma frase de como aumentar o resultado nesse canal específico
- "no_balcao": 3 orientações práticas de como usar o voucher no atendimento (como validar, o que falar quando o cliente chegar com ele, como aproveitar pra vender mais).
- "evite": 2 erros comuns que estragam uma campanha de voucher, ditos de forma direta.
- Escreva como quem entende de comércio pequeno: direto, concreto, sem clichê de marketing ("alavancar", "potencializar", "solução ideal"). Nunca use travessão em nenhum texto.`;

    const raw = await askClaude({
      system,
      messages: [{ role: "user", content: "Monte o plano de divulgação desse voucher." }],
      maxTokens: 2000,
    });

    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);

    const canais: Canal[] = Array.isArray(parsed.canais)
      ? parsed.canais
          .filter((c: unknown): c is Canal => !!c && typeof c === "object" && typeof (c as Canal).canal === "string")
          .slice(0, 4)
          .map((c: Canal) => ({
            canal: limpar(c.canal),
            quando: limpar(c.quando ?? ""),
            texto: limpar(c.texto ?? ""),
            dica: limpar(c.dica ?? ""),
          }))
      : [];

    const lista = (v: unknown, max: number): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max).map(limpar) : [];

    return NextResponse.json({
      estrategia: parsed.estrategia && typeof parsed.estrategia === "object"
        ? {
            alvo: limpar(String(parsed.estrategia.alvo ?? "")),
            porque: limpar(String(parsed.estrategia.porque ?? "")),
          }
        // Tolera o formato antigo (texto único), caso a IA devolva assim.
        : { alvo: "", porque: typeof parsed.estrategia === "string" ? limpar(parsed.estrategia) : "" },
      canais,
      no_balcao: lista(parsed.no_balcao, 3),
      evite: lista(parsed.evite, 2),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Não consegui montar o plano agora. Tenta de novo." }, { status: 500 });
  }
}
