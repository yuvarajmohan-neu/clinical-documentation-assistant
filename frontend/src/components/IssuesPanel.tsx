import type { Issue, Severity } from "../api/types";
import { Icon } from "./Icon";

const GROUPS: { severity: Severity; cls: string; icon: "critical" | "warning" | "info"; label: string }[] = [
  { severity: "Critical", cls: "critical", icon: "critical", label: "Must fix" },
  { severity: "Warning", cls: "warning", icon: "warning", label: "Should fix" },
  { severity: "Informational", cls: "info", icon: "info", label: "Optional" },
];

export function SeverityBadge({ severity }: { severity: Severity }) {
  const g = GROUPS.find((x) => x.severity === severity)!;
  return (
    <span className={`sev ${g.cls}`}>
      <Icon name={g.icon} /> {severity}
    </span>
  );
}

interface Props {
  issues: Issue[];
  selectedId: string | null;
  onSelect: (issue: Issue) => void;
}

export function IssuesPanel({ issues, selectedId, onSelect }: Props) {
  return (
    <section className="card" aria-labelledby="issues-h">
      <div className="card-head">
        <h2 id="issues-h">Issues</h2>
        <span className="sp small muted">Click an issue to jump to it</span>
      </div>
      {issues.length === 0 && (
        <p className="empty-state">
          <Icon name="check" /> No issues found against the current rule set.
        </p>
      )}
      {GROUPS.map((g) => {
        const list = issues.filter((i) => i.severity === g.severity);
        if (!list.length) return null;
        return (
          <div key={g.severity}>
            <div className="group-head">
              <SeverityBadge severity={g.severity} />
              <span className="n">
                {g.label} · {list.length}
              </span>
            </div>
            {list.map((i) => (
              <article
                key={i.id}
                className={`issue ${g.cls}${selectedId === i.id ? " selected" : ""}`}
                onClick={() => onSelect(i)}
              >
                <div className="top">
                  <span className="what">{i.issue}</span>
                  <span className="el">{i.element}</span>
                </div>
                <dl>
                  <dt>Requirement</dt>
                  <dd>{i.requirement}</dd>
                  <dt>Source</dt>
                  <dd>
                    <a href={i.source_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                      {i.source} <Icon name="ext" />
                    </a>
                  </dd>
                  <dt>How to fix</dt>
                  <dd>{i.suggestion}</dd>
                </dl>
                <div className="foot">
                  <button
                    type="button"
                    className="link-btn"
                    style={{ textDecoration: "none" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(i);
                    }}
                  >
                    › Go to text
                  </button>
                  {i.check_type === "rule" ? (
                    <span className="check-type rule">
                      <Icon name="shield" /> Rule check
                    </span>
                  ) : (
                    <span className="check-type content">
                      <Icon name="sparkle" /> Content check
                    </span>
                  )}
                  <span className="rid mono">{i.rule}</span>
                </div>
              </article>
            ))}
          </div>
        );
      })}
    </section>
  );
}
