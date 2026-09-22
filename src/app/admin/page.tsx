import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { getBusinessProgress } from "@/lib/progress";
import { getPendingInsights } from "@/lib/insights";
import { ProgressCard } from "@/components/ProgressWidgets";
import { InsightRotator } from "./InsightRotator";
import { ShareOrbiboxButton } from "@/components/mobile/ShareOrbiboxButton";
import { QRCodeButton } from "@/components/ui/QRCodeButton";
import { WelcomeBackBanner } from "./WelcomeBackBanner";

const METRICS = [
  { key: "discovery", label: "Visitas", explica: "Pessoas que abriram seu link", icon: "◎", href: "/admin/pulse" },
  { key: "interest", label: "Interesses", explica: "Escolheram uma opção na tela inicial", icon: "♡", href: "/admin/pulse" },
  { key: "conversion", label: "Talks reais", explica: "Trocaram mensagem de verdade com a Orbi", icon: "▤", href: "/admin/conversas" },
  { key: "relationship", label: "Ações", explica: "Cliques em produtos, links e WhatsApp", icon: "☞", href: "/admin/pulse" },
] as const;

export default async function HojePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const businessId = await getCurrentBusinessId(user!.id);
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId!)
    .limit(1)
    .single();


  // Tudo que depende só do business roda em paralelo, antes eram 6 idas ao banco em fila.
  const [visitsRes, convRowsRes, interestedRes, actionsRes, activeBoxesRes] = await Promise.all([
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("conversations").select("id").eq("business_id", business!.id),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", business!.id).not("intent", "is", null),
    // "Ações" = cliques de verdade (produto, link, WhatsApp…), mesma fonte do Pulse,
    // não a tabela de campanhas (isso não tinha nada a ver com o que o visitante faz).
    supabase.from("click_events").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("smart_boxes").select("id", { count: "exact", head: true }).eq("business_id", business!.id).eq("is_active", true),
  ]);
  const visits = visitsRes.count, interested = interestedRes.count, actions = actionsRes.count;
  const activeBoxes = activeBoxesRes.count ?? 0;
  const progress = await getBusinessProgress(business!.id);

  // Insight sempre atual, em vez de uma tabela fixa que nunca se atualizava
  // sozinha, verifica o estado de verdade do negócio a cada carregamento e
  // sugere o próximo passo que ainda falta, em ordem de prioridade. Assim
  // que a pessoa resolve um, o próximo já aparece, nunca fica preso num
  // insight antigo, e nunca sobra sem sugestão nenhuma. Mesma lista usada
  // no sino do header e na página /admin/pendencias, por isso vem de
  // getPendingInsights em vez de calculada aqui.
  const insightsQueue: { title: string; description: string; ctaLabel: string; href: string; share?: boolean }[] = await getPendingInsights(business!.id);
  // Sem nenhum pendente: alterna entre dicas de divulgação, pra nunca ficar
  // sem sugestão, e pra não repetir sempre a mesma quando já está tudo pronto.
  // URL pública de verdade, NUNCA usa o host da requisição sozinho, porque
  // se a pessoa está acessando o painel por uma URL específica de deploy
  // (não o domínio principal), essa URL fica protegida pelo Vercel e mostra
  // "Protected Deployment" pra quem recebe o link. VERCEL_PROJECT_PRODUCTION_URL
  // é o domínio estável de produção, sempre o certo pra compartilhar.
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || (await headers()).get("host") || "orbibox-orbi-app.vercel.app";
  const proto = host.includes("localhost") ? "http" : "https";
  const shareUrl = `${proto}://${host}/${business!.slug}`;

  // "Pronto pra compartilhar" = tem uma descrição de link E uma imagem que vai
  // servir de capa (a própria de compartilhamento, ou a capa da Vitrine, ou o
  // logo como último recurso). Sem isso, o botão pergunta antes de compartilhar.
  const temCapaCompartilhar =
    !!business!.share_image_url ||
    !!business!.vitrine_cover_url ||
    (Array.isArray(business!.vitrine_cover_urls) && (business!.vitrine_cover_urls as string[]).length > 0) ||
    !!business!.logo_url;
  const shareReady = !!business!.share_description?.trim() && temCapaCompartilhar;
  const growthTips: { title: string; description: string; ctaLabel: string; href: string; share?: boolean }[] = [
    {
      title: "Divulgue seu link",
      description: "Sua página está pronta. Agora é espalhar: cole o link nos stories, na bio do Instagram e mande nos seus contatos de WhatsApp.",
      ctaLabel: "Compartilhar Orbibox",
      href: `/${business!.slug}`,
      share: true,
    },
    {
      title: "Poste em grupos de WhatsApp",
      description: "Grupos de bairro, de clientes ou de parceiros trazem visitas rápido. Mande seu link com uma frase curta, tipo \"acabei de montar meu catálogo online, dá uma olhada\".",
      ctaLabel: "Compartilhar Orbibox",
      href: `/${business!.slug}`,
      share: true,
    },
    {
      title: "Use o link na bio do Instagram",
      description: "A bio é o único link clicável do seu perfil no Instagram, e o mais visto. Troque o link que está lá pelo do seu Orbibox, assim tudo o que você faz fica a um toque de distância.",
      ctaLabel: "Compartilhar Orbibox",
      href: `/${business!.slug}`,
      share: true,
    },
    {
      title: "Acompanhe seus resultados",
      description: "O Pulse mostra quantas pessoas visitaram, o que elas mais tocaram e as conversas recentes. Vale dar uma olhada pra entender o que está funcionando.",
      ctaLabel: "Abrir Pulse",
      href: "/admin/pulse",
    },
  ];

  // "Conversas reais" só conta quem de fato trocou mensagem com a Orbi, não
  // toda vez que alguém abriu o chat e fechou sem digitar nada (isso inflava
  // o número e não batia com o que aparecia no Pulse/Conversas).
  const convIds = (convRowsRes.data ?? []).map((c) => c.id);
  let realConvs = 0;
  if (convIds.length > 0) {
    const { data: msgRows } = await supabase.from("messages").select("conversation_id").in("conversation_id", convIds).eq("role", "visitor");
    realConvs = new Set((msgRows ?? []).map((m) => m.conversation_id)).size;
  }

  const values: Record<string, number> = {
    discovery: visits ?? 0,
    interest: interested ?? 0,
    conversion: realConvs,
    relationship: actions ?? 0,
  };

  return (
    <div className="relative flex flex-col">
      {/* Saudação dentro de um halo circular, nome do negócio, não do usuário
          que abriu o painel, já que mais gente da equipe também vai entrar. */}
      <div className="relative mx-auto mt-6 flex h-64 w-64 items-center justify-center">
        <div className="orbi-halo absolute inset-0" aria-hidden>
          <span className="orbi-halo__dot" />
        </div>

        <div className="absolute left-1/2 top-1/2 w-[90vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 text-center">
          <h1 className="whitespace-nowrap font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">
            Olá, {business!.name}
          </h1>
          <p className="mt-1 text-[14px] text-text-secondary">Seu negócio está indo bem hoje.</p>
        </div>
      </div>
      <div className="mx-auto -mt-2 flex items-center gap-2">
        <ShareOrbiboxButton
          url={shareUrl}
          title={`${business!.name}, Orbibox`}
          shareReady={shareReady}
          className="flex items-center gap-1.5 rounded-full bg-on-background px-4 py-2 text-[13px] font-medium text-white"
        >
          ↗ Compartilhar Orbibox
        </ShareOrbiboxButton>
        <Link
          href={`/${business!.slug}`}
          target="_blank"
          className="rounded-full border border-divider bg-surface-white px-3 py-2 text-[12px] text-text-secondary"
        >
          Ver
        </Link>
        <QRCodeButton
          url={shareUrl}
          businessName={business!.name}
          className="rounded-full border border-divider bg-surface-white px-3 py-2 text-[12px] text-text-secondary"
        >
          QR Code
        </QRCodeButton>
      </div>

      <WelcomeBackBanner businessName={business!.name} pendencias={insightsQueue.map((i) => ({ title: i.title, href: i.href }))} />

      <ProgressCard done={progress.done} pct={progress.pct} />

      {insightsQueue.length > 0 && (
        <Link
          href="/admin/pendencias"
          className="mx-auto mt-3 flex items-center gap-1.5 rounded-full bg-surface-soft px-4 py-2 text-[12.5px] font-medium text-text-secondary active:opacity-60"
        >
          Ver tudo que falta ({insightsQueue.length}) <span aria-hidden>→</span>
        </Link>
      )}

      {activeBoxes === 0 && (
        <p className="mx-auto mt-3 max-w-[280px] text-center text-[12px] leading-relaxed text-red-600">
          ⚠ Ainda não dá pra divulgar, sua página está sem nenhuma Box ativa, então quem abrir o link não vê nada.{" "}
          <Link href="/admin/boxes" className="underline">Resolver agora</Link>
        </p>
      )}

      {!business!.tour_completed_at && (
        <Link
          href="/admin/agent?tour=0"
          className="mt-6 flex items-center justify-between rounded-2xl border border-divider bg-surface-white px-4 py-3.5"
        >
          <span className="text-[14px] font-medium">✦ Conheça o Orbibox num tour rápido</span>
          <span className="text-text-tertiary">→</span>
        </Link>
      )}

      {/* Métricas em lista, cada uma leva pro Pulse (ou Conversas), onde dá
          pra ver o detalhe. Mesma fonte de dados do Pulse, então os números
          batem entre as duas telas. */}
      <div className="mt-8 flex flex-col">
        {METRICS.map((m) => (
          <Link key={m.key} href={m.href} className="flex items-center justify-between border-b border-divider py-4 active:opacity-60">
            <div className="flex items-center gap-3">
              <span className="text-[16px] text-text-secondary">{m.icon}</span>
              <div>
                <span className="block text-[15px] text-text-secondary">{m.label}</span>
                <span className="block text-[12px] text-text-tertiary">{m.explica}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-manrope)] text-[22px] font-medium">
                {values[m.key].toLocaleString("pt-BR")}
              </span>
              <span className="text-[14px] text-text-tertiary">›</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Insight Orbi com botão "Novo insight" pra rodar outra dica. Começa
          por uma dica ainda pendente se houver (insightsQueue), senão gira. */}
      <InsightRotator
        tips={insightsQueue.length > 0 ? [...insightsQueue, ...growthTips] : growthTips}
        startIndex={insightsQueue.length > 0 ? 0 : new Date().getDate() % growthTips.length}
        shareUrl={shareUrl}
        shareTitle={`${business!.name}, Orbibox`}
        shareReady={shareReady}
      />
    </div>
  );
}
