import { createContext } from "react";
import { type ExperienceMode } from "./experience-mode";

export interface ExperienceModeContextValue {
  mode: ExperienceMode;
  setMode: (mode: ExperienceMode) => void;
  isCommunityMode: boolean;
  isProfessionalMode: boolean;
}

export const ExperienceModeContext =
  createContext<ExperienceModeContextValue | null>(null);