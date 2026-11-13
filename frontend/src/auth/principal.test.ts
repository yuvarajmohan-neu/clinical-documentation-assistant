import type { UserProfile } from "oidc-client-ts";
import { describe, expect, it } from "vitest";
import { principalFromProfile } from "./principal";

function profile(claims: Record<string, unknown> = {}): UserProfile {
  return {
    iss: "http://localhost:8080/realms/healthcare",
    sub: "subject-123",
    aud: "clinician_app",
    exp: 1_800_000_000,
    iat: 1_700_000_000,
    ...claims,
  };
}

describe("principalFromProfile", () => {
  it("uses the verified subject and maps Keycloak realm and program roles", () => {
    expect(
      principalFromProfile(
        profile({
          preferred_username: "jane.clinician",
          name: "Jane Clinician",
          realm_access: {
            roles: ["clinician", "program:article31", "program:adult_act"],
          },
        }),
      ),
    ).toEqual({
      userId: "subject-123",
      name: "Jane Clinician",
      roles: ["clinician"],
      programs: ["article31", "adult_act"],
    });
  });

  it("does not create a signed-in principal without a subject claim", () => {
    expect(principalFromProfile(profile({ sub: "" }))).toBeNull();
  });

  it("uses the verified subject when optional display claims are absent", () => {
    expect(principalFromProfile(profile())).toEqual({
      userId: "subject-123",
      name: "subject-123",
      roles: [],
      programs: [],
    });
  });
});
