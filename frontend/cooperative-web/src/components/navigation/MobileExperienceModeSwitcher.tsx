import { BriefcaseBusiness, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";

export function MobileExperienceModeSwitcher() {
  const { mode, setMode } = useExperienceMode();

  const isCommunity = mode === "community";

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start gap-2 md:hidden"
      onClick={() => setMode(isCommunity ? "professional" : "community")}
    >
      {isCommunity ? (
        <>
          <HeartHandshake className="size-4" />
          Community Mode
        </>
      ) : (
        <>
          <BriefcaseBusiness className="size-4" />
          Professional Mode
        </>
      )}
    </Button>
  );
}