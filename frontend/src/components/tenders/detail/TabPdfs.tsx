import { motion } from "framer-motion"
import {
  FileText, CheckCircle2, XCircle,
  RefreshCw, Loader2, Calendar, User, HardDrive, Eye,
  FileOutput, FolderOpen
} from "lucide-react"
import type { PdfFileInfo } from "../../../api/pdf"
import { useGeneratePdfs, useGenerateLotPdf, useViewPdf } from "../../../hooks/usePdf"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Props { pdfs: PdfFileInfo[]; tenderId: number }

// Couleurs pour les PDFs (basé sur l'ID)
const PDF_COLORS = [
  { bg: "from-sky-50 to-blue-50", border: "border-sky-200", text: "text-sky-700", icon: "text-sky-500", badge: "bg-sky-100/80 text-sky-600" },
  { bg: "from-emerald-50 to-teal-50", border: "border-emerald-200", text: "text-emerald-700", icon: "text-emerald-500", badge: "bg-emerald-100/80 text-emerald-600" },
  { bg: "from-violet-50 to-purple-50", border: "border-violet-200", text: "text-violet-700", icon: "text-violet-500", badge: "bg-violet-100/80 text-violet-600" },
  { bg: "from-amber-50 to-orange-50", border: "border-amber-200", text: "text-amber-700", icon: "text-amber-500", badge: "bg-amber-100/80 text-amber-600" },
  { bg: "from-rose-50 to-red-50", border: "border-rose-200", text: "text-rose-700", icon: "text-rose-500", badge: "bg-rose-100/80 text-rose-600" },
  { bg: "from-cyan-50 to-sky-50", border: "border-cyan-200", text: "text-cyan-700", icon: "text-cyan-500", badge: "bg-cyan-100/80 text-cyan-600" },
  { bg: "from-indigo-50 to-blue-50", border: "border-indigo-200", text: "text-indigo-700", icon: "text-indigo-500", badge: "bg-indigo-100/80 text-indigo-600" },
  { bg: "from-teal-50 to-emerald-50", border: "border-teal-200", text: "text-teal-700", icon: "text-teal-500", badge: "bg-teal-100/80 text-teal-600" },
]

const getPdfColor = (index: number) => {
  return PDF_COLORS[index % PDF_COLORS.length]
}

export default function TabPdfs({ pdfs, tenderId }: Props) {
  const { mutate: generateAll, isPending: generatingAll } = useGeneratePdfs(tenderId)
  const { mutate: regenerateLot, isPending: regeneratingAny, variables: regeneratingLotId } = useGenerateLotPdf(tenderId)
  const { mutate: viewPdf, isPending: viewingAny, variables: viewingVars } = useViewPdf()

  const fmt = (d: string | null | undefined) =>
    d ? format(new Date(d), "dd MMM yyyy à HH:mm", { locale: fr }) : "—"

  const existing = pdfs.filter((p) => p.exists)
  const totalPdfs = pdfs.length

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header avec statistiques */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 flex items-center justify-center">
                <FileOutput size={16} className="text-rose-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">PDFs par lot technique</p>
                <p className="text-xs text-slate-400">
                  {existing.length}/{totalPdfs} fichier(s) disponible(s)
                </p>
              </div>
            </div>
            <button
              onClick={() => generateAll()}
              disabled={generatingAll}
              className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              {generatingAll ? (
                <><Loader2 size={13} className="animate-spin" /> Génération...</>
              ) : (
                <><RefreshCw size={13} /> Régénérer tout</>
              )}
            </button>
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <FileOutput size={12} className="text-slate-400" />
              <span>{totalPdfs} PDF(s)</span>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span>{existing.length} disponible(s)</span>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <XCircle size={12} className="text-slate-400" />
              <span>{totalPdfs - existing.length} manquant(s)</span>
            </div>
          </div>
        </div>
      </div>

      {pdfs.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={28} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-600">Aucun PDF généré</p>
          <p className="text-xs text-slate-400 mt-1">Cliquez sur "Régénérer tout" pour générer les PDFs</p>
          <button
            onClick={() => generateAll()}
            disabled={generatingAll}
            className="mt-4 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 mx-auto disabled:opacity-50"
          >
            {generatingAll ? (
              <><Loader2 size={13} className="animate-spin" /> Génération...</>
            ) : (
              <><RefreshCw size={13} /> Générer les PDFs</>
            )}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {pdfs.map((pdf, i) => {
            const isRegeneratingThis = regeneratingAny && regeneratingLotId === pdf.lot_id
            const isViewingThis = viewingAny && viewingVars?.pdfId === pdf.id
            const colors = getPdfColor(i)
            const isAvailable = pdf.exists
            
            return (
              <motion.div
                key={pdf.id ?? pdf.lot_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className={`bg-white/60 backdrop-blur-md border border-white/50 rounded-xl overflow-hidden transition-all ${
                  isAvailable 
                    ? "hover:border-rose-200 hover:bg-white/80 hover:shadow-md" 
                    : "opacity-60"
                }`}
              >
                {/* Bande colorée en haut */}
                <div className={`h-1 w-full bg-gradient-to-r ${colors.bg}`} />

                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    {/* Partie gauche : icône + infos principales */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-r ${colors.bg} border ${colors.border}`}>
                        <FileText size={16} className={isAvailable ? colors.icon : "text-slate-400"} />
                      </div>
                      
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <p className={`text-sm font-semibold truncate ${isAvailable ? 'text-slate-800' : 'text-slate-500'}`}>
                          {pdf.lot_name}
                        </p>

                        {/* Métadonnées sur une seule ligne */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-shrink-0">
                          {/* Statut */}
                          {isAvailable ? (
                            <>
                              <span className="flex items-center gap-1 text-emerald-500">
                                <CheckCircle2 size={11} /> Disponible
                              </span>
                              <span className="text-slate-300">|</span>
                            </>
                          ) : (
                            <>
                              <span className="flex items-center gap-1 text-slate-400">
                                <XCircle size={11} /> Non généré
                              </span>
                              <span className="text-slate-300">|</span>
                            </>
                          )}

                          {/* Taille */}
                          {pdf.file_size && (
                            <>
                              <span className="flex items-center gap-1">
                                <HardDrive size={10} /> {pdf.file_size}
                              </span>
                              <span className="text-slate-300">|</span>
                            </>
                          )}

                          {/* Date */}
                          {pdf.generated_at && (
                            <>
                              <span className="flex items-center gap-1">
                                <Calendar size={10} /> {fmt(pdf.generated_at)}
                              </span>
                              <span className="text-slate-300">|</span>
                            </>
                          )}

                          {/* Utilisateur */}
                          {pdf.generated_by && (
                            <span className="flex items-center gap-1">
                              <User size={10} /> {pdf.generated_by}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions à droite */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!pdf.id) return
                          viewPdf({ pdfId: pdf.id, filename: pdf.filename })
                        }}
                        disabled={!isAvailable || !pdf.id || isViewingThis}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isAvailable
                            ? 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                            : 'text-slate-300 cursor-not-allowed'
                        } disabled:opacity-40`}
                        title="Voir le PDF"
                      >
                        {isViewingThis ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          regenerateLot(pdf.lot_id)
                        }}
                        disabled={isRegeneratingThis}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-40"
                        title={isAvailable ? "Régénérer ce lot" : "Générer ce lot"}
                      >
                        <RefreshCw size={15} className={isRegeneratingThis ? "animate-spin text-amber-500" : ""} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
