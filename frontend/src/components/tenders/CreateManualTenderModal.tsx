import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, FilePlus, Building2, FileText, Hash, Sparkles, Loader2 } from "lucide-react"
import { useManualTender } from "../../hooks/useTenders"

interface Props {
  open: boolean
  onClose: () => void
}

export default function CreateManualTenderModal({ open, onClose }: Props) {
  const [tenderCode, setTenderCode] = useState("")
  const [designation, setDesignation] = useState("")
  const [clientName, setClientName] = useState("")
  const [errors, setErrors] = useState<{ code?: string; designation?: string }>({})

  const { mutate: createManual, isPending } = useManualTender()

  // Réinitialiser le formulaire quand le modal se ferme
  const handleClose = () => {
    setTenderCode("")
    setDesignation("")
    setClientName("")
    setErrors({})
    onClose()
  }

  const validateForm = () => {
    const newErrors: { code?: string; designation?: string } = {}
    
    if (!tenderCode.trim()) {
      newErrors.code = "Le code tender est requis"
    } else if (tenderCode.trim().length < 3) {
      newErrors.code = "Le code doit contenir au moins 3 caractères"
    }
    
    if (!designation.trim()) {
      newErrors.designation = "La désignation est requise"
    } else if (designation.trim().length < 10) {
      newErrors.designation = "La désignation doit contenir au moins 10 caractères"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    createManual(
      {
        tender_code: tenderCode.trim(),
        designation: designation.trim(),
        nom_client: clientName.trim() || "", // Utiliser "" au lieu de undefined
      },
      {
        onSuccess: () => {
          handleClose()
        },
      }
    )
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white/80 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-slate-300/40 w-full max-w-lg overflow-hidden border border-white/60"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/60 bg-gradient-to-r from-sky-50/80 via-white/40 to-indigo-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 flex items-center justify-center shadow-md">
                <FilePlus size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800 text-base">
                  Création manuelle de Tender
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Saisie rapide sans document source
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 rounded-xl p-1.5 hover:bg-white/60 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Code Tender */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Hash size={16} className="text-sky-500" />
                Code Tender
                <span className="text-red-500 text-xs font-normal">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash size={16} className="text-sky-400" />
                </div>
                <input
                  type="text"
                  required
                  value={tenderCode}
                  onChange={(e) => setTenderCode(e.target.value)}
                  placeholder="Ex: AO-2026-001"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 rounded-xl focus:outline-none focus:ring-2 transition-all shadow-sm ${
                    errors.code 
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200" 
                      : "border-sky-200 focus:border-sky-500 focus:ring-sky-200"
                  }`}
                />
              </div>
              {errors.code && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-rose-500 flex items-center gap-1"
                >
                  <span className="inline-block w-1 h-1 rounded-full bg-rose-500" />
                  {errors.code}
                </motion.p>
              )}
              <p className="text-[11px] text-slate-400">
                Identifiant unique de l'appel d'offres
              </p>
            </div>

            {/* Désignation */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText size={16} className="text-indigo-500" />
                Désignation / Objet
                <span className="text-red-500 text-xs font-normal">*</span>
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText size={16} className="text-indigo-400" />
                </div>
                <textarea
                  required
                  rows={3}
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Ex: Fourniture d'équipements informatiques pour la Faculté..."
                  className={`w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 rounded-xl focus:outline-none focus:ring-2 transition-all resize-none shadow-sm ${
                    errors.designation 
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200" 
                      : "border-indigo-200 focus:border-indigo-500 focus:ring-indigo-200"
                  }`}
                />
              </div>
              {errors.designation && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-rose-500 flex items-center gap-1"
                >
                  <span className="inline-block w-1 h-1 rounded-full bg-rose-500" />
                  {errors.designation}
                </motion.p>
              )}
              <p className="text-[11px] text-slate-400">
                Description claire et précise de l'objet du marché
              </p>
            </div>

            {/* Client */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Building2 size={16} className="text-emerald-500" />
                Nom du Client
                <span className="text-slate-400 text-xs font-normal">(optionnel)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 size={16} className="text-emerald-400" />
                </div>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Ministère de la Santé"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all shadow-sm"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Nom du maître d'ouvrage ou de l'entité publique
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-100/80">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending || !tenderCode.trim() || !designation.trim()}
                className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <><Loader2 size={14} className="animate-spin" /> Création...</>
                ) : (
                  <><Sparkles size={14} /> Créer le tender</>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
