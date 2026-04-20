export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-divider/40 bg-white px-6 py-12 shadow-card md:px-10">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
      {eyebrow ? <p className="font-bold text-[10px] uppercase tracking-[0.3em] text-secondary">{eyebrow}</p> : null}
      <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-4xl font-bold text-primary md:text-5xl">{title}</h1>
          {description ? <p className="mt-4 max-w-2xl text-base text-mutedText leading-relaxed">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

