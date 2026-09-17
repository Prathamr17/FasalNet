import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Card = forwardRef(({ className, hover = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-surface-card border border-line border-t-2 border-t-line-strong rounded-panel shadow-subtle",
      hover &&
        "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-card hover:border-accent/40",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pb-3", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-display text-lg font-semibold text-ink", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-ink-muted mt-1", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-3", className)} {...props} />
));
CardContent.displayName = "CardContent";

export default Card;
