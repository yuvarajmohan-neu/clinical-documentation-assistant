import type { FollowUpQuestion } from "../api/types";
import { Icon } from "./Icon";

interface Props {
  questions: FollowUpQuestion[];
  /** Write page: answer boxes. Check page: display-only. */
  withAnswers: boolean;
  answers: Record<string, string>;
  onAnswer: (id: string, text: string) => void;
  onGoTo: (section: string) => void;
  locked: boolean;
}

export function FollowUpQuestions({ questions, withAnswers, answers, onAnswer, onGoTo, locked }: Props) {
  if (!questions.length) return null;
  return (
    <section className="card" aria-labelledby="fq-h">
      <div className="card-head">
        <h2 id="fq-h">Follow-up questions</h2>
      </div>
      {questions.map((q, idx) => {
        const answer = answers[q.id] ?? "";
        return (
          <div className="fq" key={q.id}>
            <div className="q">
              <span className="qmark">{idx + 1}</span>
              <span>{q.question}</span>
            </div>
            <p className="ctx">Fills: {q.fills}</p>
            {withAnswers && !locked ? (
              <>
                <textarea
                  className={`textarea${answer.trim() ? " filled" : ""}`}
                  aria-label={`Answer to: ${q.question}`}
                  placeholder="Type your answer. Leave it blank if it wasn't discussed."
                  value={answer}
                  onChange={(e) => onAnswer(q.id, e.target.value)}
                />
                {answer.trim() && (
                  <p className="answered">
                    <Icon name="check" /> Answered. Sent with your next Re-assess.
                  </p>
                )}
              </>
            ) : (
              <p className="readonly">
                <Icon name="pen" />
                <button type="button" className="link-btn" onClick={() => onGoTo(q.section)}>
                  Add this to the note on the left.
                </button>
              </p>
            )}
          </div>
        );
      })}
      <p className="hint">
        <Icon name="info" />
        <span>
          {withAnswers ? (
            <>
              There&rsquo;s no separate submit. Answers go with your next <b>Re-assess</b>, and your edits to the
              note are kept. Your answers are used as written — nothing is filled in for you.
            </>
          ) : (
            <>
              On a checked note, questions are for reference only. Edit the note directly, then click{" "}
              <b>Re-assess</b>.
            </>
          )}
        </span>
      </p>
    </section>
  );
}
