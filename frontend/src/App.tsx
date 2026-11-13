import { useState } from "react";
import type { Note, Program, Session } from "./api/types";
import { useAuth } from "./auth";
import { AppHeader, type Screen } from "./components/AppHeader";
import { CheckNote } from "./pages/CheckNote";
import { ReviewNote } from "./pages/ReviewNote";
import { SessionSetup } from "./pages/SessionSetup";
import { SignInScreen } from "./pages/SignInScreen";
import { WriteNote } from "./pages/WriteNote";

/**
 * App shell + workflow state: Session setup → Write a note / Check a note → shared review.
 * Plain state instead of a router keeps the demo dependency-free.
 */
export function App() {
  const { status, principal, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>("setup");
  const [program, setProgram] = useState<Program | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [reviewFrom, setReviewFrom] = useState<"write" | "check">("write");
  // Page text survives navigating away and back.
  const [writeText, setWriteText] = useState("");
  const [checkText, setCheckText] = useState("");

  if (status !== "signed-in" || !principal) {
    return <SignInScreen />;
  }

  const handleSignOut = () => {
    setScreen("setup");
    setProgram(null);
    setSession(null);
    setNote(null);
    setWriteText("");
    setCheckText("");
    signOut();
  };

  const selectProgram = (p: Program) => {
    if (p.id !== program?.id) {
      setSession(null);
      setCheckText("");
    }
    setProgram(p);
  };

  const selectSession = (s: Session) => {
    if (s.session_id !== session?.session_id) setWriteText("");
    setSession(s);
  };

  const openReview = (n: Note, from: "write" | "check") => {
    setNote(n);
    setReviewFrom(from);
    setScreen("review");
  };

  return (
    <>
      <AppHeader
        screen={screen}
        reviewFrom={reviewFrom}
        onNavigate={setScreen}
        canWrite={!!session}
        programName={program?.name ?? null}
        principal={principal}
        onSignOut={handleSignOut}
      />
      <main className="main">
        {screen === "setup" && (
          <SessionSetup
            principal={principal}
            program={program}
            session={session}
            onSelectProgram={selectProgram}
            onSelectSession={selectSession}
            onWrite={() => setScreen("write")}
            onCheck={() => setScreen("check")}
          />
        )}
        {screen === "write" && program && session && (
          <WriteNote
            program={program}
            session={session}
            text={writeText}
            onTextChange={setWriteText}
            onBack={() => setScreen("setup")}
            onDrafted={(n) => openReview(n, "write")}
          />
        )}
        {screen === "check" && program && (
          <CheckNote
            program={program}
            text={checkText}
            onTextChange={setCheckText}
            onBack={() => setScreen("setup")}
            onChecked={(n) => openReview(n, "check")}
          />
        )}
        {screen === "review" && note && (
          <ReviewNote
            key={note.note_id}
            initialNote={note}
            onNavigate={setScreen}
            onNoteChange={setNote}
          />
        )}
      </main>
    </>
  );
}
