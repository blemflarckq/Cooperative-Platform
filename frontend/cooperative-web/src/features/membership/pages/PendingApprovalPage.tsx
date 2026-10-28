import { Clock } from "lucide-react";
import { Link, useLocation } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Where someone lands if they sign in while their request to join a
 * cooperative is still undecided. Deliberately offers nothing to do —
 * no "create your own cooperative," no retry — because there is nothing
 * for them to act on until the request is decided. The copy avoids
 * stating the time limit as a number: it's a setting that's meant to
 * become configurable, and a figure baked into the wording here would
 * quietly go stale when it does.
 */
export function PendingApprovalPage() {
  const location = useLocation();
  const tenantName = (location.state as { tenantName?: string } | null)?.tenantName;

  return (
    <Card className="border-(--border) bg-white shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-(--primary) text-white shadow-sm">
            <Clock className="size-6" />
          </div>
        </div>
        <div className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Waiting for approval</CardTitle>
          <p className="mt-2 text-sm text-(--muted-foreground)">
            Your request to join {tenantName ?? "this cooperative"} is with their admin and
            treasurer. Once two of them approve it, sign in again and you'll be in. There's
            nothing else you need to do. If it isn't decided in time, it expires and you'd just
            need a new invite link.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild variant="ghost" className="w-full">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
