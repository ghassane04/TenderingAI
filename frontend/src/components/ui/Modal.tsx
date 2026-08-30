import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  size?: "sm" | "md" | "lg" | "xl"
  children: React.ReactNode
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
}

export default function Modal({
  open, onClose, title, subtitle,
  size = "md", children,
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={cn(
              "relative bg-white/75 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-2xl shadow-slate-300/40 w-full max-h-[85vh] flex flex-col",
              sizes[size]
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-white/60 bg-white/30 rounded-t-2xl flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                {subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg hover:bg-white/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all flex-shrink-0 ml-4"
              >
                <X size={14} />
              </button>
            </div>
            {/* Body */}
            <div className="p-6 rounded-b-2xl overflow-y-auto overflow-x-visible">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}