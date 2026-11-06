import { useAuth } from "./auth";
import { SignInScreen } from "./pages/SignInScreen";

/**
 * App shell: header + the one screen that applies. Session setup,
 * Write/Check a note, and the shared review screen (p1-react-walkthrough.md
 * §2) are P1's build on top of this.
 */
export function App() {
  const { status, principal, signOut } = useAuth();

  return (
    <>
      <header className="jb-header">
        <h1 className="jb-header-title">The Jewish Board</h1>
        <p className="jb-header-tagline">Clinical Documentation Assistant</p>
        {status === "signed-in" && (
          <button type="button" className="jb-btn-primary" onClick={signOut} style={{ marginLeft: "auto" }}>
            Sign out
          </button>
        )}
      </header>
      {status === "signed-in" && principal ? (
        <main className="jb-main">
          <div className="jb-card">
            <h2>Signed in as {principal.name}</h2>
            <p>
              Programs: {principal.programs.join(", ")} — program selector
              and session picker land here next.
            </p>
          </div>
        </main>
      ) : (
        <SignInScreen />
      )}
    </>
  );
}
