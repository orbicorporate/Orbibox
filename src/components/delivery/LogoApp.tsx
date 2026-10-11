import { appPorId, type AppDeliveryId } from "@/lib/delivery";

/**
 * Selo do app de delivery: a cor da marca com o nome. Fica num lugar só, então
 * trocar por arquivos de logo oficiais depois é mudar este componente.
 */
export function LogoApp({ id, tamanho = 48 }: { id: AppDeliveryId; tamanho?: number }) {
  const app = appPorId(id);
  if (!app) return null;
  const longo = app.marca.length > 6;
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-[14px] font-[family-name:var(--font-manrope)] font-extrabold leading-none tracking-[-0.03em]"
      style={{ width: tamanho, height: tamanho, backgroundColor: app.cor, color: app.texto, fontSize: tamanho * (longo ? 0.2 : 0.26), boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)" }}
    >
      {id === "99food" ? <span style={{ fontSize: tamanho * 0.42 }}>99</span> : id === "ubereats" ? <span className="text-center" style={{ fontSize: tamanho * 0.19, lineHeight: 1.05 }}>Uber<br />Eats</span> : app.marca}
    </span>
  );
}
