import { HugeiconsIcon } from "@hugeicons/react";
import { Loading01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

function Spinner({
  className,
  ...props
}: React.ComponentProps<typeof HugeiconsIcon>) {
  return (
    <HugeiconsIcon
      aria-label="Loading"
      {...props}
      className={cn("animate-spin", className)}
      icon={Loading01Icon}
      role="status"
    />
  );
}

export { Spinner };
