import { Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Temporary — replaced wholesale once the Setup wizard is built (the
 * next piece of work after Access). Deliberately honest rather than a
 * broken redirect to a page that doesn't exist yet: someone with no
 * tenant sees a real, clear message, not a dead end.
 */
export function NoTenantPage() {
  return (
    <Card className="border-(--border) bg-white shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-(--primary) text-white shadow-sm">
            <Landmark className="size-6" />
          </div>
        </div>
        <div className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            No cooperative yet
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-center text-sm text-(--muted-foreground)">
          You're not part of a cooperative on this platform yet. Setting one
          up from here is coming soon — for now, ask whoever invited you to
          add you to their cooperative, or check back shortly.
        </p>
      </CardContent>
    </Card>
  );
}
