import { cn } from "@/lib/utils";

export function Logo({
  className,
  wordmark = true,
  inverted = false,
}: {
  className?: string;
  wordmark?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative grid size-9 place-items-center rounded-2xl",
          inverted ? "bg-white/10" : "bg-primary",
        )}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none">
          <path
            d="M7 8.5h7.2a3.3 3.3 0 0 1 0 6.6H12"
            stroke={inverted ? "#F4F7F6" : "white"}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M9.4 6.2 7 8.5l2.4 2.3"
            stroke={inverted ? "#F4F7F6" : "white"}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17 15.5H9.8a3.3 3.3 0 1 1 0-6.6H12"
            stroke={inverted ? "#7EE0D4" : "rgba(255,255,255,.7)"}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M14.6 17.8 17 15.5l-2.4-2.3"
            stroke={inverted ? "#7EE0D4" : "rgba(255,255,255,.7)"}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {wordmark ? (
        <span className={cn("font-display text-lg tracking-tight", inverted ? "text-white" : "text-foreground")}>
          Return<span className="text-primary">IQ</span>
        </span>
      ) : null}
    </div>
  );
}
