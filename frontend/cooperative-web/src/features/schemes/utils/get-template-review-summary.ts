import { FUND_TEMPLATES } from "../constants/fund-templates";
import { type FundTemplateId } from "../types/fund-template.types";
import { type SchemeFormValues } from "../schemas/scheme.schema";
import { getFundRuleSummary } from "./get-fund-rule-summary";

interface ReviewLine {
  label: string;
  value: string;
}

export interface TemplateReviewSummary {
  title: string;
  description: string;
  lines: ReviewLine[];
}

export function getTemplateReviewSummary(
  templateId: FundTemplateId,
  values: SchemeFormValues,
): TemplateReviewSummary {
  const template = FUND_TEMPLATES.find((item) => item.id === templateId);
  const rules = getFundRuleSummary(values);

  return {
    title: template?.title ?? "Custom Fund",
    description:
      template?.description ??
      "A custom fund configured using your selected rules.",
    lines: [
      {
        label: "Fund name",
        value: values.name || "Not provided yet",
      },
      {
        label: "How it runs",
        value: rules.find((rule) => rule.id === "cycleMode")?.text ?? "",
      },
      {
        label: "How people contribute",
        value:
          rules.find((rule) => rule.id === "contributionMode")?.text ?? "",
      },
      {
        label: "Loans",
        value: rules.find((rule) => rule.id === "loanMode")?.text ?? "",
      },
      {
        label: "What happens to the money",
        value: rules.find((rule) => rule.id === "payoutMode")?.text ?? "",
      },
    ],
  };
}