import { useState } from "react";
import { Phone } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { getAccessToken, getRefreshToken } from "@/lib/auth/auth-storage";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useSetMobile } from "@/features/auth/hooks/useSetMobile";

/**
 * A general gate, not an OAuth-specific patch — anyone with a real
 * session but no phone number on file lands here before going anywhere
 * else, the same way MustChangePasswordGuard intercepts a temporary
 * password. Mobile money is genuinely core to this platform, which is
 * why this is a hard stop rather than a skippable prompt.
 */
export function AddPhoneNumberPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const setMobileMutation = useSetMobile();

  const next = (location.state as { next?: string } | null)?.next ?? "/app/dashboard";
  const [mobile, setMobile] = useState("");

  function handleSubmit() {
    const trimmed = mobile.trim();
    if (!trimmed || !user) return;

    setMobileMutation.mutate(trimmed, {
      onSuccess: (result) => {
        const accessToken = getAccessToken();
        const refreshToken = getRefreshToken();

        if (accessToken && refreshToken) {
          login({
            accessToken,
            refreshToken,
            user: { ...user, mobile: result.mobile },
          });
        }

        toast.success("Phone number saved");
        navigate(next, { replace: true });
      },
      onError: (error) => toast.error(getApiErrorMessage(error)),
    });
  }

  return (
    <Card className="border-(--border) bg-white shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-(--primary) text-white shadow-sm">
            <Phone className="size-6" />
          </div>
        </div>
        <div className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            What's your phone number?
          </CardTitle>
          <p className="mt-2 text-sm text-(--muted-foreground)">
            We'll use this to connect your mobile money account later — it's
            how most people will actually use this platform day to day.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="e.g. 5812 3456"
          autoFocus
        />
        <Button
          className="w-full"
          disabled={!mobile.trim() || setMobileMutation.isPending}
          onClick={handleSubmit}
        >
          {setMobileMutation.isPending ? "Saving..." : "Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
