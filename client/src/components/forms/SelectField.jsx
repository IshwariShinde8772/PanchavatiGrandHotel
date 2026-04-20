export default function SelectField({ label, error, options = [], className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-2 block text-sm font-medium text-darkText">{label}</span> : null}
      <select
        className="min-h-11 w-full rounded-2xl border border-divider bg-white px-4 py-3 text-sm outline-none transition focus:border-saffron"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="mt-1 block text-xs text-error">{error}</span> : null}
    </label>
  );
}

