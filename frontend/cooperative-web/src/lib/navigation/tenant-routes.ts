export function buildAppPath(appPath: string): string {
  const normalizedPath = appPath.startsWith("/") ? appPath : `/${appPath}`;
  return `/app${normalizedPath}`;
}

export function buildLoginPath(): string {
  return "/login";
}
