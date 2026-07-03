import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export function UnauthorizedPage() {
  return (
    <div>
      <PageHeader
        title="Access denied"
        description="You do not have permission to access this area."
        backTo="/app/dashboard"
        backLabel="Back to Dashboard"
      />

      <Card className="border-border bg-white">
        <CardContent className="flex gap-4 p-6">
          <div className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <ShieldAlert className="size-5" />
          </div>

          <div>
            <h2 className="font-semibold text-foreground">
              Permission required
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Contact an administrator if you believe you should have access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}