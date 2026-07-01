import { Send } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text: string) => void;
}

/** Free-form passthrough — sends any text to Discord (for args, custom commands). */
export function CommandInput({ value, onChange, onSubmit }: Props) {
  const submit = () => {
    if (value.trim()) onSubmit(value.trim());
  };
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        placeholder="Type any command, e.g. $give @friend Megumin"
        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-roll"
      />
      <button
        type="button"
        onClick={submit}
        className="flex items-center gap-1.5 rounded-lg border border-roll/60 bg-roll/20 px-3 py-2 text-sm hover:bg-roll/30"
      >
        <Send className="h-4 w-4" /> Send
      </button>
    </div>
  );
}
