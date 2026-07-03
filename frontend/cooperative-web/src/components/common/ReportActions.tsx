import { Download, FileText, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";

interface ReportActionsProps {
  printLabel?: string;
  csvLabel?: string;
  pdfLabel?: string;
  showExportPlaceholders?: boolean;
}

export function ReportActions({
  printLabel,
  csvLabel,
  pdfLabel,
  showExportPlaceholders = true,
}: ReportActionsProps) {
  const { isCommunityMode } = useExperienceMode();

  const resolvedPrintLabel =
    printLabel ?? (isCommunityMode ? "Print Report" : "Print");

  const resolvedCsvLabel =
    csvLabel ?? (isCommunityMode ? "Export Spreadsheet" : "Export CSV");

  const resolvedPdfLabel =
    pdfLabel ?? (isCommunityMode ? "Export PDF" : "Export PDF");

  function handlePrint() {
    window.print();
  }

  return (
    <div data-print-hidden="true" className="flex flex-wrap gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 size-4" />
          {resolvedPrintLabel}
        </Button>

        {showExportPlaceholders ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled
              title="CSV export is not available yet."
            >
              <Download className="mr-2 size-4" />
              {resolvedCsvLabel}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled
              title="PDF export is not available yet."
            >
              <FileText className="mr-2 size-4" />
              {resolvedPdfLabel}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}