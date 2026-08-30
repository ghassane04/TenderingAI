import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, X } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, description,
  confirmLabel = "Confirmer",
  danger = false,
  loading = false,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm"
          />
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-white/75 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-2xl shadow-slate-300/40 w-full max-w-md p-6"
          >
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            <div className={`w-12 h-12 rounded-xl backdrop-blur-sm flex items-center justify-center mb-4 ${
              danger ? "bg-red-50/80" : "bg-amber-50/80"
            }`}>
              <AlertTriangle size={22} className={danger ? "text-red-500" : "text-amber-500"} />
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">{description}</p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                  ${danger
                    ? "bg-red-500 hover:bg-red-600 text-white disabled:opacity-60"
                    : "bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-60"
                  }`}
              >
                {loading ? "En cours..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}