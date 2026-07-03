export function slugifyCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildPeriodCode(startsOn: string, endsOn: string): string {
  const startYear = startsOn.slice(0, 4);
  const endYear = endsOn.slice(0, 4);

  if (startsOn.endsWith("-01-01") && endsOn.endsWith("-12-31")) {
    return startYear === endYear ? `FY${startYear}` : `FY${startYear}-${endYear}`;
  }

  return `PER-${startsOn}-${endsOn}`;
}