import type { SupabaseClient } from "@supabase/supabase-js";

// A Orbi como copiloto do dono: lê o que aconteceu no link e devolve UMA
// oportunidade por vez, sempre no formato dado → leitura → ação. Quando ainda
// não há dados, segue a jornada dos primeiros dias (divulgar, testar a IA,
// primeira oferta, primeira semana), ensinando o produto pelo uso.

const DIA = 24 * 60 * 60 * 1000;

export type Oportunidade = {
  tom: "oportunidade" | "alerta" | "passo";
  selo: string;
  titulo: string;
  dados: string[];
  pergunta: string;
  cta: { rotulo: string; href: string; share?: boolean; externo?: boolean };
  secundario?: { rotulo: string; href: string };
};

export type Semana = {
  visitas: number;
  visitasAntes: number;
  conversas: number;
  conversasAntes: number;
  contatos: number;
  contatosAntes: number;
  conversoes: number;
  conversoesAntes: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = SupabaseClient<any>;

function nomeOrigem(raw: string | null): string {
  const s = (raw || "").toLowerCase();
  if (!s || s === "direct" || s === "direto") return "link direto";
  if (s.includes("instagram")) return "Instagram";
  if (s.includes("whatsapp")) return "WhatsApp";
  if (s.includes("google")) return "Google";
  if (s.includes("facebook")) return "Facebook";
  if (s.includes("tiktok")) return "TikTok";
  return raw!;
}

async function conversasReais(supabase: Sb, businessId: string, ini: string, fim: string): Promise<number> {
  const { data } = await supabase.from("conversations").select("id").eq("business_id", businessId).gte("started_at", ini).lt("started_at", fim).limit(2000);
  const ids = ((data ?? []) as { id: string }[]).map((c) => c.id);
  if (!ids.length) return 0;
  const { data: msgs } = await supabase.from("messages").select("conversation_id").in("conversation_id", ids).eq("role", "visitor");
  return new Set(((msgs ?? []) as { conversation_id: string }[]).map((m) => m.conversation_id)).size;
}

/** Os 4 números essenciais dos últimos 7 dias, com a semana anterior pra comparar. */
export async function calcularSemana(supabase: Sb, businessId: string): Promise<Semana> {
  const agora = Date.now();
  const a = new Date(agora - 7 * DIA).toISOString();
  const b = new Date(agora - 14 * DIA).toISOString();
  const z = new Date(agora + DIA).toISOString();
  const cnt = (t: string, col: string, ini: string, fim: string) =>
    supabase.from(t).select("id", { count: "exact", head: true }).eq("business_id", businessId).gte(col, ini).lt(col, fim);
  const [v1, v0, l1, l0, w1, w0, r1, r0, c1, c0] = await Promise.all([
    cnt("visitor_sessions", "started_at", a, z),
    cnt("visitor_sessions", "started_at", b, a),
    cnt("leads", "created_at", a, z),
    cnt("leads", "created_at", b, a),
    supabase.from("click_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("kind", "whatsapp").gte("created_at", a),
    supabase.from("click_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("kind", "whatsapp").gte("created_at", b).lt("created_at", a),
    cnt("voucher_redemptions", "created_at", a, z),
    cnt("voucher_redemptions", "created_at", b, a),
    conversasReais(supabase, businessId, a, z),
    conversasReais(supabase, businessId, b, a),
  ]);
  return {
    visitas: v1.count ?? 0,
    visitasAntes: v0.count ?? 0,
    conversas: c1,
    conversasAntes: c0,
    contatos: l1.count ?? 0,
    contatosAntes: l0.count ?? 0,
    conversoes: (w1.count ?? 0) + (r1.count ?? 0),
    conversoesAntes: (w0.count ?? 0) + (r0.count ?? 0),
  };
}

export async function calcularOportunidade(
  supabase: Sb,
  ctx: {
    businessId: string;
    slug: string;
    criadoEm: string;
    botoesAtivos: number;
    hasVouchers: boolean;
    hasAiChat: boolean;
    pendencia: { title: string; description: string; ctaLabel: string; href: string } | null;
  },
): Promise<Oportunidade> {
  const { businessId } = ctx;
  const agora = Date.now();
  const idadeDias = Math.floor((agora - new Date(ctx.criadoEm).getTime()) / DIA);
  const ini = new Date(agora - 7 * DIA).toISOString();

  if (ctx.botoesAtivos === 0) {
    return {
      tom: "alerta",
      selo: "Precisa de atenção",
      titulo: "Sua página está sem nenhum botão ligado",
      dados: ["Quem abrir seu link agora não vê nenhuma opção pra tocar."],
      pergunta: "Ligar os botões principais?",
      cta: { rotulo: "Abrir Botões", href: "/admin/boxes" },
    };
  }

  const [total, sessoes, cliques, itens, vouchers, resgates, leads, conversasTotal, vouchersTotal] = await Promise.all([
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("visitor_sessions").select("source, intent").eq("business_id", businessId).gte("started_at", ini).limit(5000),
    supabase.from("click_events").select("kind, content_item_id").eq("business_id", businessId).gte("created_at", ini).limit(5000),
    supabase.from("content_items").select("id, title").eq("business_id", businessId),
    supabase.from("vouchers").select("id, title").eq("business_id", businessId).eq("is_active", true),
    supabase.from("voucher_redemptions").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("created_at", ini),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("created_at", ini),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("vouchers").select("id", { count: "exact", head: true }).eq("business_id", businessId),
  ]);

  const totalVisitas = total.count ?? 0;
  const listaSessoes = (sessoes.data ?? []) as { source: string | null; intent: string | null }[];
  const visitas = listaSessoes.length;
  const listaCliques = (cliques.data ?? []) as { kind: string; content_item_id: string | null }[];
  const toques = listaCliques.length;
  const pessoas = (n: number) => (n === 1 ? "pessoa" : "pessoas");

  // Origem dominante da semana.
  const porOrigem: Record<string, number> = {};
  for (const s of listaSessoes) {
    const o = nomeOrigem(s.source);
    porOrigem[o] = (porOrigem[o] ?? 0) + 1;
  }
  const [origemTop, origemQtd] = Object.entries(porOrigem).sort((x, y) => y[1] - x[1])[0] ?? [null, 0];
  const origemForte = origemTop && origemTop !== "link direto" && visitas >= 5 && origemQtd / visitas >= 0.4 ? origemTop : null;

  // 1. Ainda ninguém viu: o próximo passo é sempre divulgar.
  if (totalVisitas === 0) {
    return {
      tom: "passo",
      selo: idadeDias < 1 ? "Primeiro dia" : "Primeiras visitas",
      titulo: idadeDias < 1 ? "Seu Orbibox está no ar. Agora falta alguém ver." : "Seu link ainda não recebeu visitas",
      dados: [
        "Ninguém abriu seu link ainda.",
        "O caminho mais rápido: trocar o link da bio do Instagram e mandar pra 10 clientes no WhatsApp.",
      ],
      pergunta: "Divulgar agora?",
      cta: { rotulo: "Divulgar meu Orbibox", href: `/${ctx.slug}`, share: true },
      secundario: { rotulo: "Criar um post com a Orbi", href: "/admin/content" },
    };
  }

  // 2. Oferta que é vista e pouco resgatada.
  const vistasCupom = listaSessoes.filter((s) => s.intent === "cupom").length + listaCliques.filter((c) => c.kind === "cupom").length;
  const resg = resgates.count ?? 0;
  const ativos = (vouchers.data ?? []) as { id: string; title: string }[];
  if (ativos.length > 0 && vistasCupom >= 10 && resg / vistasCupom < 0.15) {
    return {
      tom: "oportunidade",
      selo: "A Orbi encontrou uma oportunidade",
      titulo: `Sua oferta é vista, mas pouco resgatada`,
      dados: [`${vistasCupom} visualizações e ${resg} ${resg === 1 ? "resgate" : "resgates"} nos últimos 7 dias.`, "Interesse existe. Um desconto mais claro ou menos unidades costuma destravar."],
      pergunta: "Quer ajustar a oferta?",
      cta: { rotulo: "Melhorar oferta", href: "/admin/vouchers" },
    };
  }

  // 3. O item mais procurado da semana.
  const porItem: Record<string, number> = {};
  for (const c of listaCliques) if (c.content_item_id) porItem[c.content_item_id] = (porItem[c.content_item_id] ?? 0) + 1;
  const [topId, topQtd] = Object.entries(porItem).sort((x, y) => y[1] - x[1])[0] ?? [null, 0];
  const topTitulo = topId ? ((itens.data ?? []) as { id: string; title: string }[]).find((i) => i.id === topId)?.title ?? null : null;
  if (topTitulo && topQtd >= 5) {
    return {
      tom: "oportunidade",
      selo: "A Orbi encontrou uma oportunidade",
      titulo: `“${topTitulo.trim()}” é o mais procurado`,
      dados: [`${topQtd} toques em 7 dias${origemForte ? `, a maioria vindo do ${origemForte}` : ""}.`],
      pergunta: "",
      cta: ctx.hasVouchers ? { rotulo: "Criar promoção pra ele", href: "/admin/vouchers?novo=1" } : { rotulo: "Criar um post sobre ele", href: "/admin/content" },
    };
  }

  // 4. Contatos novos esperando resposta.
  const novos = leads.count ?? 0;
  if (novos > 0) {
    return {
      tom: "oportunidade",
      selo: "A Orbi encontrou uma oportunidade",
      titulo: `${novos} ${novos === 1 ? "novo contato" : "novos contatos"} esta semana`,
      dados: [`${novos === 1 ? "Essa pessoa deixou" : "Essas pessoas deixaram"} o WhatsApp com você.`, "Quem recebe resposta no mesmo dia tem muito mais chance de comprar."],
      pergunta: "Quer mandar uma mensagem?",
      cta: { rotulo: "Ver contatos", href: "/admin/conversas" },
    };
  }

  // 5. Muita gente olha, pouca toca.
  if (visitas >= 10 && toques / visitas < 0.2) {
    return {
      tom: "oportunidade",
      selo: "A Orbi encontrou uma oportunidade",
      titulo: "Muita gente olha e pouca gente toca",
      dados: [`${visitas} visitas e ${toques} toques nos últimos 7 dias.`, "O primeiro botão é o que mais recebe toque. Vale colocar ali o caminho que mais importa."],
      pergunta: "Organizar a ordem dos botões?",
      cta: { rotulo: "Organizar botões", href: "/admin/boxes" },
    };
  }

  // 6. Um canal está trazendo gente.
  if (origemForte) {
    return {
      tom: "oportunidade",
      selo: "A Orbi encontrou uma oportunidade",
      titulo: `O ${origemForte} está trazendo gente`,
      dados: [`${Math.round((origemQtd / visitas) * 100)}% das visitas da semana vieram de lá.`, "Repetir o link no mesmo canal costuma trazer mais do mesmo público."],
      pergunta: "Quer um post pronto pra repetir o link?",
      cta: { rotulo: "Criar conteúdo", href: "/admin/content" },
    };
  }

  // Jornada dos primeiros dias, quando os dados ainda não dizem muito.
  if (ctx.hasAiChat && (conversasTotal.count ?? 0) === 0) {
    return {
      tom: "passo",
      selo: "Próximo passo",
      titulo: "Converse com sua IA como se fosse um cliente",
      dados: [`${visitas > 0 ? `${visitas} ${pessoas(visitas)} visitaram esta semana, mas ninguém conversou ainda.` : "Ninguém conversou com ela ainda."}`, "Ela já sabe sobre seu negócio pelo que leu. Faça uma pergunta e veja como responde."],
      pergunta: "Testar agora?",
      cta: { rotulo: "Conversar com minha IA", href: `/${ctx.slug}?chat=1`, externo: true },
      secundario: { rotulo: "Ajustar o que ela sabe", href: "/admin/agent" },
    };
  }
  if (ctx.hasVouchers && (vouchersTotal.count ?? 0) === 0 && idadeDias >= 2) {
    return {
      tom: "passo",
      selo: "Próximo passo",
      titulo: "Que tal sua primeira oferta?",
      dados: [`${visitas} ${pessoas(visitas)} visitaram sua página esta semana.`, "Uma oferta com poucas unidades dá um motivo pra pessoa agir hoje e deixa o contato com você."],
      pergunta: "Criar em 1 minuto?",
      cta: { rotulo: "Criar oferta", href: "/admin/vouchers?novo=1" },
    };
  }
  if (ctx.pendencia) {
    return {
      tom: "passo",
      selo: "Deixe sua página mais completa",
      titulo: ctx.pendencia.title,
      dados: [ctx.pendencia.description],
      pergunta: "",
      cta: { rotulo: ctx.pendencia.ctaLabel, href: ctx.pendencia.href },
    };
  }
  return {
    tom: "passo",
    selo: idadeDias >= 7 ? "Sua semana" : "Próximo passo",
    titulo: visitas > 0 ? `${visitas} ${pessoas(visitas)} visitaram seu Orbibox esta semana` : "Hora de divulgar de novo",
    dados: [visitas > 0 ? `E tocaram ${toques} ${toques === 1 ? "vez" : "vezes"} em algo.` : "Faz 7 dias sem visitas novas.", "Cada vez que o link aparece, mais gente chega e a Orbi aprende mais sobre seus clientes."],
    pergunta: "Divulgar de novo?",
    cta: { rotulo: "Divulgar meu Orbibox", href: `/${ctx.slug}`, share: true },
    secundario: { rotulo: "Ver resultados", href: "/admin/pulse" },
  };
}
