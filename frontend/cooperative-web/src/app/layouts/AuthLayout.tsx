import { Outlet } from "react-router";

/**
 * Layout for public auth pages.
 * Keeps a clean, focused surface with light brand expression.
 */
export function AuthLayout() {
  return (
    <div className="app-shell-bg flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}