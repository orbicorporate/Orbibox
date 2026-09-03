// Aparece no instante do toque, enquanto o servidor responde — o app deixa de parecer travado.
export default function Loading() {
  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="mx-auto h-8 w-48 animate-pulse rounded-full bg-surface-soft" />
      <div className="mx-auto h-4 w-32 animate-pulse rounded-full bg-surface-soft" />
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-[22px] bg-surface-soft" />
        ))}
      </div>
    </div>
  );
}
