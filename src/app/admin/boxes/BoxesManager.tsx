"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GalleryUpload } from "@/components/ui/GalleryUpload";

type BoxConfig = { label?: string; subtitle?: string; icon?: string; color?: string; action?: "vitrine" | "zara" | "whatsapp" | "link"; url?: string };
type Box = { id: string; box_type: string; title: string | null; position: number; is_active: boolean; auto_arranged: boolean; config: unknown };

// O nome padrão de cada box e o que ela faz de verdade — o nome pode ser
// trocado pelo dono (é o mesmo texto que o visitante vê, sem indireção).
const META: Record<string, { name: string; explica: string; icon: string; fixo?: boolean }> = {
  hero: {
    name: "Tela inicial",
    explica: "A pergunta “O que trouxe você aqui hoje?”. É a tela em si, não um botão — por isso não tem nome nem cor pra editar.",
    icon: "◈",
    fixo: true,
  },
  product: { name: "Comprar", explica: "Mostra seus produtos e serviços na vitrine que você montou.", icon: "▤" },
  content: { name: "Conhecer", explica: "Conta sobre a marca — texto e fotos, usando o tom de voz do seu DNA.", icon: "◫" },
  campaign: { name: "Presentear", explica: "Uma seleção pensada para quem vai comprar para outra pessoa.", icon: "◇" },
  agent: { name: "Tirar uma dúvida", explica: "Abre a conversa com sua assistente de IA.", icon: "◉" },
};

const ACTION_LABEL: Record<NonNullable<BoxConfig["action"]>, string> = {
  vitrine: "Abre a Vitrine",
  zara: "Abre a Zara",
  whatsapp: "Abre o WhatsApp",
  link: "Abre um link",
};

const ICON_CHOICES = ["◆", "✦", "☎", "✉", "🔗", "◈", "◫", "★"];
const COLOR_CHOICES = [
  { hex: "#111318", label: "Preto" },
  { hex: "#173404", label: "Verde" },
  { hex: "#04342C", label: "Teal" },
  { hex: "#042C53", label: "Azul" },
  { hex: "#4A1B0C", label: "Coral" },
  { hex: "#4B2E8C", label: "Roxo" },
  { hex: "#6B4E05", label: "Dourado" },
];

export function BoxesManager({
  businessId,
  initialBoxes,
  slug,
  initialStoryPhotos,
}: {
  businessId: string;
  initialBoxes: Box[];
  slug: string;
  initialStoryPhotos: string[];
}) {
  const supabase = createClient();
  const [boxes, setBoxes] = useState<Box[]>(initialBoxes);
  const [storyPhotos, setStoryPhotos] = useState<string[]>(initialStoryPhotos);
  const [arranging, setArranging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<BoxConfig>({ label: "", subtitle: "", icon: "◆", action: "link", url: "" });

  async function toggleActive(box: Box) {
    if (META[box.box_type]?.fixo) return;
    const { error } = await supabase.from("smart_boxes").update({ is_active: !box.is_active }).eq("id", box.id);
    if (!error) setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, is_active: !b.is_active } : b)));
  }

  async function autoArrange() {
    setArranging(true);
    const priority: Record<string, number> = { hero: 0, product: 1, content: 2, campaign: 3, agent: 4, custom: 5 };
    const sorted = [...boxes].sort((a, b) => (priority[a.box_type] ?? 9) - (priority[b.box_type] ?? 9));
    await Promise.all(sorted.map((b, i) => supabase.from("smart_boxes").update({ position: i, auto_arranged: true }).eq("id", b.id)));
    setBoxes(sorted.map((b, i) => ({ ...b, position: i, auto_arranged: true })));
    setArranging(false);
  }

  async function move(box: Box, dir: -1 | 1) {
    const ordered = [...boxes].sort((a, b) => a.position - b.position);
    const idx = ordered.findIndex((b) => b.id === box.id);
    const swap = ordered[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("smart_boxes").update({ position: swap.position }).eq("id", box.id),
      supabase.from("smart_boxes").update({ position: box.position }).eq("id", swap.id),
    ]);
    setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, position: swap.position } : b.id === swap.id ? { ...b, position: box.position } : b)));
  }

  async function saveConfig(box: Box, cfg: BoxConfig) {
    setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, title: cfg.label ?? b.title, config: cfg } : b)));
    await supabase.from("smart_boxes").update({ title: cfg.label || box.title, config: cfg }).eq("id", box.id);
  }

  async function removeCustom(box: Box) {
    setEditingId(null);
    setBoxes((p) => p.filter((b) => b.id !== box.id));
    await supabase.from("smart_boxes").delete().eq("id", box.id);
  }

  async function saveStoryPhotos(urls: string[]) {
    setStoryPhotos(urls);
    await supabase.from("businesses").update({ story_photos: urls }).eq("id", businessId);
  }

  async function createCustom() {
    if (!draft.label?.trim()) return;
    const { data, error } = await supabase
      .from("smart_boxes")
      .insert({ business_id: businessId, box_type: "custom", title: draft.label.trim(), position: boxes.length, is_active: true, config: draft })
      .select()
      .single();
    if (!error && data) {
      setBoxes((p) => [...p, data as Box]);
      setCreating(false);
      setDraft({ label: "", subtitle: "", icon: "◆", action: "link", url: "" });
    }
  }

  const ordered = [...boxes].sort((a, b) => a.position - b.position);
  const ativos = ordered.filter((b) => b.is_active && !META[b.box_type]?.fixo).length;

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={autoArrange}
          disabled={arranging}
          className="rounded-full orbi-gradient px-4 py-2 text-[13px] font-medium text-on-background disabled:opacity-60"
        >
          {arranging ? "Organizando…" : "✦ Sugerir ordem"}
        </button>
        <Link href={`/${slug}`} target="_blank" className="rounded-full border border-divider bg-surface-white px-4 py-2 text-[13px] text-text-secondary">
          Ver resultado ↗
        </Link>
      </div>

      <p className="text-[13px] text-text-secondary">
        {ativos === 0
          ? "Nenhum caminho ativo — o visitante só verá a tela inicial."
          : `${ativos} ${ativos === 1 ? "caminho ativo" : "caminhos ativos"} na sua tela inicial.`}
      </p>

      <div className="flex flex-col gap-3">
        {ordered.map((box, idx) => {
          const isHero = box.box_type === "hero";
          const isCustom = box.box_type === "custom";
          const cfg = box.config as BoxConfig | null;
          const m = META[box.box_type] ?? { name: cfg?.label || box.title || "Bloco livre", explica: "Um caminho extra que você define — WhatsApp, portfólio, qualquer link.", icon: cfg?.icon || "◆" };
          const label = cfg?.label ?? (isCustom ? box.title ?? "" : m.name);
          const color = cfg?.color || "#111318";
          const icon = cfg?.icon || m.icon;
          const off = !box.is_active && !m.fixo;
          const editing = editingId === box.id;
          return (
            <div key={box.id} className={`rounded-[22px] border border-divider bg-surface-white p-4 ${off ? "opacity-55" : ""}`}>
              <div className="flex items-start gap-3">
                {!isHero && (
                  <div className="flex flex-col pt-1 text-[11px] text-text-tertiary">
                    <button onClick={() => move(box, -1)} disabled={idx === 0} className="disabled:opacity-30" aria-label="Subir">▲</button>
                    <button onClick={() => move(box, 1)} disabled={idx === ordered.length - 1} className="disabled:opacity-30" aria-label="Descer">▼</button>
                  </div>
                )}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[16px] text-white" style={{ backgroundColor: isHero ? "#111318" : color }}>
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  {isHero ? (
                    <p className="text-[15px] font-medium">{m.name}</p>
                  ) : (
                    <input
                      defaultValue={label}
                      onBlur={(e) => saveConfig(box, { ...(cfg ?? {}), label: e.target.value.trim() || m.name })}
                      placeholder={m.name}
                      className="w-full border-b border-transparent bg-transparent pb-0.5 text-[15px] font-medium outline-none focus:border-divider"
                    />
                  )}
                  {m.fixo && <span className="mt-1 inline-block rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-text-tertiary">sempre ativo</span>}
                </div>
                {!m.fixo && (
                  <button
                    onClick={() => toggleActive(box)}
                    className={`mt-1 h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${box.is_active ? "orbi-gradient" : "bg-surface-soft"}`}
                    aria-label={box.is_active ? "Desativar" : "Ativar"}
                  >
                    <span className={`block h-5 w-5 rounded-full bg-surface-white shadow transition-transform ${box.is_active ? "translate-x-5" : ""}`} />
                  </button>
                )}
              </div>

              <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">{m.explica}</p>

              {!isHero && (
                <>
                  {/* Pré-visualização — exatamente como fica no site, pra fechar a distância
                      entre editar aqui e ver lá. */}
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-soft p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] text-white" style={{ backgroundColor: color }}>
                      {icon}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{label || m.name}</p>
                      <p className="text-[11px] text-text-tertiary">assim aparece pro visitante</p>
                    </div>
                  </div>

                  <button onClick={() => setEditingId(editing ? null : box.id)} className="mt-3 text-[12px] text-text-tertiary underline">
                    {editing ? "Fechar" : "Cor, ícone e mais"}
                  </button>
                </>
              )}

              {editing && !isHero && (
                <BoxEditor
                  initial={cfg ?? { subtitle: "", icon: m.icon, color: "#111318", action: "link", url: "" }}
                  isCustom={isCustom}
                  onSave={(next) => saveConfig(box, { ...next, label })}
                  onDelete={isCustom ? () => removeCustom(box) : undefined}
                />
              )}

              {box.box_type === "content" && editing && (
                <div className="mt-4 border-t border-divider pt-4">
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Fotos da história (carrossel)</p>
                  <p className="mt-1 text-[12px] text-text-secondary">Aparecem em carrossel na tela “Conhecer”, junto com o texto do seu DNA.</p>
                  <div className="mt-2">
                    <GalleryUpload value={storyPhotos} businessId={businessId} onChange={saveStoryPhotos} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {creating ? (
        <div className="rounded-[22px] border border-dashed border-divider bg-surface-white p-4">
          <p className="text-[13px] font-medium">Novo bloco personalizado</p>
          <input
            value={draft.label ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="Nome do botão (ex: Fale no WhatsApp)"
            className="mt-2 w-full rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
          />
          <BoxEditor initial={draft} isCustom onSave={(cfg) => setDraft((d) => ({ ...d, ...cfg }))} liveOnly />
          <div className="mt-3 flex gap-2">
            <button onClick={createCustom} className="rounded-full bg-button-primary px-4 py-2 text-[13px] font-medium text-white">Criar</button>
            <button onClick={() => setCreating(false)} className="rounded-full bg-surface-soft px-4 py-2 text-[13px]">Cancelar</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="rounded-[22px] border border-dashed border-divider bg-surface-white p-4 text-center text-[13px] font-medium text-text-secondary"
        >
          + Criar bloco personalizado (WhatsApp, portfólio, outro link)
        </button>
      )}
    </div>
  );
}

/** Cor, ícone e (só pra blocos personalizados) subtítulo + destino. O nome já
 * é editado direto no cabeçalho do box — não repete aqui. */
function BoxEditor({
  initial,
  isCustom,
  onSave,
  onDelete,
  liveOnly,
}: {
  initial: BoxConfig;
  isCustom: boolean;
  onSave: (cfg: BoxConfig) => void;
  onDelete?: () => void;
  liveOnly?: boolean;
}) {
  const [cfg, setCfg] = useState<BoxConfig>(initial);

  function update(next: Partial<BoxConfig>) {
    const merged = { ...cfg, ...next };
    setCfg(merged);
    if (liveOnly) onSave(merged);
  }

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {isCustom && (
        <input
          value={cfg.subtitle ?? ""}
          onChange={(e) => update({ subtitle: e.target.value })}
          onBlur={() => !liveOnly && onSave(cfg)}
          placeholder="Subtítulo curto (opcional)"
          className="rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
        />
      )}

      <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Cor</p>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_CHOICES.map((c) => (
          <button
            key={c.hex}
            onClick={() => { update({ color: c.hex }); if (!liveOnly) onSave({ ...cfg, color: c.hex }); }}
            aria-label={c.label}
            title={c.label}
            className={`h-8 w-8 rounded-full border-2 ${(cfg.color || "#111318") === c.hex ? "border-on-background" : "border-transparent"}`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>

      <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Ícone</p>
      <div className="flex flex-wrap gap-1.5">
        {ICON_CHOICES.map((ic) => (
          <button
            key={ic}
            onClick={() => { update({ icon: ic }); if (!liveOnly) onSave({ ...cfg, icon: ic }); }}
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-[14px] ${cfg.icon === ic ? "border-on-background bg-surface-soft" : "border-divider"}`}
          >
            {ic}
          </button>
        ))}
      </div>

      {isCustom && (
        <>
          <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Ao tocar</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ACTION_LABEL) as (keyof typeof ACTION_LABEL)[]).map((a) => (
              <button
                key={a}
                onClick={() => { update({ action: a }); if (!liveOnly) onSave({ ...cfg, action: a }); }}
                className={`rounded-full px-3 py-1.5 text-[12px] ${cfg.action === a ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
              >
                {ACTION_LABEL[a]}
              </button>
            ))}
          </div>

          {(cfg.action === "link" || cfg.action === "whatsapp") && (
            <input
              value={cfg.url ?? ""}
              onChange={(e) => update({ url: e.target.value })}
              onBlur={() => !liveOnly && onSave(cfg)}
              placeholder={cfg.action === "whatsapp" ? "https://wa.me/55... (vazio usa o WhatsApp de Configurações)" : "https://..."}
              className="rounded-2xl border border-divider px-4 py-2.5 text-[13px] outline-none focus:border-on-background"
            />
          )}
        </>
      )}

      {onDelete && (
        <button onClick={onDelete} className="mt-1 self-start text-[12px] text-red-600">
          Excluir este bloco
        </button>
      )}
    </div>
  );
}
