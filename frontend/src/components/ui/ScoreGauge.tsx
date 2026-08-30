interface ScoreGaugeProps {
  value: number        // 0–100
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  label?: string
  decimals?: number    // nombre de décimales affichées (défaut 0)
}

const sizes = {
  sm: { r: 22, stroke: 4, fontSize: "text-xs",  box: "w-14 h-14" },
  md: { r: 32, stroke: 5, fontSize: "text-base", box: "w-20 h-20" },
  lg: { r: 44, stroke: 6, fontSize: "text-xl",  box: "w-28 h-28" },
}

function getColor(v: number) {
  if (v >= 80) return "#10b981"
  if (v >= 50) return "#f59e0b"
  return "#ef4444"
}

export default function ScoreGauge({
  value, size = "md", showLabel = true, label, decimals = 0,
}: ScoreGaugeProps) {
  const cfg  = sizes[size]
  const r    = cfg.r
  const circ = 2 * Math.PI * r
  const pct  = Math.min(100, Math.max(0, value))
  const dash = (pct / 100) * circ
  const color = getColor(pct)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${cfg.box}`}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${(r + cfg.stroke) * 2} ${(r + cfg.stroke) * 2}`}>
          {/* Track */}
          <circle
            cx={r + cfg.stroke}
            cy={r + cfg.stroke}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={cfg.stroke}
          />
          {/* Progress */}
          <circle
            cx={r + cfg.stroke}
            cy={r + cfg.stroke}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={cfg.stroke}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${cfg.fontSize}`} style={{ color }}>
            {pct.toFixed(decimals)}%
          </span>
        </div>
      </div>
      {showLabel && label && (
        <p className="text-[10px] text-slate-400 text-center">{label}</p>
      )}
    </div>
  )
}