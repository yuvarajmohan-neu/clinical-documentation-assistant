/**
 * Shared auth types. Mirrors AuthProvider.verify() -> Principal in
 * docs/architecture.md §2.7/§2.8, so swapping the auth adapter (Keycloak,
 * Entra ID via MSAL, dev stub) never changes what the rest of the app sees.
 */
export interface Principal {
  userId: string;
  name: string;
  roles: string[];
  programs: string[];
}

export type AuthStatus = "signed-out" | "authenticating" | "signed-in";

export interface AuthState {
  status: AuthStatus;
  principal: Principal | null;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  signIn: () => void;
  signOut: () => void;
}
