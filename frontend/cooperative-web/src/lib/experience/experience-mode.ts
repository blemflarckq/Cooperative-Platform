export type ExperienceMode = "community" | "professional";

const EXPERIENCE_MODE_KEY = "coop.experience_mode";

export function getExperienceMode(): ExperienceMode {
  const stored = localStorage.getItem(EXPERIENCE_MODE_KEY);

  if (stored === "professional") return "professional";

  return "community";
}

export function setExperienceMode(mode: ExperienceMode) {
  localStorage.setItem(EXPERIENCE_MODE_KEY, mode);
}