"use client";

export function InsightScrollButton() {
  function irParaInsight() {
    const el = document.getElementById("insight-marketing");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <button
      onClick={irParaInsight}
      className="orbi-gradient mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-bold text-on-background"
    >
      ✦ Ver insight de marketing
      <span aria-hidden>↓</span>
    </button>
  );
}
