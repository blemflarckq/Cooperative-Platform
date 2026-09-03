import { useState } from "react";
import { Landmark } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { mapAuthenticatedUser } from "@/features/auth/api/auth.mapper";
import { useCreateTenant } from "@/features/auth/hooks/useCreateTenant";

/**
 * Setup, step one. Reached only from LoginPage's "no_tenant" branch,
 * carrying the pre-auth token via route state — never asks for
 * credentials again. On success, lands fully authenticated as the new
 * tenant's admin and moves straight to step two (what's this for).
 */
export function CreateTenantPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const createTenantMutation = useCreateTenant();

  const preAuthToken = (location.state as { preAuthToken?: string } | null)?.preAuthToken;
  const [name, setName] = useState("");

  if (!preAuthToken) {
    // Reached directly, not via login — no valid session to create
    // against. Back to the start rather than a confusing dead end.
    navigate("/login", { replace: true });
    return null;
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed || !preAuthToken) return;

    createTenantMutation.mutate(
      { preAuthToken, name: trimmed },
      {
        onSuccess: (response) => {
          const mappedUser = mapAuthenticatedUser(response.user);
          login({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: mappedUser,
          });
          toast.success(`${trimmed} is set up`);
          navigate("/app/setup/scheme", { replace: true });
        },
        onError: (error) => toast.error(getApiErrorMessage(error)),
      },
    );
  }

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
            What's your cooperative called?
          </CardTitle>
          <p className="mt-2 text-sm text-(--muted-foreground)">
            This is the name your members will see.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Bohale Savings Club"
          autoFocus
        />
        <Button
          className="w-full"
          disabled={!name.trim() || createTenantMutation.isPending}
          onClick={handleSubmit}
        >
          {createTenantMutation.isPending ? "Setting up..." : "Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
