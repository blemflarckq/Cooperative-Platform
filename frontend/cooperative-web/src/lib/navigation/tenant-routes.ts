export function buildTenantAppPath(
  tenantSlug: string,
  appPath: string,
): string {
  const normalizedPath = appPath.startsWith("/")
    ? appPath
    : `/${appPath}`;

  return `/${tenantSlug}/app${normalizedPath}`;
}

export function buildTenantLoginPath(tenantSlug: string): string {
  return `/${tenantSlug}/login`;
}