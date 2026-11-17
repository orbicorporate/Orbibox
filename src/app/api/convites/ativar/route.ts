import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { carregarVoucherPrivado, conferirOtpWhatsapp, enviarOtpWhatsapp, ipHash, passouDoLimiteIp, UUID } from "@/lib/convitesServidor";
import { limparCodigo, mascararWhatsapp } from "@/lib/convites";

/**
 * Libera o voucher de um convite. A regra de identidade depende do voucher:
 * - nenhuma: só o código (o primeiro aparelho que abrir fica com ele);
 * - numero: código + WhatsApp igual ao da lista;
 * - codigo: código + um código de confirmação que chega no WhatsApp da lista.
 * Toda a parte que decide (vaga, bloqueio, aparelho) roda no banco, de forma atômica.
 */
export async function POST(req: NextRequest) {
  try {
    const { voucherId, codigo, whatsapp, otp, dispositivo } = await req.json();
    if (typeof voucherId !== "string" || !UUID.test(voucherId)) return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 404 });
    const cod = limparCodigo(typeof codigo === "string" ? codigo : "");
    const disp = typeof dispositivo === "string" ? dispositivo.slice(0, 64) : "";
    if (cod.length < 8 || disp.length < 8) return NextResponse.json({ ok: false, erro: "codigo_invalido" }, { status: 400 });

    const ip = ipHash(req);
    if (await passouDoLimiteIp(ip)) return NextResponse.json({ ok: false, erro: "muitas_tentativas" }, { status: 429 });

    const dados = await carregarVoucherPrivado(voucherId);
    if (!dados) return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 404 });
    const { voucher, negocio } = dados;

    const service = createServiceClient();
    const { data: c } = await service
      .from("voucher_convites")
      .select("id, status, whatsapp, dispositivo")
      .eq("voucher_id", voucherId)
      .eq("codigo", cod)
      .maybeSingle();

    let modo: "nenhuma" | "numero" | "verificado" = "nenhuma";
    if (c && voucher.verificacao === "numero") modo = "numero";

    if (c && voucher.verificacao === "codigo" && c.whatsapp) {
      const mesmoAparelho = c.status === "ativado" && c.dispositivo === disp;
      if (!mesmoAparelho && (c.status === "pendente" || c.status === "ativado")) {
        const tel = c.whatsapp;
        if (typeof otp !== "string" || !otp.trim()) {
          // Passo 1: manda o código. No máximo 3 envios por hora para cada convite.
          const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { count } = await service
            .from("voucher_convite_log")
            .select("id", { count: "exact", head: true })
            .eq("convite_id", c.id)
            .eq("evento", "otp_enviado")
            .gte("criado_em", desde);
          if ((count ?? 0) >= 3) return NextResponse.json({ ok: false, erro: "muitas_tentativas" }, { status: 429 });
          const enviou = await enviarOtpWhatsapp(tel);
          if (!enviou) return NextResponse.json({ ok: false, erro: "otp_indisponivel" }, { status: 503 });
          await service.from("voucher_convite_log").insert({ convite_id: c.id, voucher_id: voucherId, business_id: voucher.business_id, evento: "otp_enviado", ip_hash: ip });
          return NextResponse.json({ ok: false, etapa: "codigo_enviado", mascara: mascararWhatsapp(tel) });
        }
        // Passo 2: confere o código que a pessoa digitou.
        const certo = await conferirOtpWhatsapp(tel, otp);
        if (!certo) {
          const { data: f } = await service.rpc("convite_falha", { p_voucher_id: voucherId, p_codigo: cod, p_motivo: "otp_errado", p_ip: ip });
          const r = (f ?? {}) as { restantes?: number; bloqueado?: boolean };
          return NextResponse.json({ ok: false, erro: r.bloqueado ? "bloqueado" : "otp_errado", restantes: r.restantes ?? null }, { status: 400 });
        }
        modo = "verificado";
      }
    }

    const { data, error } = await service.rpc("convite_ativar", {
      p_voucher_id: voucherId,
      p_codigo: cod,
      p_modo: modo,
      p_whatsapp: typeof whatsapp === "string" ? whatsapp.slice(0, 30) : null,
      p_dispositivo: disp,
      p_ip: ip,
    });
    if (error) {
      console.error("convite_ativar", error);
      return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 500 });
    }
    const r = (data ?? {}) as Record<string, unknown>;
    if (!r.ok) return NextResponse.json(r, { status: r.erro === "codigo_invalido" || r.erro === "numero_nao_confere" ? 400 : 409 });

    const { business_id: _b, verificacao: _v, ...vPublico } = voucher;
    void _b; void _v;
    return NextResponse.json({ ...r, voucher: vPublico, negocio: { name: negocio.name, slug: negocio.slug, logo_url: negocio.logo_url } });
  } catch (e) {
    console.error("convites/ativar", e);
    return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 500 });
  }
}
