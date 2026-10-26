import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-foreground/8", className)}
      {...props}
    />
  );
}

export { Skeleton };
