"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GalleryUpload } from "@/components/ui/GalleryUpload";
import type { Ratio } from "@/components/ui/ImageCropModal";
import { PALETTE_GROUPS } from "@/lib/showcase";

type BrandColor = { hex: string; role?: string };
type BoxConfig = { label?: string; subtitle?: string; icon?: string; color?: string; action?: "vitrine" | "zara" | "whatsapp" | "link"; url?: string };
type Box = { id: string; box_type: string; title: string | null; position: number; is_active: boolean; auto_arranged: boolean; config: unknown };

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

/** Preto ou branco, o que der mais contraste — pra ícone ficar legível em
 * qualquer cor da paleta, mesmo as claras. */
function contrastFg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111318" : "#FFFFFF";
}

export function BoxesManager({
  businessId,
  initialBoxes,
  slug,
  initialStoryPhotos,
  initialStoryPhotoFormat,
  initialAboutBusiness,
  initialDifferentials,
  brandColors,
}: {
  businessId: string;
  initialBoxes: Box[];
  slug: string;
  initialStoryPhotos: string[];
  initialStoryPhotoFormat: string | null;
  initialAboutBusiness: string;
  initialDifferentials: string;
  brandColors: BrandColor[];
}) {
  const supabase = createClient();
  const [boxes, setBoxes] = useState<Box[]>(initialBoxes);
  const [storyPhotos, setStoryPhotos] = useState<string[]>(initialStoryPhotos);
  const [storyPhotoFormat, setStoryPhotoFormat] = useState<string | null>(initialStoryPhotoFormat);
  const [aboutBusiness, setAboutBusiness] = useState(initialAboutBusiness);
  const [differentials, setDifferentials] = useState(initialDifferentials);
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

  async function saveStoryPhotoFormat(ratio: Ratio) {
    setStoryPhotoFormat(ratio);
    await supabase.from("businesses").update({ story_photo_format: ratio }).eq("id", businessId);
  }

  async function saveAboutBusiness(value: string) {
    await supabase.from("businesses").update({ about_business: value || null }).eq("id", businessId);
  }

  async function saveDifferentials(value: string) {
    await supabase.from("businesses").update({ differentials: value || null }).eq("id", businessId);
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
          const fg = contrastFg(color);
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
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[16px]" style={{ backgroundColor: isHero ? "#111318" : color, color: isHero ? "#fff" : fg }}>
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
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-soft p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px]" style={{ backgroundColor: color, color: fg }}>
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
                  brandColors={brandColors}
                  onSave={(next) => saveConfig(box, { ...next, label })}
                  onDelete={isCustom ? () => removeCustom(box) : undefined}
                />
              )}

              {box.box_type === "content" && editing && (
                <div className="mt-4 flex flex-col gap-4 border-t border-divider pt-4">
                  <div>
                    <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Sobre nós</p>
                    <p className="mt-1 text-[12px] text-text-secondary">O texto que aparece na tela “Conhecer”, abaixo das fotos.</p>
                    <textarea
                      value={aboutBusiness}
                      onChange={(e) => setAboutBusiness(e.target.value)}
                      onBlur={(e) => saveAboutBusiness(e.target.value)}
                      rows={3}
                      placeholder="Quem vocês são, o que fazem, há quanto tempo..."
                      className="mt-2 w-full resize-none rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
                    />
                  </div>
                  <div>
                    <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Diferenciais</p>
                    <p className="mt-1 text-[12px] text-text-secondary">Uma frase por linha — vira uma lista na tela “Conhecer”.</p>
                    <textarea
                      value={differentials}
                      onChange={(e) => setDifferentials(e.target.value)}
                      onBlur={(e) => saveDifferentials(e.target.value)}
                      rows={3}
                      placeholder={"Entrega no mesmo dia\nMateriais sustentáveis\nAtendimento 24h"}
                      className="mt-2 w-full resize-none rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
                    />
                  </div>
                  <div>
                    <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Fotos da história (carrossel)</p>
                    <p className="mt-1 text-[12px] text-text-secondary">Aparecem em carrossel, acima do texto.</p>
                    <div className="mt-2">
                      <GalleryUpload
                        value={storyPhotos}
                        businessId={businessId}
                        lockedRatio={storyPhotoFormat as Ratio | null}
                        onFormatChosen={saveStoryPhotoFormat}
                        onChange={saveStoryPhotos}
                      />
                    </div>
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
          <BoxEditor initial={draft} isCustom brandColors={brandColors} onSave={(cfg) => setDraft((d) => ({ ...d, ...cfg }))} liveOnly />
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

/** Cor, ícone e (só pra blocos personalizados) subtítulo + destino. */
function BoxEditor({
  initial,
  isCustom,
  brandColors,
  onSave,
  onDelete,
  liveOnly,
}: {
  initial: BoxConfig;
  isCustom: boolean;
  brandColors: BrandColor[];
  onSave: (cfg: BoxConfig) => void;
  onDelete?: () => void;
  liveOnly?: boolean;
}) {
  const [cfg, setCfg] = useState<BoxConfig>(initial);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const color = cfg.color || "#111318";

  function update(next: Partial<BoxConfig>) {
    const merged = { ...cfg, ...next };
    setCfg(merged);
    if (liveOnly) onSave(merged);
  }

  function pickColor(hex: string) {
    update({ color: hex });
    if (!liveOnly) onSave({ ...cfg, color: hex });
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
      <button
        onClick={() => setColorModalOpen(true)}
        className="flex items-center gap-2.5 self-start rounded-full border border-divider py-1.5 pl-1.5 pr-4"
      >
        <span className="h-8 w-8 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[13px] font-medium">Escolher cor</span>
      </button>

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

      {colorModalOpen && (
        <ColorPickerModal current={color} brandColors={brandColors} onSelect={pickColor} onClose={() => setColorModalOpen(false)} />
      )}
    </div>
  );
}

/** Paleta completa — as mesmas 5 da Vitrine, mais a Marca quando existe.
 * Abre de baixo pra cima, com abas, igual o seletor de cor de box na Vitrine. */
function ColorPickerModal({
  current,
  brandColors,
  onSelect,
  onClose,
}: {
  current: string;
  brandColors: BrandColor[];
  onSelect: (hex: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(brandColors.length > 0 ? "Marca" : PALETTE_GROUPS[0].name);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="max-h-[75vh] overflow-y-auto rounded-t-[28px] bg-surface-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-divider" aria-label="Fechar" />
        <p className="text-center text-[14px] font-medium">Escolher cor</p>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {brandColors.length > 0 && (
            <button
              onClick={() => setTab("Marca")}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium ${tab === "Marca" ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
            >
              ✦ Marca
            </button>
          )}
          {PALETTE_GROUPS.map((g) => (
            <button
              key={g.name}
              onClick={() => setTab(g.name)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium ${tab === g.name ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-6 gap-3 pb-2">
          {tab === "Marca"
            ? brandColors.map((bc, i) => (
                <button
                  key={`${bc.hex}-${i}`}
                  onClick={() => { onSelect(bc.hex); onClose(); }}
                  aria-label={bc.role ?? bc.hex}
                  title={bc.role ?? bc.hex}
                  className={`aspect-square rounded-full border-2 ${current.toLowerCase() === bc.hex.toLowerCase() ? "border-on-background" : "border-transparent"}`}
                  style={{ backgroundColor: bc.hex }}
                />
              ))
            : Object.entries(PALETTE_GROUPS.find((g) => g.name === tab)?.colors ?? {}).map(([key, c]) => (
                <button
                  key={key}
                  onClick={() => { onSelect(c.bg); onClose(); }}
                  aria-label={c.label}
                  title={c.label}
                  className={`aspect-square rounded-full border-2 ${current.toLowerCase() === c.bg.toLowerCase() ? "border-on-background" : "border-transparent"}`}
                  style={{ backgroundColor: c.bg }}
                />
              ))}
        </div>
      </div>
    </div>
  );
}
