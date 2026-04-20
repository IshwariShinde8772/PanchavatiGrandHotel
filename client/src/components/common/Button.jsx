import clsx from "clsx";

const styleMap = {
  primary:   { backgroundColor: "#0A4D34", color: "#ffffff" },
  secondary: { backgroundColor: "#2D5A27", color: "#ffffff" },
  ghost:     { backgroundColor: "transparent", color: "#0A4D34" },
  outline:   { backgroundColor: "transparent", color: "#0A4D34", border: "2px solid #0A4D34" },
  gold:      { backgroundColor: "#FBBF24", color: "#ffffff" },
};

export default function Button({
  children,
  className,
  variant = "primary",
  as: Component = "button",
  style,
  ...props
}) {
  return (
    <Component
      className={clsx(
        "inline-flex min-h-11 items-center justify-center rounded-lg px-6 py-3 text-sm font-bold tracking-wide transition-opacity duration-200 hover:opacity-90 cursor-pointer",
        className
      )}
      style={{ ...styleMap[variant], ...style }}
      {...props}
    >
      {children}
    </Component>
  );
}
