export default function InputField({ label, error, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      {label ? (
        <span
          className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: "#526359" }}
        >
          {label}
        </span>
      ) : null}
      <input
        className="w-full py-3 outline-none transition-all border-b-2 bg-transparent text-sm"
        style={{ borderColor: "#E5EBE7", color: "#0D1B15" }}
        onFocus={(e) => (e.target.style.borderColor = "#0A4D34")}
        onBlur={(e) => (e.target.style.borderColor = "#E5EBE7")}
        {...props}
      />
      {error ? (
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "#DC2626" }}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
