import type { Program } from "../api/types";
import { Icon } from "./Icon";

interface Props {
  programs: Program[];
  selected: string | null;
  onSelect: (p: Program) => void;
}

/** Only rendered when the user's role covers more than one program (frontend/CLAUDE.md). */
export function ProgramSelector({ programs, selected, onSelect }: Props) {
  return (
    <div className="programs" role="radiogroup" aria-label="Program">
      {programs.map((p) => {
        const on = p.id === selected;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={on}
            className={`program${on ? " on" : ""}`}
            disabled={!p.accessible}
            onClick={() => onSelect(p)}
          >
            <span className="top">
              <span className={`radio${on ? " on" : ""}`} />
              {!p.accessible && (
                <span>
                  <Icon name="lock" /> No access
                </span>
              )}
            </span>
            <b>{p.name}</b>
            <span className="sub">{p.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
