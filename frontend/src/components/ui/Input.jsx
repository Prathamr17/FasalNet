import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const Input = forwardRef(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "w-full rounded-sm border-[1.5px] border-line bg-surface-light px-3.5 py-2.5 text-sm text-ink",
      "font-body placeholder:text-ink-soft outline-none transition-all duration-150",
      "focus:border-accent focus:shadow-glow-accent",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export default Input;
