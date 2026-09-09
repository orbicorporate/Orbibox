import { getInspirePhotos } from "@/lib/inspirePhotos";
import { InspireUploader } from "./InspireUploader";

export default async function InspireUploadPage() {
  const existing = await getInspirePhotos();

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[24px] font-medium tracking-[-0.02em]">
        Upload de fotos · Inspire-se
      </h1>
      <p className="mt-1 text-[13px] text-text-secondary">
        Sobe as fotos de cada tema. A IA sugere um nome pra cada foto; você edita o que quiser e salva. Dá pra voltar e
        editar os nomes depois.
      </p>
      <InspireUploader existing={existing} />
    </div>
  );
}
