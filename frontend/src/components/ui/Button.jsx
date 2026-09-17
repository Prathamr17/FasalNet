import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-body font-semibold " +
    "transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none " +
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg border border-accent-dark shadow-subtle hover:bg-accent-dark",
        secondary:
          "bg-surface-card text-ink border border-line hover:border-accent hover:text-accent",
        ghost: "bg-transparent text-ink-muted hover:text-accent",
        outline:
          "bg-transparent border border-line text-ink hover:border-accent hover:text-accent",
        danger: "bg-danger-bg text-danger border border-danger hover:bg-danger hover:text-white",
        link: "text-accent underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "text-xs px-3 py-1.5",
        md: "text-sm px-4.5 px-[18px] py-2.5",
        lg: "text-base px-7 py-3.5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

const Button = forwardRef(
  ({ className, variant, size, as: Comp = "button", ...props }, ref) => {
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export default Button;
