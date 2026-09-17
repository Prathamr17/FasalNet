import { cn } from "../../lib/utils";

export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-sm bg-gradient-to-r from-surface-muted via-line to-surface-muted bg-[length:200%_100%] animate-[shimmer_1.4s_infinite]",
        className
      )}
      {...props}
    />
  );
}
