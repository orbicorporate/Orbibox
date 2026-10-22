import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[440px] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-[family-name:var(--font-manrope)] text-[56px] font-medium leading-none tracking-[-0.02em]">404</p>
      <h1 className="text-[18px] font-medium">Essa página não foi encontrada</h1>
      <p className="text-[14px] leading-snug text-text-secondary">
        O link pode estar errado, o item pode estar em rascunho ou você pode estar em outra conta. Volte ao início e tente de novo.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Link href="/admin" className="inline-flex min-h-[48px] items-center rounded-full bg-button-primary px-6 text-[14.5px] font-medium text-white">Ir para o painel</Link>
        <Link href="/" className="inline-flex min-h-[48px] items-center rounded-full bg-surface-soft px-6 text-[14.5px] font-medium">Página inicial</Link>
      </div>
    </main>
  );
}
