import { getInspirePhotos } from "@/lib/inspirePhotos";
import { InspireUploader } from "@/app/admin/inspire-upload/InspireUploader";

export default async function MasterInspire() {
  const existing = await getInspirePhotos();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-semibold tracking-[-0.02em]">Temas do Inspire-se</h1>
        <p className="mt-1 text-[14px] text-text-secondary">Suba e organize as fotos de cada tema. A IA sugere os nomes.</p>
      </div>
      <InspireUploader existing={existing} />
    </div>
  );
}
