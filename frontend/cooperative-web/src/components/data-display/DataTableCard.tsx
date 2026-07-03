import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface DataTableCardProps {
  toolbar?: ReactNode;
  children: ReactNode;
}

export function DataTableCard({ toolbar, children }: DataTableCardProps) {
  return (
    <Card className="overflow-hidden border-[var(--border)] bg-white">
      {toolbar}
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}