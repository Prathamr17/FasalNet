import { cn } from "../../lib/utils";

export function Container({ className, ...props }) {
  return (
    <div
      className={cn("mx-auto w-full max-w-container px-5 sm:px-8 lg:px-10", className)}
      {...props}
    />
  );
}

export function Eyebrow({ className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft",
        className
      )}
      {...props}
    >
      <span className="h-px w-6 bg-line-strong" aria-hidden="true" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  titleClassName,
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          "font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight",
          titleClassName
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="max-w-2xl text-base text-ink-muted leading-relaxed">{description}</p>
      )}
    </div>
  );
}
