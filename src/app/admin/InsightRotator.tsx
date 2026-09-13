"use client";

import { useState } from "react";
import Link from "next/link";
import { OrbiInsightCard, OrbiInsightHeader, OrbiSparkleMini, orbiInsightCtaClass } from "@/components/orbi/OrbiInsightCard";
import { ShareOrbiboxButton } from "@/components/mobile/ShareOrbiboxButton";

type Tip = { title: string; description: string; ctaLabel: string; href: string; share?: boolean };

export function InsightRotator({
  tips,
  startIndex,
  shareUrl,
  shareTitle,
  shareReady,
}: {
  tips: Tip[];
  startIndex: number;
  shareUrl: string;
  shareTitle: string;
  shareReady: boolean;
}) {
  const [i, setI] = useState(startIndex % Math.max(1, tips.length));
  const insight = tips[i];
  if (!insight) return null;

  function proximo() {
    setI((v) => (v + 1) % tips.length);
  }

  return (
    <div data-tour="insights" className="mt-8">
      <OrbiInsightCard>
        <div className="relative flex items-center justify-between">
          <OrbiInsightHeader />
          {tips.length > 1 && (
            <button
              onClick={proximo}
              className="flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-[12px] font-semibold text-text-secondary active:bg-white"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
              Novo insight
            </button>
          )}
        </div>
        <div className="relative mt-4">
          <p className="text-[19px] font-medium leading-tight text-on-background">{insight.title}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{insight.description}</p>
        </div>
        {insight.share ? (
          <ShareOrbiboxButton url={shareUrl} title={shareTitle} shareReady={shareReady} className={orbiInsightCtaClass}>
            {insight.ctaLabel} <OrbiSparkleMini />
          </ShareOrbiboxButton>
        ) : (
          <Link href={insight.href} className={orbiInsightCtaClass}>
            {insight.ctaLabel} <OrbiSparkleMini />
          </Link>
        )}
      </OrbiInsightCard>
    </div>
  );
}
