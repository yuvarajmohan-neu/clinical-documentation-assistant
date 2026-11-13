import {
  AuthProvider as OidcProvider,
  useAuth as useOidcAuth,
} from "react-oidc-context";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuthContextValue, AuthState, Principal } from "./types";
import { principalFromProfile } from "./principal";

const DEV_PRINCIPAL: Principal = {
  userId: "art31.clinician",
  name: "Demo Clinician",
  roles: ["clinician"],
  programs: ["article31"],
};

const AuthContext = createContext<AuthContextValue | null>(null);

const appRedirectUri = window.location.origin;

const oidcSettings = {
  authority:
    import.meta.env.VITE_OIDC_ISSUER ?? "http://localhost:8080/realms/healthcare",
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID ?? "clinician_app",
  redirect_uri: appRedirectUri,
  post_logout_redirect_uri: appRedirectUri,
  response_type: "code",
  disablePKCE: false,
  scope: "openid profile email roles",
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const provider = import.meta.env.VITE_AUTH_PROVIDER ?? "oidc";

  if (provider === "oidc") {
    return (
      <OidcProvider {...oidcSettings}>
        <OidcAuthBridge>{children}</OidcAuthBridge>
      </OidcProvider>
    );
  }

  if (provider !== "dev") {
    throw new Error(`Unsupported VITE_AUTH_PROVIDER: ${provider}`);
  }

  return <DevAuthProvider>{children}</DevAuthProvider>;
}

function DevAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "signed-out",
    principal: null,
    error: null,
  });

  const signIn = useCallback(() => {
    setState({ status: "authenticating", principal: null, error: null });
    window.setTimeout(() => {
      setState({ status: "signed-in", principal: DEV_PRINCIPAL, error: null });
    }, 300);
  }, []);

  const signOut = useCallback(() => {
    setState({ status: "signed-out", principal: null, error: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signOut }),
    [state, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function OidcAuthBridge({ children }: { children: ReactNode }) {
  const oidc = useOidcAuth();
  const [operationError, setOperationError] = useState<string | null>(null);
  const { signinRedirect, signoutRedirect } = oidc;

  const signIn = useCallback(() => {
    setOperationError(null);
    void signinRedirect().catch((error: unknown) => {
      setOperationError(errorMessage(error));
    });
  }, [signinRedirect]);

  const signOut = useCallback(() => {
    setOperationError(null);
    void signoutRedirect().catch((error: unknown) => {
      setOperationError(errorMessage(error));
    });
  }, [signoutRedirect]);

  // oidc-client-ts validates the ID token during the OIDC callback; do not
  // decode an access token in the browser and treat its claims as trusted.
  const hasValidatedIdToken =
    oidc.isAuthenticated && Boolean(oidc.user?.id_token) && !oidc.user?.expired;
  const principal =
    hasValidatedIdToken && oidc.user
      ? principalFromProfile(oidc.user.profile)
      : null;
  const status =
    oidc.isLoading || oidc.activeNavigator
      ? "authenticating"
      : principal
        ? "signed-in"
        : "signed-out";
  const identityError =
    hasValidatedIdToken && !principal
      ? "The verified sign-in token did not contain a valid user identity."
      : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      principal,
      error: operationError ?? oidc.error?.message ?? identityError,
      signIn,
      signOut,
    }),
    [status, principal, operationError, oidc.error, identityError, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The sign-in request failed.";
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
