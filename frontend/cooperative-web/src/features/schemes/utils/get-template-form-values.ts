import { FUND_TEMPLATES } from "../constants/fund-templates";
import { type SchemeFormValues } from "../schemas/scheme.schema";
import { type FundTemplateId } from "../types/fund-template.types";

export function getTemplateFormValues(
  templateId: FundTemplateId,
): Partial<SchemeFormValues> {
  const template = FUND_TEMPLATES.find((item) => item.id === templateId);

  if (!template) return {};

  return {
    name: "",
    description: template.description,
    cycleMode: template.defaults.cycleMode,
    contributionMode: template.defaults.contributionMode,
    loanMode: template.defaults.loanMode,
    payoutMode: template.defaults.payoutMode,
  };
}