export default function MandalaBackground({ children, className = "" }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url('/assets/images/mandala.svg')] bg-right-top bg-no-repeat opacity-10"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

