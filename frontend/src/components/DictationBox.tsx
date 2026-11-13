import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

/* Minimal typing for the Web Speech API (Chrome/Edge only). */
interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Props {
  value: string;
  onChange: (text: string) => void;
}

/**
 * Text area + mic. Typed and dictated text go in the same box. If the browser has no speech
 * service, the mic is hidden and the clinician types instead.
 */
export function DictationBox({ value, onChange }: Props) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const Ctor = typeof window !== "undefined" ? getSpeechCtor() : null;

  useEffect(() => () => recRef.current?.stop(), []);

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) {
        const cur = valueRef.current;
        const sep = cur && !/\s$/.test(cur) ? " " : "";
        onChange(cur + sep + finalText.trim());
      }
      setInterim(interimText);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <div>
      <label htmlFor="session-notes" className="sr-only">
        Session notes
      </label>
      <textarea
        id="session-notes"
        className="textarea"
        rows={14}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type or dictate what happened in the session. Only what you write here goes into the draft."
      />
      {interim && <p className="interim">{interim}</p>}
      <div className="dictation-row">
        {Ctor ? (
          <>
            <button
              type="button"
              className={`mic${listening ? " on" : ""}`}
              onClick={toggle}
              aria-pressed={listening}
              aria-label={listening ? "Stop dictation" : "Start dictation"}
            >
              <Icon name="mic" />
            </button>
            <span>
              {listening ? (
                <>
                  <span className="listening">Listening…</span>
                  <br />
                  <span className="small muted">Grey text is still being transcribed. Click the mic to stop.</span>
                </>
              ) : (
                <span className="small muted">Click the mic to dictate.</span>
              )}
            </span>
          </>
        ) : (
          <span className="small muted">Dictation isn&rsquo;t available in this browser. Type instead.</span>
        )}
      </div>
    </div>
  );
}
