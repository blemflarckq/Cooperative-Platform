import { Badge } from "@/components/ui/badge";
import { getLifecyclePresentation } from "@/lib/domain/lifecycle";
import { getStatusTone, getStatusToneClass } from "@/lib/domain/status-style";
import { cn } from "@/lib/utils/cn";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const presentation = getLifecyclePresentation(status);
  const tone = getStatusTone(status);

  return (
    <Badge
      variant="outline"
      title={presentation.description}
      className={cn("capitalize", getStatusToneClass(tone))}
    >
      {presentation.label}
    </Badge>
  );
}