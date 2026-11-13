import type { Note } from "../api/types";
import { Icon } from "./Icon";

const COPY: Record<Note["status"], { cls: string; icon: "critical" | "warning" | "check" }> = {
  "Needs attention": { cls: "needs", icon: "critical" },
  "Meets standards with warnings": { cls: "warn", icon: "warning" },
  "Meets standards": { cls: "meets", icon: "check" },
};

/** Status wording comes straight from the backend; this only picks colour + icon. */
export function StatusBanner({ note }: { note: Note }) {
  const { cls, icon } = COPY[note.status];
  const { critical, warning, informational } = note.counts;
  let detail: string;
  if (critical) detail = `Fix the Critical issue${critical > 1 ? "s" : ""} before you approve.`;
  else if (warning) detail = `No Critical issues. Review the warning${warning > 1 ? "s" : ""} before you approve.`;
  else if (informational) detail = `No Critical issues or Warnings. ${informational} Informational note${informational > 1 ? "s" : ""}.`;
  else detail = "No issues found.";

  return (
    <div className={`status ${cls}`} role="status" aria-live="polite">
      <Icon name={icon} />
      <div>
        <div className="t">{note.status}</div>
        <div className="d">
          {detail} Last checked {note.checked_at}.
        </div>
      </div>
      <div className="counts">
        <span>
          <Icon name="critical" /> {critical} Critical
        </span>
        <span>
          <Icon name="warning" /> {warning} Warning{warning === 1 ? "" : "s"}
        </span>
        <span>
          <Icon name="info" /> {informational} Informational
        </span>
      </div>
    </div>
  );
}
