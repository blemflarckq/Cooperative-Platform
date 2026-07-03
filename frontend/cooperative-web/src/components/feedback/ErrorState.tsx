import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorStateProps {
  title?: string;
  description?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this information. Please try again.",
}: ErrorStateProps) {
  return (
    <Card className="border-red-200 bg-white">
      <CardContent className="flex gap-4 p-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <AlertTriangle className="size-5" />
        </div>

        <div>
          <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}