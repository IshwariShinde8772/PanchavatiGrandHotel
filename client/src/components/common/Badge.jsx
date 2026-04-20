import clsx from "clsx";

const colorMap = {
  saffron: "bg-saffron text-white",
  gold: "bg-gold text-darkText",
  maroon: "bg-maroon text-cream",
  vineyard: "bg-vineyard text-white",
  godavari: "bg-godavari text-white",
};

export default function Badge({ children, color = "gold", className }) {
  return (
    <span className={clsx("inline-flex rounded-full px-3 py-1 text-xs font-semibold", colorMap[color], className)}>
      {children}
    </span>
  );
}

