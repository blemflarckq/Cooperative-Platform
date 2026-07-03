import { useContext } from "react";
import { ExperienceModeContext } from "./experience-mode-context";

export function useExperienceMode() {
  const context = useContext(ExperienceModeContext);

  if (!context) {
    throw new Error(
      "useExperienceMode must be used within ExperienceModeProvider",
    );
  }

  return context;
}