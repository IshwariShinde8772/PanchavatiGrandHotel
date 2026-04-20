import { Star } from "lucide-react";

export default function StarRating({ value = 0, onChange, readOnly = false }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < value;
        return (
          <button
            key={index}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(index + 1)}
            className="rounded-full p-1"
          >
            <Star size={18} className={active ? "fill-gold text-gold" : "text-divider"} />
          </button>
        );
      })}
    </div>
  );
}
