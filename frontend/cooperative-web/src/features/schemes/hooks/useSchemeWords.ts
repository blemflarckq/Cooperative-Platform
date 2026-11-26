import { useExperienceMode } from "@/lib/experience/useExperienceMode";

/**
 * The words the screens use for a scheme and its cycles, in sentence case
 * and ready to drop into a sentence. The community / professional toggle
 * changes only these nouns and the names of the four rules — never the
 * layout — so there is one design to maintain, not two.
 */
export function useSchemeWords() {
  const { isCommunityMode } = useExperienceMode();

  return isCommunityMode
    ? {
        isCommunityMode,
        noun: "group fund",
        Noun: "Group fund",
        plural: "group funds",
        Plural: "Group funds",
        cycle: "activity period",
        Cycle: "Activity period",
        cycles: "activity periods",
        Cycles: "Activity periods",
      }
    : {
        isCommunityMode,
        noun: "scheme",
        Noun: "Scheme",
        plural: "schemes",
        Plural: "Schemes",
        cycle: "cycle",
        Cycle: "Cycle",
        cycles: "cycles",
        Cycles: "Cycles",
      };
}

export type SchemeWords = ReturnType<typeof useSchemeWords>;
