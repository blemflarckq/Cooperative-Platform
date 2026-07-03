import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  fallbackTo?: string;
  label?: string;
}

/**
 * Standard back button for deeper screens.
 *
 * It tries browser history first, but also supports a safe fallback route.
 * This makes detail/edit/create pages feel easier to escape from.
 */
export function BackButton({
  fallbackTo = "/app/dashboard",
  label = "Back",
}: BackButtonProps) {
  const navigate = useNavigate();

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackTo);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleBack}
      className="mb-4 -ml-2 gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
    >
      <ArrowLeft className="size-4" />
      {label}
    </Button>
  );
}