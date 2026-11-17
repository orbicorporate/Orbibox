import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { carregarVoucherPrivado, ipHash, passouDoLimiteIp, UUID } from "@/lib/convitesServidor";
import { limparCodigo, mascararWhatsapp, primeiroNome } from "@/lib/convites";

/**
 * Primeiro passo de quem recebe o convite: mostra o voucher (sem o código de balcão) e, se a
 * pessoa já digitou o código, o que falta para liberar. Nunca devolve o número completo.
 */
export async function POST(req: NextRequest) {
  try {
    const { voucherId, codigo, dispositivo } = await req.json();
    if (typeof voucherId !== "string" || !UUID.test(voucherId)) return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 404 });
    if (await passouDoLimiteIp(ipHash(req))) return NextResponse.json({ ok: false, erro: "muitas_tentativas" }, { status: 429 });

    const dados = await carregarVoucherPrivado(voucherId);
    if (!dados) return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 404 });
    const { voucher, negocio } = dados;
    const { business_id: _b, ...vPublico } = voucher;
    void _b;
    const base = {
      ok: true,
      negocio: { name: negocio.name, slug: negocio.slug, logo_url: negocio.logo_url },
      voucher: vPublico,
    };

    const cod = limparCodigo(typeof codigo === "string" ? codigo : "");
    if (cod.length < 8) return NextResponse.json({ ...base, convite: null });

    const service = createServiceClient();
    const { data: c } = await service
      .from("voucher_convites")
      .select("status, nome, whatsapp, dispositivo")
      .eq("voucher_id", voucherId)
      .eq("codigo", cod)
      .maybeSingle();
    if (!c) {
      // Conta como tentativa errada do IP, mas não revela se o código existe.
      await service.from("voucher_convite_log").insert({ voucher_id: voucherId, business_id: voucher.business_id, evento: "codigo_invalido", ip_hash: ipHash(req) });
      return NextResponse.json({ ...base, convite: { estado: "invalido" } });
    }
    return NextResponse.json({
      ...base,
      convite: {
        estado: c.status,
        mesmoAparelho: c.status === "ativado" && typeof dispositivo === "string" && dispositivo.length >= 8 && c.dispositivo === dispositivo,
        nome: primeiroNome(c.nome) || null,
        mascara: c.whatsapp ? mascararWhatsapp(c.whatsapp) : null,
        pedeNumero: voucher.verificacao === "numero" && !!c.whatsapp,
        pedeCodigoWhatsapp: voucher.verificacao === "codigo" && !!c.whatsapp,
      },
    });
  } catch (e) {
    console.error("convites/abrir", e);
    return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 500 });
  }
}
