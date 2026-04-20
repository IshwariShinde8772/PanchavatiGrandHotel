export default function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-3 text-sm text-mutedText">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-saffron border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

