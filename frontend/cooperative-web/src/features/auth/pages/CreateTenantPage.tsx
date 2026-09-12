import { useState } from "react";
import { Landmark } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useCreateTenant } from "@/features/auth/hooks/useCreateTenant";
import { useAuthResultHandler } from "@/features/auth/hooks/useAuthResultHandler";

/**
 * Setup, step one. Reached only from LoginPage's "no_tenant" branch,
 * carrying the pre-auth token via route state — never asks for
 * credentials again. Routes its success through the same shared
 * completeSession every other auth flow uses, rather than its own
 * separate copy — this is specifically what makes the phone-number
 * gate apply here too, not just to plain login/OAuth.
 */
export function CreateTenantPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const createTenantMutation = useCreateTenant();
  const { completeSession } = useAuthResultHandler();

  const preAuthToken = (location.state as { preAuthToken?: string } | null)?.preAuthToken;
  const [name, setName] = useState("");

  if (!preAuthToken) {
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
          completeSession(response, {
            nextOverride: "/app/setup/scheme",
            successMessage: `${trimmed} is set up`,
          });
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
