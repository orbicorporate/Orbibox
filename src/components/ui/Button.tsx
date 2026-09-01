import { ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/utils";

type Variant = "primary" | "secondary" | "orbi" | "ghost";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[28px] px-6 py-3 text-[15px] font-medium transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed";
  const variants: Record<Variant, string> = {
    primary: "bg-button-primary text-white",
    secondary: "bg-button-secondary text-on-background",
    orbi: "orbi-gradient text-on-background",
    ghost: "bg-transparent text-on-background border border-divider",
  };
  return <button className={clsx(base, variants[variant], className)} {...props} />;
}
