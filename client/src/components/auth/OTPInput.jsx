export default function OTPInput({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={onChange}
      maxLength={6}
      placeholder="000000"
      className="min-h-12 w-full rounded-xl border border-divider px-4 py-3 text-center text-xl font-bold tracking-[0.45em] focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
    />
  );
}

