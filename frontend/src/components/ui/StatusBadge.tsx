import { cn } from "../../lib/utils"

const statusConfig: Record<string, { label: string; classes: string; dot: string }> = {
  // Tenders
  "Metadonnées extraites":             { label: "Créé",              classes: "bg-blue-50 text-blue-600 border-blue-200",       dot: "bg-blue-500" },
  "Extraction des exigences en cours": { label: "Extraction...",     classes: "bg-amber-50 text-amber-600 border-amber-200",     dot: "bg-amber-500 animate-pulse" },
  "Extraction des exigences terminée": { label: "Prêt",              classes: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  "Erreur":                            { label: "Erreur",            classes: "bg-red-50 text-red-600 border-red-200",           dot: "bg-red-500" },

  // Datasheets
  "En attente":                        { label: "En attente",        classes: "bg-slate-50 text-slate-500 border-slate-200",     dot: "bg-slate-400" },
  "En cours":                          { label: "En cours",          classes: "bg-amber-50 text-amber-600 border-amber-200",     dot: "bg-amber-500 animate-pulse" },
  "Traité":                            { label: "Traité",            classes: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },

  // TSL
  "Non envoyé":                        { label: "En attente",        classes: "bg-slate-50 text-slate-500 border-slate-200",     dot: "bg-slate-400" },
  "Email envoyé":                      { label: "Envoyé",            classes: "bg-blue-50 text-blue-600 border-blue-200",        dot: "bg-blue-500" },
  "Réponse reçue":                     { label: "Répondu",           classes: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  "Erreur envoi":                      { label: "Erreur envoi",      classes: "bg-red-50 text-red-600 border-red-200",           dot: "bg-red-500" },
  "Erreur réception":                  { label: "Erreur récep.",     classes: "bg-orange-50 text-orange-600 border-orange-200",  dot: "bg-orange-500" },

  "default":                           { label: "Inconnu",           classes: "bg-slate-50 text-slate-500 border-slate-200",     dot: "bg-slate-400" },
}

interface StatusBadgeProps {
  status: string | null | undefined
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = statusConfig[status ?? ""] ?? statusConfig["default"]
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-sm",
      cfg.classes,
      className
    )}>
      
      {cfg.label}
    </span>
  )
}