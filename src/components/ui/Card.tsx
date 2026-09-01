import { HTMLAttributes } from "react";
import { clsx } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-[28px] bg-surface-white border border-divider p-6 shadow-[0_1px_3px_rgba(17,19,24,0.04)]",
        className
      )}
      {...props}
    />
  );
}
