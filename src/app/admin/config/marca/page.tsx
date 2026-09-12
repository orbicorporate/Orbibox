import Link from "next/link";
import { loadConfigData } from "../loadConfigData";
import { ConfigForm } from "../ConfigForm";

export default async function ConfigSectionPage() {
  const { business, orbiColors, heroGradient } = await loadConfigData();
  return (
    <div className="flex flex-col">
      <Link href="/admin/config" className="mt-2 text-[14px] text-text-tertiary hover:underline">← Configurações</Link>
      <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[30px] font-medium tracking-[-0.02em]">Identidade e marca</h1>
      <ConfigForm business={business} orbiColors={orbiColors} heroGradient={heroGradient} section="marca" />
    </div>
  );
}
