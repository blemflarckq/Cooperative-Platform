import { type ReactNode, useMemo, useState } from "react";
import {
  type ExperienceMode,
  getExperienceMode,
  setExperienceMode,
} from "./experience-mode";
import { ExperienceModeContext } from "./experience-mode-context";

export function ExperienceModeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mode, setModeState] = useState<ExperienceMode>(() =>
    getExperienceMode(),
  );

  function setMode(nextMode: ExperienceMode) {
    setExperienceMode(nextMode);
    setModeState(nextMode);
  }

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isCommunityMode: mode === "community",
      isProfessionalMode: mode === "professional",
    }),
    [mode],
  );

  return (
    <ExperienceModeContext.Provider value={value}>
      {children}
    </ExperienceModeContext.Provider>
  );
}