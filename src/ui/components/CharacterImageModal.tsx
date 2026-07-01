import { X, Loader2 } from 'lucide-react';

interface Props {
  name: string;
  image: string | null;
  loading: boolean;
  onClose: () => void;
}

export function CharacterImageModal({ name, image, loading, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6" onClick={onClose}>
      <div
        className="relative max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="mb-3 pr-6 text-sm font-semibold text-zinc-100">{name}</h3>
        {loading ? (
          <div className="grid h-64 w-64 place-items-center text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : image ? (
          <img src={image} alt={name} className="max-h-[70vh] rounded-lg" />
        ) : (
          <div className="grid h-64 w-64 place-items-center text-center text-sm text-zinc-500">
            Couldn’t read the image from $im.
          </div>
        )}
      </div>
    </div>
  );
}
