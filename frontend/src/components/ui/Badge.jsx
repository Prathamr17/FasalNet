import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide border",
  {
    variants: {
      variant: {
        safe: "bg-safe-bg text-safe border-safe",
        warn: "bg-warn-bg text-warn border-warn",
        danger: "bg-danger-bg text-danger border-danger",
        info: "bg-info-bg text-info border-info",
        neutral: "bg-surface-muted text-ink-muted border-line",
        accent: "bg-accent-pale text-accent-dark border-accent",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export default function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
