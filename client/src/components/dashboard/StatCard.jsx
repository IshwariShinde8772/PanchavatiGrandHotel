const accentMap = {
  saffron: "#0A4D34",  // mapped to primary forest green
  gold: "#2D5A27",     // mapped to secondary olive green
  maroon: "#a7f3d0",   // soft green
  vineyard: "#526359", // muted green
  green: "#0A4D34",
};

export default function StatCard({ title, value, subtitle, accent = "saffron" }) {
  return (
    <div className="section-card relative overflow-hidden p-6 hover:shadow-lg transition-all bg-white border border-[#E5EBE7]">
      <div 
        className="absolute inset-y-0 left-0 w-2" 
        style={{ backgroundColor: accentMap[accent] || accentMap.saffron }} 
      />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#526359]">{title}</p>
      <p className="mt-4 font-heading text-4xl font-bold text-[#0A4D34]">{value}</p>
      {subtitle ? <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[#526359]">{subtitle}</p> : null}
    </div>
  );
}

