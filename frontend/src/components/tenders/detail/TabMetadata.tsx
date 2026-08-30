import { useState } from "react"
import { useForm } from "react-hook-form"
import { motion } from "framer-motion"
import { 
  Edit2, Save, X, Calendar, User, Building2, Hash, Activity, FileText, 
  Clock
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { TenderMetadata } from "../../../api/tenders"
import { useUpdateMetadata } from "../../../hooks/useTenders"
import StatusBadge from "../../ui/StatusBadge"

interface Props {
  tender: TenderMetadata
  tenderId: number
  stats: { products: number; requirements: number; pdfs: number }
}

interface FormData {
  code: string
  designation: string
  nom_client: string
}

export default function TabMetadata({ tender, tenderId }: Props) {
  const [editing, setEditing] = useState(false)
  const { mutate: update, isPending } = useUpdateMetadata(tenderId)

  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      code: tender.code,
      designation: tender.designation,
      nom_client: tender.nom_client ?? "",
    },
  })

  const onSubmit = (data: FormData) => {
    update(
      { code: data.code, designation: data.designation, nom_client: data.nom_client || null },
      { onSuccess: () => setEditing(false) }
    )
  }

  const fmt = (d: string | null | undefined) => {
    if (!d) return "—"
    const date = new Date(d)
    return Number.isNaN(date.getTime()) ? "—" : format(date, "dd MMMM yyyy à HH:mm", { locale: fr })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Carte des Métadonnées */}
      <div className="p-6 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/60 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Informations générales</h3>
            <p className="text-xs text-slate-400 mt-0.5">Métadonnées extraites et gérées par l'IA</p>
          </div>
          {!editing ? (
            <button 
              onClick={() => setEditing(true)} 
              className="px-3 py-1.5 text-xs font-medium text-sky-600 bg-sky-50/80 hover:bg-sky-100/80 rounded-xl border border-sky-200/60 transition-all flex items-center gap-1.5"
            >
              <Edit2 size={13} /> Modifier
            </button>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => { setEditing(false); reset() }} 
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
              >
                <X size={13} /> Annuler
              </button>
              <button 
                onClick={handleSubmit(onSubmit)} 
                disabled={isPending} 
                className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60"
              >
                <Save size={13} />
                {isPending ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Hash size={14} className="text-sky-500" />
                  Code AO
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash size={14} className="text-sky-400" />
                  </div>
                  <input 
                    {...register("code")} 
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white/90 backdrop-blur-sm border-2 border-sky-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none shadow-sm" 
                    placeholder="ex: N° 05/2026" 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Building2 size={14} className="text-indigo-500" />
                  Client
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 size={14} className="text-indigo-400" />
                  </div>
                  <input 
                    {...register("nom_client")} 
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white/90 backdrop-blur-sm border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all outline-none shadow-sm" 
                    placeholder="ex: Ministère..." 
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <FileText size={14} className="text-emerald-500" />
                Désignation
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText size={14} className="text-emerald-400" />
                </div>
                <textarea 
                  {...register("designation")} 
                  rows={3} 
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none resize-none shadow-sm" 
                  placeholder="Description de l'appel d'offres..."
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code AO */}
            <div className="flex items-start gap-3.5 p-3.5 bg-gradient-to-r from-sky-50/80 to-blue-50/80 backdrop-blur-sm rounded-xl border border-sky-200/60">
              <div className="w-8 h-8 rounded-lg bg-sky-100/60 backdrop-blur-sm flex items-center justify-center text-sky-600 flex-shrink-0">
                <Hash size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-sky-600 uppercase tracking-wider font-bold">Code AO</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{tender.code || "—"}</p>
              </div>
            </div>

            {/* Client */}
            <div className="flex items-start gap-3.5 p-3.5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 backdrop-blur-sm rounded-xl border border-indigo-200/60">
              <div className="w-8 h-8 rounded-lg bg-indigo-100/60 backdrop-blur-sm flex items-center justify-center text-indigo-600 flex-shrink-0">
                <Building2 size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-indigo-600 uppercase tracking-wider font-bold">Client</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{tender.nom_client || "—"}</p>
              </div>
            </div>

            {/* Désignation - Pleine largeur */}
            <div className="md:col-span-2 flex items-start gap-3.5 p-3.5 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 backdrop-blur-sm rounded-xl border border-emerald-200/60">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 backdrop-blur-sm flex items-center justify-center text-emerald-600 flex-shrink-0">
                <FileText size={15} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-bold">Désignation</p>
                <p className="text-sm font-medium text-slate-800 mt-0.5 leading-relaxed">{tender.designation || "—"}</p>
              </div>
            </div>

            {/* Statut */}
            <div className="md:col-span-2 flex items-start gap-3.5 p-3.5 bg-gradient-to-r from-amber-50/80 to-orange-50/80 backdrop-blur-sm rounded-xl border border-amber-200/60">
              <div className="w-8 h-8 rounded-lg bg-amber-100/60 backdrop-blur-sm flex items-center justify-center text-amber-600 flex-shrink-0">
                <Activity size={15} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-amber-600 uppercase tracking-wider font-bold">Statut du dossier</p>
                <div className="mt-1">
                  <StatusBadge status={tender.status_name} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historique et Audit */}
      <div className="p-5 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/60 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock size={13} className="text-slate-400" />
          Traçabilité
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-slate-50/80 to-white/80 backdrop-blur-sm border border-slate-200/60">
            <div className="w-7 h-7 rounded-lg bg-sky-100/60 flex items-center justify-center">
              <Calendar size={13} className="text-sky-500" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-slate-400">Créé le</p>
              <p className="text-xs font-semibold text-slate-700">{fmt(tender.uploaded_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-slate-50/80 to-white/80 backdrop-blur-sm border border-slate-200/60">
            <div className="w-7 h-7 rounded-lg bg-indigo-100/60 flex items-center justify-center">
              <User size={13} className="text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-slate-400">Créé par</p>
              <p className="text-xs font-semibold text-slate-700">{tender.uploaded_by || "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
