"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OrbiMiniVerde } from "@/components/orbi/OrbiConcluido";
import { useDialogs } from "@/hooks/useDialogs";
import { useArrastarOrdem } from "@/hooks/useArrastarOrdem";
import {
  BUCKET, COLUNAS_IMAGEM, MAX_CATEGORIAS, TIPOS_IMAGEM, classificarImagens, clienteBanco, enviarImagem, kb, sincronizarBiblioteca, urlDaImagem,
  type Categoria, type ImagemBanco, type TipoImagem,
} from "@/lib/bancoImagens";

type Filtro = "todas" | "sem" | string;

export function BancoImagens({ businessId, limite }: { businessId: string; limite: number }) {
  const supabase = useMemo(() => clienteBanco(), []);
  const { confirm, prompt, alert, DialogRenderer } = useDialogs();
  const inputRef = useRef<HTMLInputElement>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [imagens, setImagens] = useState<ImagemBanco[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [selecionando, setSelecionando] = useState(false);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState<{ feitas: number; total: number } | null>(null);
  const [gerenciando, setGerenciando] = useState(false);
  const [moverAberto, setMoverAberto] = useState(false);
  const [nomeNova, setNomeNova] = useState("");
  const [criandoNova, setCriandoNova] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"todos" | "sem" | TipoImagem>("todos");
  const [tipoAberto, setTipoAberto] = useState(false);
  const [organizando, setOrganizando] = useState(false);
  const classificando = useRef(false);
  const [fantasma, setFantasma] = useState<{ url: string; x: number; y: number; n: number } | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const bloqueiaToque = useRef(false);
  const arrastoCats = useArrastarOrdem(categorias.map((c) => c.id), true, (ids) => {
    const reord = ids.map((id, pos) => ({ ...categorias.find((c) => c.id === id)!, position: pos }));
    setCategorias(reord);
    Promise.all(reord.map((x) => supabase.from("image_categories").update({ position: x.position }).eq("id", x.id)));
  });

  const carregar = useCallback(async () => {
    await sincronizarBiblioteca(supabase, businessId);
    const [{ data: cats }, { data: imgs }] = await Promise.all([
      supabase.from("image_categories").select("id, name, position").eq("business_id", businessId).order("position").order("created_at"),
      supabase.from("image_library").select(COLUNAS_IMAGEM).eq("business_id", businessId).order("created_at", { ascending: false }).limit(2000),
    ]);
    setCategorias((cats as Categoria[]) ?? []);
    setImagens(((imgs as Omit<ImagemBanco, "url">[]) ?? []).map((i) => ({ ...i, url: urlDaImagem(supabase, i.path) })));
  }, [supabase, businessId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  /** Pede o tipo das imagens que ainda não têm, em lotes, e atualiza a tela. */
  const classificar = useCallback(async (alvo: ImagemBanco[]) => {
    if (classificando.current) return;
    const pendentes = alvo.filter((i) => !i.auto_tipo && !i.tipo_corrigido);
    if (pendentes.length === 0) return;
    classificando.current = true;
    setOrganizando(true);
    for (let n = 0; n < pendentes.length; n += 8) {
      const lote = pendentes.slice(n, n + 8).map((i) => i.id);
      const res = await classificarImagens(businessId, lote);
      if (Object.keys(res).length === 0) break;
      setImagens((p) => (p ?? []).map((i) => (res[i.id] && !i.tipo_corrigido ? { ...i, auto_tipo: res[i.id] } : i)));
    }
    classificando.current = false;
    setOrganizando(false);
  }, [businessId]);

  const jaOrganizou = useRef(false);
  useEffect(() => {
    if (!imagens || jaOrganizou.current) return;
    jaOrganizou.current = true;
    classificar(imagens);
  }, [imagens, classificar]);

  const total = imagens?.length ?? 0;
  const cheio = total >= limite;
  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    let sem = 0;
    for (const i of imagens ?? []) {
      if (i.category_id) m.set(i.category_id, (m.get(i.category_id) ?? 0) + 1);
      else sem++;
    }
    return { porCategoria: m, sem };
  }, [imagens]);

  const visiveis = (imagens ?? []).filter(
    (i) =>
      (filtro === "todas" ? true : filtro === "sem" ? !i.category_id : i.category_id === filtro) &&
      (tipo === "todos" ? true : tipo === "sem" ? !i.auto_tipo : i.auto_tipo === tipo),
  );
  const porTipo = useMemo(() => {
    const m = new Map<string, number>();
    let sem = 0;
    for (const i of imagens ?? []) {
      if (i.auto_tipo) m.set(i.auto_tipo, (m.get(i.auto_tipo) ?? 0) + 1);
      else sem++;
    }
    return { m, sem };
  }, [imagens]);
  const nomeDe = (id: string | null) => categorias.find((c) => c.id === id)?.name ?? null;

  async function enviar(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErro(null);
    const lista = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const vagas = Math.max(0, limite - total);
    if (vagas === 0) { setErro(`Você chegou ao limite de ${limite} imagens. Exclua algumas para enviar novas.`); return; }
    const aEnviar = lista.slice(0, vagas);
    const categoria = filtro !== "todas" && filtro !== "sem" ? filtro : null;
    setEnviando({ feitas: 0, total: aEnviar.length });
    let falhas = 0;
    const novas: ImagemBanco[] = [];
    for (let n = 0; n < aEnviar.length; n++) {
      try {
        const nova = await enviarImagem(supabase, businessId, aEnviar[n], categoria);
        setImagens((p) => [nova, ...(p ?? [])]);
        novas.push(nova);
      } catch {
        falhas++;
      }
      setEnviando({ feitas: n + 1, total: aEnviar.length });
    }
    setEnviando(null);
    classificar(novas);
    const cortadas = lista.length - aEnviar.length;
    if (falhas > 0) setErro(`${falhas} ${falhas === 1 ? "imagem não subiu" : "imagens não subiram"}. Tente de novo.`);
    else if (cortadas > 0) setErro(`Só ${aEnviar.length} ${aEnviar.length === 1 ? "coube" : "couberam"} no limite de ${limite} imagens.`);
  }

  async function novaCategoria() {
    if (categorias.length >= MAX_CATEGORIAS) { await alert(`O máximo é ${MAX_CATEGORIAS} categorias.`); return; }
    const nome = await prompt({ title: "Nova categoria", placeholder: "Ex.: Fotos da equipe", confirmLabel: "Criar" });
    const limpo = nome?.trim();
    if (!limpo) return;
    const { data } = await supabase
      .from("image_categories")
      .insert({ business_id: businessId, name: limpo.slice(0, 40), position: categorias.length })
      .select("id, name, position")
      .single();
    if (data) { setCategorias((p) => [...p, data as Categoria]); setFiltro((data as Categoria).id); }
  }

  /** Cria a categoria a partir das fotos marcadas e já move todas para ela. */
  async function criarEMover() {
    const limpo = nomeNova.trim();
    if (!limpo || criandoNova) return;
    if (categorias.length >= MAX_CATEGORIAS) { setMoverAberto(false); await alert(`O máximo é ${MAX_CATEGORIAS} categorias.`); return; }
    setCriandoNova(true);
    const { data } = await supabase
      .from("image_categories")
      .insert({ business_id: businessId, name: limpo.slice(0, 40), position: categorias.length })
      .select("id, name, position")
      .single();
    setCriandoNova(false);
    if (!data) { setErro("Não consegui criar a categoria. Tente de novo."); return; }
    setCategorias((p) => [...p, data as Categoria]);
    setNomeNova("");
    await moverSelecionadas((data as Categoria).id);
  }

  async function criarExemplos() {
    const { data } = await supabase
      .from("image_categories")
      .insert([{ business_id: businessId, name: "Produtos", position: 0 }, { business_id: businessId, name: "Fotos da empresa", position: 1 }])
      .select("id, name, position");
    if (data) setCategorias(data as Categoria[]);
  }

  async function renomear(c: Categoria) {
    const nome = await prompt({ title: "Renomear categoria", initialValue: c.name, confirmLabel: "Salvar" });
    const limpo = nome?.trim();
    if (!limpo || limpo === c.name) return;
    await supabase.from("image_categories").update({ name: limpo.slice(0, 40) }).eq("id", c.id);
    setCategorias((p) => p.map((x) => (x.id === c.id ? { ...x, name: limpo.slice(0, 40) } : x)));
  }

  async function mover(c: Categoria, delta: -1 | 1) {
    const i = categorias.findIndex((x) => x.id === c.id);
    const j = i + delta;
    if (j < 0 || j >= categorias.length) return;
    const nova = [...categorias];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    const reord = nova.map((x, pos) => ({ ...x, position: pos }));
    setCategorias(reord);
    await Promise.all(reord.map((x) => supabase.from("image_categories").update({ position: x.position }).eq("id", x.id)));
  }

  async function excluirCategoria(c: Categoria) {
    const n = contagem.porCategoria.get(c.id) ?? 0;
    if (!(await confirm({ title: "Excluir categoria", message: `Excluir "${c.name}"? ${n > 0 ? `As ${n} ${n === 1 ? "foto volta" : "fotos voltam"} para "Sem categoria", nenhuma foto é apagada.` : ""}`.trim(), confirmLabel: "Excluir", danger: true }))) return;
    await supabase.from("image_categories").delete().eq("id", c.id);
    setCategorias((p) => p.filter((x) => x.id !== c.id));
    setImagens((p) => (p ?? []).map((i) => (i.category_id === c.id ? { ...i, category_id: null } : i)));
    if (filtro === c.id) setFiltro("todas");
  }

  async function moverSelecionadas(cat: string | null) {
    const ids = Array.from(marcadas);
    setMoverAberto(false);
    await supabase.from("image_library").update({ category_id: cat }).in("id", ids);
    setImagens((p) => (p ?? []).map((i) => (marcadas.has(i.id) ? { ...i, category_id: cat } : i)));
    sair();
  }

  /** Segurar numa foto e soltar em cima de uma categoria para movê-la (ou todas as marcadas). */
  function segurarFoto(e: React.PointerEvent<HTMLElement>, img: ImagemBanco) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const ini = { x: e.clientX, y: e.clientY };
    let pegou = false;
    let ultimoAlvo: string | null = null;
    const ids = () => (selecionando && marcadas.has(img.id) ? Array.from(marcadas) : [img.id]);
    const impede = (ev: TouchEvent) => { if (ev.cancelable) ev.preventDefault(); };
    const alvoEm = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-alvo-categoria]")?.dataset.alvoCategoria ?? null;
    const aoMover = (ev: PointerEvent) => {
      if (!pegou) { if (Math.hypot(ev.clientX - ini.x, ev.clientY - ini.y) > 8) limpar(); return; }
      ultimoAlvo = alvoEm(ev.clientX, ev.clientY);
      setSobre(ultimoAlvo);
      setFantasma((f) => (f ? { ...f, x: ev.clientX, y: ev.clientY } : f));
    };
    const limpar = () => {
      clearTimeout(t);
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      window.removeEventListener("pointercancel", aoCancelar);
      window.removeEventListener("touchmove", impede);
    };
    const aoSoltar = () => {
      const alvo = ultimoAlvo;
      const lista = ids();
      limpar();
      if (!pegou) return;
      bloqueiaToque.current = true;
      setTimeout(() => { bloqueiaToque.current = false; }, 350);
      setFantasma(null);
      setSobre(null);
      if (alvo !== null) {
        const cat = alvo === "sem" ? null : alvo;
        supabase.from("image_library").update({ category_id: cat }).in("id", lista);
        setImagens((p) => (p ?? []).map((i) => (lista.includes(i.id) ? { ...i, category_id: cat } : i)));
        if (selecionando) sair();
      }
    };
    const aoCancelar = () => { limpar(); if (pegou) { setFantasma(null); setSobre(null); } };
    const t = setTimeout(() => {
      pegou = true;
      setFantasma({ url: img.url, x: ini.x, y: ini.y, n: ids().length });
      window.addEventListener("touchmove", impede, { passive: false });
      if ("vibrate" in navigator) navigator.vibrate?.(12);
    }, 350);
    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    window.addEventListener("pointercancel", aoCancelar);
  }

  async function definirTipo(t: TipoImagem) {
    const ids = Array.from(marcadas);
    setTipoAberto(false);
    await supabase.from("image_library").update({ auto_tipo: t, tipo_corrigido: true }).in("id", ids);
    setImagens((p) => (p ?? []).map((i) => (marcadas.has(i.id) ? { ...i, auto_tipo: t, tipo_corrigido: true } : i)));
    sair();
  }

  /** Onde cada imagem está em uso hoje (produtos, vouchers, página da marca). */
  async function usos(alvo: ImagemBanco[]): Promise<Map<string, string[]>> {
    const [{ data: itens }, { data: vouchers }, { data: negocio }] = await Promise.all([
      supabase.from("content_items").select("title, image_url, gallery_urls, images").eq("business_id", businessId),
      supabase.from("vouchers").select("title, image_url").eq("business_id", businessId),
      supabase.from("businesses").select("logo_url, logo_gallery, share_image_url, vitrine_cover_url, vitrine_cover_urls, story_photos").eq("id", businessId).maybeSingle(),
    ]);
    const fontes: { nome: string; texto: string }[] = [
      ...((itens as { title: string }[]) ?? []).map((r) => ({ nome: r.title || "Produto", texto: JSON.stringify(r) })),
      ...((vouchers as { title: string }[]) ?? []).map((r) => ({ nome: `Voucher ${r.title}`, texto: JSON.stringify(r) })),
      { nome: "Página da marca (logo, capa ou histórias)", texto: JSON.stringify(negocio ?? {}) },
    ];
    const mapa = new Map<string, string[]>();
    for (const img of alvo) {
      const onde = fontes.filter((f) => f.texto.includes(img.path)).map((f) => f.nome);
      if (onde.length) mapa.set(img.id, onde);
    }
    return mapa;
  }

  async function excluir(alvo: ImagemBanco[]) {
    if (alvo.length === 0) return;
    const emUso = await usos(alvo);
    const nomes = Array.from(new Set(Array.from(emUso.values()).flat()));
    const aviso = emUso.size > 0
      ? `${emUso.size === 1 ? "Esta imagem está" : `${emUso.size} dessas imagens estão`} em uso em: ${nomes.slice(0, 4).join(", ")}${nomes.length > 4 ? ` e mais ${nomes.length - 4}` : ""}. Se excluir, esses lugares ficam sem foto.`
      : "Nenhuma delas está em uso agora.";
    const ok = await confirm({
      title: alvo.length === 1 ? "Excluir imagem" : `Excluir ${alvo.length} imagens`,
      message: aviso,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    await supabase.storage.from(BUCKET).remove(alvo.map((i) => i.path));
    await supabase.from("image_library").delete().in("id", alvo.map((i) => i.id));
    const ids = new Set(alvo.map((i) => i.id));
    setImagens((p) => (p ?? []).filter((i) => !ids.has(i.id)));
    sair();
  }

  function sair() {
    setSelecionando(false);
    setMarcadas(new Set());
  }

  function tocar(i: ImagemBanco) {
    if (bloqueiaToque.current) return;
    if (!selecionando) { setSelecionando(true); setMarcadas(new Set([i.id])); return; }
    setMarcadas((p) => {
      const n = new Set(p);
      if (n.has(i.id)) n.delete(i.id); else n.add(i.id);
      return n;
    });
  }

  const pct = Math.min(100, Math.round((total / limite) * 100));
  const chip = (ativo: boolean) => `shrink-0 min-h-[40px] rounded-full px-4 text-[13.5px] font-medium transition-colors ${ativo ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`;

  return (
    <div className="flex flex-col pb-28">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight tracking-[-0.02em]">Banco de imagens</h1>
      <p className="mt-1 text-[14px] leading-snug text-text-secondary">Suba as fotos da sua marca uma vez e use em qualquer produto, voucher ou capa. Elas são comprimidas no envio para a página abrir rápido.</p>

      <div className="mt-4 rounded-[22px] bg-surface-white p-4 ring-1 ring-black/[0.05]">
        <div className="flex items-baseline justify-between">
          <p className="text-[14px] font-medium">{total} de {limite} imagens</p>
          <p className="text-[12px] text-text-tertiary">{cheio ? "Limite atingido" : `${limite - total} vagas`}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-soft">
          <div className={`h-full rounded-full ${pct >= 90 ? "bg-[#C2650A]" : "orbi-gradient"}`} style={{ width: `${pct}%` }} />
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { enviar(e.target.files); e.target.value = ""; }} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!!enviando || cheio}
          className="mt-3.5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-on-background px-5 text-[14.5px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {enviando ? <><OrbiMiniVerde size={20} progresso={enviando.total ? enviando.feitas / enviando.total : 0} />{`Enviando ${enviando.feitas} de ${enviando.total}…`}</> : <>Enviar imagens <span aria-hidden>+</span></>}
        </button>
        <p className="mt-2 text-[12px] text-text-tertiary">
          {filtro !== "todas" && filtro !== "sem" ? `As novas vão para "${nomeDe(filtro)}". ` : ""}Pode escolher várias de uma vez.
        </p>
        {erro && <p className="mt-2 text-[13px] text-red-600">{erro}</p>}
      </div>

      {/* Categorias criadas pela própria pessoa */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-[15px] font-semibold">Categorias</p>
        {categorias.length > 0 && (
          <button type="button" onClick={() => setGerenciando((g) => !g)} className="min-h-[40px] px-1 text-[13px] font-medium text-text-secondary underline underline-offset-2">
            {gerenciando ? "Pronto" : "Gerenciar"}
          </button>
        )}
      </div>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setFiltro("todas")} className={chip(filtro === "todas")}>Todas {total}</button>
        {arrastoCats.ordem.map((id) => categorias.find((x) => x.id === id)!).filter(Boolean).map((c) => (
          <button
            key={c.id}
            type="button"
            ref={arrastoCats.ref(c.id)}
            {...arrastoCats.props(c.id, !fantasma)}
            data-alvo-categoria={c.id}
            onClick={() => setFiltro(c.id)}
            className={`${chip(filtro === c.id)} ${sobre === c.id ? "ring-[3px] ring-on-background scale-105" : ""} ${arrastoCats.pegado === c.id ? "scale-105 shadow-lg" : ""}`}
          >
            {c.name} {contagem.porCategoria.get(c.id) ?? 0}
          </button>
        ))}
        {categorias.length > 0 && (contagem.sem > 0 || fantasma) && (
          <button type="button" data-alvo-categoria="sem" onClick={() => setFiltro("sem")} className={`${chip(filtro === "sem")} ${sobre === "sem" ? "ring-[3px] ring-on-background scale-105" : ""}`}>Sem categoria {contagem.sem}</button>
        )}
        <button type="button" onClick={novaCategoria} className="shrink-0 min-h-[40px] rounded-full border border-dashed border-divider px-4 text-[13.5px] font-medium text-text-secondary">+ Nova categoria</button>
      </div>

      {categorias.length > 0 && <p className="mt-1 text-[12px] text-text-tertiary">Segure uma foto e solte numa categoria para mover. Segure uma categoria para mudar a ordem.</p>}

      {categorias.length === 0 && (
        <button type="button" onClick={criarExemplos} className="mt-2 self-start text-[13px] text-text-secondary underline underline-offset-2">
          Começar com exemplos: Produtos e Fotos da empresa
        </button>
      )}

      {gerenciando && (
        <div className="mt-3 flex flex-col gap-2">
          {categorias.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 rounded-2xl border border-divider bg-surface-white px-3.5 py-2.5">
              <p className="min-w-0 flex-1 truncate text-[14px] font-medium">{c.name}</p>
              <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => mover(c, -1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[14px] disabled:opacity-30">↑</button>
              <button type="button" aria-label="Descer" disabled={i === categorias.length - 1} onClick={() => mover(c, 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[14px] disabled:opacity-30">↓</button>
              <button type="button" onClick={() => renomear(c)} className="min-h-[36px] rounded-full bg-surface-soft px-3.5 text-[12.5px] font-medium">Renomear</button>
              <button type="button" onClick={() => excluirCategoria(c)} className="min-h-[36px] rounded-full px-2.5 text-[12.5px] font-medium text-red-600">Excluir</button>
            </div>
          ))}
        </div>
      )}

      {/* Tipo, separado automaticamente pela Orbi */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[15px] font-semibold">Tipo</p>
        {organizando && <p className="text-[12px] text-text-tertiary">Organizando suas fotos…</p>}
      </div>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setTipo("todos")} className={chip(tipo === "todos")}>Todos</button>
        {TIPOS_IMAGEM.map((t) => (
          <button key={t.id} type="button" onClick={() => setTipo(t.id)} className={chip(tipo === t.id)}>
            {t.nome} {porTipo.m.get(t.id) ?? 0}
          </button>
        ))}
        {porTipo.sem > 0 && !organizando && <button type="button" onClick={() => setTipo("sem")} className={chip(tipo === "sem")}>Sem tipo {porTipo.sem}</button>}
      </div>

      {/* Grade de miniaturas */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-[15px] font-semibold">{filtro === "todas" ? "Todas as imagens" : filtro === "sem" ? "Sem categoria" : nomeDe(filtro)}{tipo !== "todos" ? ` · ${tipo === "sem" ? "Sem tipo" : TIPOS_IMAGEM.find((t) => t.id === tipo)?.nome}` : ""}</p>
        {visiveis.length > 0 && (
          <button type="button" onClick={() => (selecionando ? sair() : setSelecionando(true))} className="min-h-[40px] px-1 text-[13px] font-medium text-text-secondary underline underline-offset-2">
            {selecionando ? "Cancelar" : "Selecionar"}
          </button>
        )}
      </div>

      {imagens === null && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 9 }).map((_, i) => <span key={i} className="aspect-square animate-pulse rounded-2xl bg-surface-soft" />)}
        </div>
      )}
      {imagens && visiveis.length === 0 && (
        <div className="mt-3 rounded-[22px] border border-dashed border-divider p-6 text-center">
          <p className="text-[14px] font-medium">{total === 0 ? "Seu banco de imagens está vazio" : "Nenhuma imagem aqui"}</p>
          <p className="mt-1 text-[13px] text-text-tertiary">{total === 0 ? "Toque em Enviar imagens para subir as fotos da sua marca." : "Envie fotos com esta categoria aberta, ou mova de outra categoria."}</p>
        </div>
      )}
      {visiveis.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {visiveis.map((i) => {
            const marcada = marcadas.has(i.id);
            const cat = nomeDe(i.category_id);
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => tocar(i)}
                onPointerDown={(e) => segurarFoto(e, i)}
                onContextMenu={(e) => e.preventDefault()}
                style={{ WebkitTouchCallout: "none", userSelect: "none" }}
                aria-label={marcada ? "Desmarcar imagem" : selecionando ? "Marcar imagem" : "Selecionar imagem"}
                className={`relative aspect-square overflow-hidden rounded-2xl bg-surface-soft transition-transform active:scale-[0.97] ${marcada ? "ring-[3px] ring-on-background" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
                {selecionando && (
                  <span className={`absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold ${marcada ? "bg-on-background text-white" : "bg-white/90 text-transparent ring-1 ring-black/20"}`}>✓</span>
                )}
                {cat && filtro === "todas" && <span className="absolute bottom-1.5 left-1.5 max-w-[85%] truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">{cat}</span>}
                {i.size_bytes ? <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[9.5px] text-white">{kb(i.size_bytes)}</span> : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Barra de ações da seleção */}
      {selecionando && marcadas.size > 0 && (
        <div className="fixed inset-x-0 bottom-[84px] z-40 mx-auto flex w-full max-w-[420px] items-center gap-2 rounded-full bg-on-background px-3 py-2.5 shadow-xl lg:bottom-8">
          <span className="pl-2 text-[13px] font-medium text-white">{marcadas.size} {marcadas.size === 1 ? "selecionada" : "selecionadas"}</span>
          <span className="flex-1" />
          <button type="button" onClick={() => setMoverAberto(true)} className="min-h-[40px] rounded-full bg-white/15 px-4 text-[13px] font-semibold text-white">Mover para</button>
          <button type="button" onClick={() => setTipoAberto(true)} className="min-h-[40px] rounded-full bg-white/15 px-4 text-[13px] font-semibold text-white">Tipo</button>
          <button type="button" onClick={() => excluir((imagens ?? []).filter((i) => marcadas.has(i.id)))} className="min-h-[40px] rounded-full bg-[#E4264C] px-4 text-[13px] font-semibold text-white">Excluir</button>
        </div>
      )}

      {moverAberto && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setMoverAberto(false)}>
          <div className="w-full max-w-md rounded-t-[28px] bg-surface-white p-5 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold">Mover para qual categoria?</p>
            <form onSubmit={(e) => { e.preventDefault(); void criarEMover(); }} className="mt-3 flex items-center gap-2">
              <input
                value={nomeNova}
                onChange={(e) => setNomeNova(e.target.value)}
                maxLength={40}
                placeholder="Nova categoria, ex.: Milk shakes"
                aria-label="Nome da nova categoria"
                className="min-h-[48px] min-w-0 flex-1 rounded-full border border-divider bg-surface-white px-4 text-[14.5px] outline-none focus:border-on-background"
              />
              <button type="submit" disabled={!nomeNova.trim() || criandoNova} className="min-h-[48px] shrink-0 rounded-full bg-on-background px-5 text-[14px] font-semibold text-white disabled:opacity-40">
                {criandoNova ? "Criando…" : "Criar e mover"}
              </button>
            </form>
            <p className="mt-1.5 px-1 text-[12px] text-text-tertiary">Cria a pasta com {marcadas.size} {marcadas.size === 1 ? "foto" : "fotos"} dentro. Ou escolha uma que já existe:</p>
            <div className="mt-3 flex flex-col gap-2">
              {categorias.map((c) => (
                <button key={c.id} type="button" onClick={() => moverSelecionadas(c.id)} className="min-h-[48px] rounded-2xl border border-divider px-4 text-left text-[14.5px] font-medium">{c.name}</button>
              ))}
              <button type="button" onClick={() => moverSelecionadas(null)} className="min-h-[48px] rounded-2xl border border-divider px-4 text-left text-[14.5px] text-text-secondary">Sem categoria</button>
            </div>
          </div>
        </div>
      )}

      {fantasma && (
        <div className="pointer-events-none fixed z-[90] h-20 w-20 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl shadow-2xl ring-2 ring-white" style={{ left: fantasma.x, top: fantasma.y }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fantasma.url} alt="" className="h-full w-full object-cover" />
          {fantasma.n > 1 && <span className="absolute right-1 top-1 rounded-full bg-on-background px-1.5 text-[11px] font-semibold text-white">{fantasma.n}</span>}
        </div>
      )}

      {tipoAberto && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setTipoAberto(false)}>
          <div className="w-full max-w-md rounded-t-[28px] bg-surface-white p-5 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold">Qual é o tipo?</p>
            <p className="mt-1 text-[13px] text-text-tertiary">Use para corrigir quando a Orbi errar.</p>
            <div className="mt-3 flex flex-col gap-2">
              {TIPOS_IMAGEM.map((t) => (
                <button key={t.id} type="button" onClick={() => definirTipo(t.id)} className="min-h-[48px] rounded-2xl border border-divider px-4 text-left text-[14.5px] font-medium">{t.nome}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <DialogRenderer />
    </div>
  );
}
