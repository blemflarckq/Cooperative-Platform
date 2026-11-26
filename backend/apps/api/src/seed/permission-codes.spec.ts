import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { PERMISSIONS } from './permissions.seed';
import { ROLE_PERMISSION_MAP } from '../modules/identity/services/tenant-role-bootstrap';

/**
 * A permission a route asks for that the seed never creates is a route
 * nobody can ever call — and nothing complains: the guard just answers
 * "Insufficient permissions" forever. That is exactly how the member
 * role endpoints went unusable (they asked for three `tenant_user_roles:*`
 * codes that were never created). This test makes that class of mistake
 * fail loudly: every code used by a route, and every code handed out by
 * default to a role, must exist in the seed.
 */

const seeded = new Set(
  PERMISSIONS.flatMap((group) => group.actions.map((a) => `${group.resource}:${a.action}`)),
);

function sourceFiles(dir: string, suffix: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, suffix, found);
    else if (name.endsWith(suffix)) found.push(path);
  }
  return found;
}

describe('permission codes', () => {
  it('every code a controller route requires exists in the seed', () => {
    const root = join(__dirname, '..');
    const used: Array<{ code: string; file: string }> = [];

    for (const file of sourceFiles(root, '.controller.ts')) {
      const text = readFileSync(file, 'utf8');
      for (const call of text.matchAll(/@RequirePermissions\(([^)]*)\)/g)) {
        for (const literal of call[1].matchAll(/['"]([^'"]+)['"]/g)) {
          used.push({ code: literal[1], file: file.slice(root.length + 1) });
        }
      }
    }

    expect(used.length).toBeGreaterThan(50); // the scan actually found the routes
    const missing = used.filter((u) => !seeded.has(u.code));
    expect(missing).toEqual([]);
  });

  it('every code granted to a default role exists in the seed', () => {
    const missing: string[] = [];
    for (const [role, codes] of Object.entries(ROLE_PERMISSION_MAP)) {
      for (const code of codes) {
        if (!seeded.has(code)) missing.push(`${role} → ${code}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('the role-grant list inside the seed script only names real permissions', () => {
    // role-permissions.seed.ts still carries its own list. Until it is
    // folded into the bootstrap map, at least make sure every code in it
    // is real, so the two cannot drift into granting different things.
    const text = readFileSync(join(__dirname, 'role-permissions.seed.ts'), 'utf8');
    const codes = [...text.matchAll(/^\s*['"]([a-z_.\-]+(?::[a-z_.\-]+)+)['"],?\s*$/gm)].map((m) => m[1]);
    expect(codes.length).toBeGreaterThan(100);
    expect(codes.filter((c) => !seeded.has(c))).toEqual([]);
  });
});
