import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { type DomainTerm, getTerm, getTermPlural } from "./terminology";

export function useTerminology() {
  const { mode } = useExperienceMode();

  return {
    mode,
    term: (term: DomainTerm) => getTerm(term, mode),
    terms: (term: DomainTerm) => getTermPlural(term, mode),
  };
}