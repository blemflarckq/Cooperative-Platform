import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ResetPasswordPlaceholderPage() {
  return (
    <div className="app-shell-bg flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border-[var(--border)] bg-white">
        <CardHeader>
          <CardTitle>Password Reset</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--muted-foreground)]">
          Password reset will be implemented once reset-token endpoints are
          available.
        </CardContent>
      </Card>
    </div>
  );
}