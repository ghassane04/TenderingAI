import React from "react"
import { motion } from "framer-motion"
import { Building2 } from "lucide-react"

type LogoSize = "sm" | "md" | "lg"
type LogoVariant = "default" | "minimal"

interface CompanyLogoProps {
  className?: string
  size?: LogoSize
  variant?: LogoVariant
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = "",
  size = "md",
  variant = "default",
}) => {
  const sizes: Record<LogoSize, string> = {
    sm: "w-9 h-9",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  const iconSizes: Record<LogoSize, string> = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }

  if (variant === "minimal") {
    return (
      <div className={`relative ${sizes[size]} ${className}`}>
        <div
          className="w-full h-full rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle at 32% 28%, #ffffff, #bae6fd 40%, #38bdf8 85%)",
            boxShadow:
              "inset -4px -6px 10px rgba(56,189,248,0.35), inset 4px 6px 10px rgba(255,255,255,0.7), 0 6px 16px rgba(56,189,248,0.25)",
          }}
        >
          <Building2 className={`${iconSizes[size]} text-white drop-shadow-sm`} />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, y: [0, -3, 0] }}
      transition={{
        scale: { duration: 0.4, ease: "easeOut" },
        opacity: { duration: 0.4, ease: "easeOut" },
        y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
      }}
      className={`relative ${sizes[size]} ${className} group cursor-pointer`}
    >
      <div
        className="absolute inset-0 rounded-full blur-md opacity-70 group-hover:opacity-90 transition-opacity duration-300"
        style={{ background: "radial-gradient(circle, #7dd3fc, #fdba74 90%)" }}
      />
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
        style={{
          background:
            "radial-gradient(circle at 30% 26%, #ffffff 0%, #e0f2fe 30%, #7dd3fc 65%, #fdba74 100%)",
          boxShadow:
            "inset -6px -8px 14px rgba(251,146,60,0.25), inset 6px 8px 14px rgba(255,255,255,0.8), 0 8px 20px rgba(56,189,248,0.3)",
          border: "1px solid rgba(255,255,255,0.8)",
        }}
      >
        <Building2 className={`${iconSizes[size]} text-slate-700/80 drop-shadow-sm`} />
      </div>
    </motion.div>
  )
}

export const LogoIcon: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="logoSphere" cx="32%" cy="26%" r="80%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="35%" stopColor="#e0f2fe" />
        <stop offset="70%" stopColor="#7dd3fc" />
        <stop offset="100%" stopColor="#fdba74" />
      </radialGradient>
    </defs>
    <rect width="40" height="40" rx="12" fill="#f8fafc" />
    <rect x="1" y="1" width="38" height="38" rx="11" stroke="#e2e8f0" fill="none" />
    <circle cx="20" cy="20" r="16" fill="url(#logoSphere)" />
    <Building2 size={20} color="#334155" x="10" y="10" />
  </svg>
)