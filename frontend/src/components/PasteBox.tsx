interface Props {
  value: string;
  onChange: (text: string) => void;
}

/** Large paste area for the Check a note page. No mic on this page. */
export function PasteBox({ value, onChange }: Props) {
  return (
    <label className="field">
      <span>Pasted note</span>
      <textarea
        className="textarea"
        rows={18}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste a finished note here. Synthetic data only."
      />
    </label>
  );
}
