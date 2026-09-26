import Link from "next/link";
import { loadConfigData } from "../loadConfigData";
import { ConfigForm } from "../ConfigForm";

export default async function ConfigMarcaPage() {
  const { business, orbiColors, heroGradient } = await loadConfigData();
  return (
    <div className="flex flex-col">
      <Link href="/admin/config" className="mt-2 text-[14px] text-text-tertiary hover:underline">← Configurações</Link>
      <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[30px] font-medium tracking-[-0.02em]">Sua marca</h1>
      <p className="mt-1 text-[14px] text-text-secondary">Como seu negócio aparece pra quem abre o link.</p>
      <div className="mt-5">
        <ConfigForm
          business={business}
          section="marca"
          orbiColors={orbiColors}
          heroGradient={heroGradient}
          heroStyle={(business as { hero_style?: string | null }).hero_style ?? null}
          embutido
        />
      </div>
    </div>
  );
}
