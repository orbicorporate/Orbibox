import { InspireUploader } from "./InspireUploader";

export default function InspireUploadPage() {
  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[24px] font-medium tracking-[-0.02em]">
        Upload de fotos · Inspire-se
      </h1>
      <p className="mt-1 text-[13px] text-text-secondary">
        Ferramenta interna: sobe as fotos dos temas pro Storage e mostra as URLs públicas pra colar no código.
      </p>
      <InspireUploader />
    </div>
  );
}
