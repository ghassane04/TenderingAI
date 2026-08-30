import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, FileText, Trash2, Loader2, CheckCircle2 } from "lucide-react"
import { useInitializeTender } from "../../hooks/useTenders"

interface UploadTenderModalProps {
  open: boolean
  onClose: () => void
}

const ALLOWED = [".pdf", ".docx", ".doc", ".txt", ".xlsx", ".xls"]

export default function UploadTenderModal({ open, onClose }: UploadTenderModalProps) {
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { mutate: initialize, isPending } = useInitializeTender()

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const valid = Array.from(newFiles).filter((f) =>
      ALLOWED.some((ext) => f.name.toLowerCase().endsWith(ext))
    )
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      return [...prev, ...valid.filter((f) => !names.has(f.name))]
    })
  }

  const removeFile = (name: string) =>
    setFiles((prev) => prev.filter((f) => f.name !== name))

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  const handleSubmit = () => {
    if (!files.length) return
    initialize(files, {
      onSuccess: () => {
        setFiles([])
        onClose()
      },
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

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
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative bg-white/75 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-2xl shadow-slate-300/40 w-full max-w-lg"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/60 bg-white/30">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Nouvel appel d'offres</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Formats acceptés : PDF, DOCX, XLSX, TXT
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-white/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  dragging
                    ? "border-sky-300 bg-sky-50/60 backdrop-blur-sm"
                    : "border-slate-200/70 bg-white/30 hover:border-sky-200 hover:bg-sky-50/30"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-sky-50/80 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                  <Upload size={22} className="text-sky-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Glissez vos fichiers ici
                </p>
                <p className="text-xs text-slate-400 mt-1">ou cliquez pour sélectionner</p>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept={ALLOWED.join(",")}
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {files.map((f) => (
                    <motion.div
                      key={f.name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 px-3 py-2.5 bg-white/50 backdrop-blur-sm rounded-lg border border-white/60"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-100/80 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                        <p className="text-[10px] text-slate-400">{formatSize(f.size)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(f.name) }}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-white/60 bg-white/30 backdrop-blur-sm rounded-b-2xl">
              <p className="text-xs text-slate-400">
                {files.length} fichier(s) sélectionné(s)
              </p>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary text-xs px-3 py-1.5">
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!files.length || isPending}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all"
                >
                  {isPending ? (
                    <><Loader2 size={13} className="animate-spin" /> Création...</>
                  ) : (
                    <><CheckCircle2 size={13} /> Créer le tender</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}