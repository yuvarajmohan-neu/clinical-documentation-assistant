import type { UserProfile } from "oidc-client-ts";
import type { Principal } from "./types";

export function principalFromProfile(profile: UserProfile): Principal | null {
  const userId = nonEmptyString(profile.sub);
  if (!userId) {
    return null;
  }

  const roles = realmRolesFromProfile(profile);

  return {
    userId,
    name:
      nonEmptyString(profile.name) ??
      nonEmptyString(profile.preferred_username) ??
      userId,
    roles: roles.filter((role) => !role.startsWith("program:")),
    programs: roles
      .filter((role) => role.startsWith("program:"))
      .map((role) => role.slice("program:".length)),
  };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function realmRolesFromProfile(profile: UserProfile): string[] {
  const realmAccess = profile.realm_access;
  if (typeof realmAccess !== "object" || realmAccess === null) {
    return [];
  }

  const roles = (realmAccess as Record<string, unknown>).roles;
  return Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === "string")
    : [];
}
