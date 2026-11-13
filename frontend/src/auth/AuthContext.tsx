import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuthContextValue, AuthState, Principal } from "./types";

/**
 * Everything auth-related is isolated here so the real adapter swap stays
 * contained (docs/architecture.md §2.8): `react-oidc-context` against
 * Keycloak now, MSAL against Entra ID later. For this first scaffold only
 * the AUTH_PROVIDER=dev fallback is wired up, so the sign-in screen is
 * testable without a running Keycloak instance. The signed-in callback
 * handler and real OIDC redirect are P1's build.
 */
// Mirrors backend/app/mock_data.py DEV_PRINCIPAL. Two program roles so the demo shows the
// program picker; a single-program user would skip it.
const DEV_PRINCIPAL: Principal = {
  userId: "demo.clinician",
  name: "Demo Clinician",
  roles: ["clinician"],
  programs: ["article31", "health_home"],
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "signed-out",
    principal: null,
  });

  const signIn = useCallback(() => {
    setState({ status: "authenticating", principal: null });
    // Stands in for the Keycloak redirect + PKCE callback round trip.
    setTimeout(() => {
      setState({ status: "signed-in", principal: DEV_PRINCIPAL });
    }, 300);
  }, []);

  const signOut = useCallback(() => {
    setState({ status: "signed-out", principal: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signOut }),
    [state, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
