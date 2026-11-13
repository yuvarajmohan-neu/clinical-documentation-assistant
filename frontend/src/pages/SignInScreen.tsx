import { useAuth } from "../auth";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Logo";

/**
 * Signed-out landing screen (docs/mockups/01-sign-in.png). Collects no credentials itself —
 * in production this button redirects to the hosted sign-in page; here it calls the dev stub.
 */
export function SignInScreen() {
  const { status, signIn } = useAuth();
  const isAuthenticating = status === "authenticating";

  return (
    <div className="signin">
      <div className="signin-card">
        <span className="badge-demo">Synthetic data – demo only</span>
        <Logo height={72}fallback={<p className="org">The Jewish Board</p>} />
        <p className="tagline">Care for all New Yorkers</p>
        <h1>Clinical Documentation Assistant</h1>
        <p className="lede">
          Draft progress notes and treatment plan updates, then check them against your
          program&rsquo;s New York State documentation requirements. You review and approve every
          change.
        </p>
        <ul>
          <li>
            <Icon name="pen" /> Write a note from typed or dictated session notes
          </li>
          <li>
            <Icon name="doc" /> Check a note you wrote somewhere else
          </li>
          <li>
            <Icon name="shield" /> Every issue links to the regulation it comes from
          </li>
        </ul>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={signIn}
          disabled={isAuthenticating}
          aria-busy={isAuthenticating}
        >
          {isAuthenticating ? "Signing in…" : "Sign in"}
        </button>
        <p className="fine">
          <Icon name="info" />
          <span>
            <b>Demo mode.</b> Signing in uses a fixed synthetic clinician account. In production
            this button opens The Jewish Board sign-in page.
          </span>
        </p>
        <p className="fine">
          <Icon name="warning" />
          <span>Use synthetic data only. Never enter real client information.</span>
        </p>
      </div>
      <div className="signin-art" aria-hidden="true">
        <div className="a">Less time on paperwork. More time with clients.</div>
        <div className="b" />
        <div className="c" />
        <div className="d" />
        <div className="e">
          Five programs, one assistant
          <p>
            Adult ACT · Youth ACT · Health Home Care Coordination · Apartment Treatment Housing ·
            Article 31 Outpatient Clinic
          </p>
        </div>
        <div className="f" />
        <div className="g" />
        <div className="h" />
      </div>
    </div>
  );
}
