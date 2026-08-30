import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { FileText, FolderOpen, User, ChevronRight, Upload, Sparkles, Clock } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { DocumentInfo } from "../../../api/document"
import { useProcessTender } from "../../../hooks/useTenders"
import UploadDocumentModal from "../../../components/tenders/UploadDocumentModal"
import StatusBadge from "../../ui/StatusBadge"

interface Props {
  documents: DocumentInfo[]
  tenderId: number
}

export default function TabDocuments({ documents, tenderId }: Props) {
  const navigate = useNavigate()
  const { mutate: ProcessDoc, isPending: isProcessing } = useProcessTender()
  const [uploadOpen, setUploadOpen] = useState(false)
  
  const fmt = (d: string | null | undefined) => {
    if (!d) return "—"
    const date = new Date(typeof d === "string" ? d.replace(" ", "T") : d)
    return Number.isNaN(date.getTime()) ? "—" : format(date, "dd MMM yyyy à HH:mm", { locale: fr })
  }

  const handleProcess = () => {
    ProcessDoc(tenderId)
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {/* Header avec statistiques */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-100/60 flex items-center justify-center">
              <FileText size={15} className="text-sky-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Documents sources</p>
              <p className="text-xs text-slate-400">{documents.length} document(s) associé(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUploadOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
            >
              <Upload size={13} /> Ajouter des fichiers
            </button>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-medium text-sky-600 bg-sky-50/80 hover:bg-sky-100/80 rounded-xl border border-sky-200/60 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles size={13} className={isProcessing ? "animate-spin" : ""} /> 
              {isProcessing ? "Extraction..." : "Lancer l'extraction"}
            </button>
          </div>
        </div>

        {!documents.length ? (
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <FolderOpen size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">Aucun document associé</p>
            <p className="text-xs text-slate-400 mt-1">Ajoutez des documents pour commencer l'extraction</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {documents.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                onClick={() => navigate(`/tenders/${tenderId}/documents/${doc.id}`)}
                className="bg-white/60 backdrop-blur-md border border-white/50 rounded-xl px-4 py-3 hover:border-sky-200 hover:bg-white/80 cursor-pointer transition-all group"
              >
                {doc.statut_name === "En cours" && doc.count_chunks && doc.count_chunks > 0 && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-16 h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(((doc.nb_chunks_done || 0) / doc.count_chunks) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {Math.round(((doc.nb_chunks_done || 0) / doc.count_chunks) * 100)}%
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-white/70 border border-white/60 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors">
                      <FileText size={16} className="text-slate-500 group-hover:text-sky-600" />
                    </div>
                    
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-sky-600 transition-colors truncate">
                        {doc.designation || `Document #${doc.id}`}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-shrink-0">
                        {doc.statut_name && (
                          <>
                            <StatusBadge status={doc.statut_name} />
                            <span className="text-slate-300">|</span>
                          </>
                        )}
                        
                        {doc.uploaded_by && (
                          <>
                            <span className="flex items-center gap-1">
                              <User size={10} className="text-slate-400" /> {doc.uploaded_by}
                            </span>
                            <span className="text-slate-300">|</span>
                          </>
                        )}
                        
                        {doc.uploaded_at && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} className="text-slate-400" /> {fmt(doc.uploaded_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        tenderId={tenderId}
      />
    </>
  )
}
