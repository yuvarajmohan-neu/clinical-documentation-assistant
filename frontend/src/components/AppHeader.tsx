import type { Principal } from "../auth";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

export type Screen = "setup" | "write" | "check" | "review";

interface Props {
  screen: Screen;
  reviewFrom: "write" | "check";
  onNavigate: (screen: Screen) => void;
  canWrite: boolean;
  programName: string | null;
  principal: Principal;
  onSignOut: () => void;
}

export function AppHeader({ screen, reviewFrom, onNavigate, canWrite, programName, principal, onSignOut }: Props) {
  const active = screen === "review" ? reviewFrom : screen;
  const initials = principal.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const item = (key: Screen, label: string, disabled = false) => (
    <button
      type="button"
      className={active === key ? "on" : ""}
      aria-current={active === key ? "page" : undefined}
      disabled={disabled}
      title={disabled ? "Choose a session first" : undefined}
      onClick={() => onNavigate(key)}
    >
      {label}
    </button>
  );

  return (
    <header className="header">
      <div className="brand">
        <Logo height={48}fallback={<span className="org">The Jewish Board</span>} />
        <span className="app">Clinical Documentation Assistant</span>
      </div>
      <nav className="nav" aria-label="Main">
        {item("setup", "Session setup")}
        {item("write", "Write a note", !canWrite)}
        {item("check", "Check a note", !programName)}
      </nav>
      <div className="right">
        {programName && (
          <span className="chip-program" title="Program set from your role and selection">
            {principal.programs.length === 1 && <Icon name="lock" />} {programName}
          </span>
        )}
        <span className="badge-demo">Synthetic data – demo only</span>
        <span className="user">
          <span className="avatar" aria-hidden="true">
            {initials}
          </span>
          <span>
            {principal.name}
            <br />
            <button type="button" className="link-btn" onClick={onSignOut}>
              Sign out
            </button>
          </span>
        </span>
      </div>
    </header>
  );
}
