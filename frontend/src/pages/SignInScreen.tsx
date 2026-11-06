import { useAuth } from "../auth";

/**
 * Signed-out landing screen (p1-react-walkthrough.md row 1a). Collects no
 * credentials itself — in production this button redirects to Keycloak's
 * hosted login page; here it calls the dev auth stub.
 */
export function SignInScreen() {
  const { status, signIn } = useAuth();
  const isAuthenticating = status === "authenticating";

  return (
    <div className="jb-main jb-signin">
      <div className="jb-card jb-signin-card">
        <span className="jb-badge-demo">Synthetic Data – Demo Only</span>
        <h1>The Jewish Board</h1>
        <p className="jb-signin-tagline">Care for all New Yorkers</p>
        <p>
          Clinical Documentation Assistant helps clinicians draft progress
          notes and treatment plan updates, and checks them against each
          program&rsquo;s NY State documentation requirements.
        </p>
        <button
          type="button"
          className="jb-btn-primary"
          onClick={signIn}
          disabled={isAuthenticating}
          aria-busy={isAuthenticating}
        >
          {isAuthenticating ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
