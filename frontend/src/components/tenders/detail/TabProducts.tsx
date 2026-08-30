import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { useForm, Controller } from "react-hook-form"
import { 
  Package, Layers, ChevronRight, Plus, Loader2,
  ClipboardCheck, Sparkles, FolderOpen, Box
} from "lucide-react"
import type { ProductDetail } from "../../../api/products"
import { useAddProductToTender } from "../../../hooks/useProducts"
import { useTechnicalLotsList } from "../../../hooks/useTechnicalLots"
import Modal from "../../ui/Modal"
import LotPicker from "../LotPicker"

interface Props {
  products: ProductDetail[]
  tenderId: number
}

interface FormData {
  designation: string
  technical_lot_id: string
}

// Couleurs pour les lots
const LOT_COLORS = [
  { bg: "from-sky-50 to-blue-50", border: "border-sky-200", text: "text-sky-700", icon: "text-sky-500" },
  { bg: "from-emerald-50 to-teal-50", border: "border-emerald-200", text: "text-emerald-700", icon: "text-emerald-500" },
  { bg: "from-violet-50 to-purple-50", border: "border-violet-200", text: "text-violet-700", icon: "text-violet-500" },
  { bg: "from-amber-50 to-orange-50", border: "border-amber-200", text: "text-amber-700", icon: "text-amber-500" },
  { bg: "from-rose-50 to-red-50", border: "border-rose-200", text: "text-rose-700", icon: "text-rose-500" },
  { bg: "from-cyan-50 to-sky-50", border: "border-cyan-200", text: "text-cyan-700", icon: "text-cyan-500" },
  { bg: "from-indigo-50 to-blue-50", border: "border-indigo-200", text: "text-indigo-700", icon: "text-indigo-500" },
  { bg: "from-teal-50 to-emerald-50", border: "border-teal-200", text: "text-teal-700", icon: "text-teal-500" },
]

const getLotColor = (index: number) => {
  return LOT_COLORS[index % LOT_COLORS.length]
}

export default function TabProducts({ products, tenderId }: Props) {
  const navigate = useNavigate()
  const { id: tenderIdParam } = useParams<{ id: string }>()
  const [addOpen, setAddOpen] = useState(false)

  const { data: lotsData } = useTechnicalLotsList()
  const lots = lotsData?.lots ?? []
  const { mutate: addProduct, isPending: adding } = useAddProductToTender(tenderId)
  const form = useForm<FormData>({ defaultValues: { designation: "", technical_lot_id: "" } })

  const onAdd = (d: FormData) => {
    addProduct(
      { designation: d.designation, technical_lot_id: d.technical_lot_id ? Number(d.technical_lot_id) : null },
      { onSuccess: () => { setAddOpen(false); form.reset() } }
    )
  }

  const byLot = products.reduce<Record<string, ProductDetail[]>>((acc, p) => {
    const key = p.technical_lot_name ?? "Sans lot"
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  const totalRequirements = products.reduce((a, p) => a + p.requirements.length, 0)
  const lotKeys = Object.keys(byLot)

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Header avec statistiques */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-center">
                  <Package size={16} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Produits extraits</p>
                  <p className="text-xs text-slate-400">{products.length} produit(s) · {totalRequirements} exigence(s)</p>
                </div>
              </div>
              <button 
                onClick={() => setAddOpen(true)} 
                className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
              >
                <Plus size={13} /> Ajouter un produit
              </button>
            </div>

            {/* Mini stats */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100/60">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Layers size={12} className="text-slate-400" />
                <span>{lotKeys.length} lot(s)</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ClipboardCheck size={12} className="text-slate-400" />
                <span>{totalRequirements} exigence(s)</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Box size={12} className="text-slate-400" />
                <span>{products.length} produit(s)</span>
              </div>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <FolderOpen size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">Aucun produit extrait</p>
            <p className="text-xs text-slate-400 mt-1">Lancez l'extraction IA ou ajoutez un produit manuellement</p>
            <button 
              onClick={() => setAddOpen(true)} 
              className="mt-4 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 mx-auto"
            >
              <Plus size={13} /> Ajouter manuellement
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byLot).map(([lotName, lotProducts], lotIndex) => {
              const lotReqCount = lotProducts.reduce((a, p) => a + p.requirements.length, 0)
              const colors = getLotColor(lotIndex)
              const isSansLot = lotName === "Sans lot"
              
              return (
                <div key={lotName} className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* En-tête du lot */}
                  <div className={`px-5 py-3 bg-gradient-to-r ${colors.bg} backdrop-blur-sm border-b ${colors.border} flex items-center gap-2`}>
                    <div className={`w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center`}>
                      <Layers size={13} className={colors.icon} />
                    </div>
                    <span className={`text-sm font-semibold ${colors.text}`}>
                      {isSansLot ? "📁 Sans lot" : lotName}
                    </span>
                    <span className="ml-auto flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-medium ${colors.icon} bg-white/60 px-2 py-0.5 rounded-full border ${colors.border}`}>
                        {lotProducts.length} produit{lotProducts.length > 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 bg-white/60 px-2 py-0.5 rounded-full border border-slate-200">
                        {lotReqCount} exigence{lotReqCount > 1 ? 's' : ''}
                      </span>
                    </span>
                  </div>
                  
                  {/* Liste des produits */}
                  <div className="divide-y divide-white/60">
                    {lotProducts.map((product, productIndex) => (
                      <motion.button
                        key={product.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: productIndex * 0.03 }}
                        onClick={() => navigate(`/tenders/${tenderIdParam}/products/${product.id}`)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/60 transition-all text-left group"
                      >
                        <div className={`w-9 h-9 rounded-lg bg-white/70 border border-white/60 flex items-center justify-center flex-shrink-0 group-hover:${colors.bg} transition-colors`}>
                          <Package size={15} className="text-slate-500 group-hover:text-sky-600 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-sky-600 transition-colors">
                            {product.designation}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <ClipboardCheck size={10} />
                              {product.requirements.length} exigence{product.requirements.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <ChevronRight 
                          size={14} 
                          className="text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" 
                        />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Add product modal amélioré */}
      <Modal 
        open={addOpen} 
        onClose={() => { setAddOpen(false); form.reset() }} 
        title="Nouveau produit" 
        subtitle="Ajoutez un produit manuellement au tender"
        size="xl"
      >
        <form onSubmit={form.handleSubmit(onAdd)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Package size={16} className="text-emerald-500" />
              Désignation
              <span className="text-red-500 text-xs font-normal">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Package size={16} className="text-emerald-400" />
              </div>
              <input 
                {...form.register("designation", { required: true })} 
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none shadow-sm" 
                placeholder="ex: Groupe électrogène 100 kVA" 
              />
            </div>
            <p className="text-[11px] text-slate-400">Nom du produit tel qu'il apparaîtra dans le comparatif</p>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Layers size={16} className="text-sky-500" />
              Lot technique
            </label>
            <Controller
              control={form.control}
              name="technical_lot_id"
              render={({ field }) => (
                <LotPicker lots={lots} value={field.value} onChange={field.onChange} />
              )}
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles size={11} className="text-slate-400" />
              Choisissez le lot correspondant à la nature du produit pour une meilleure classification
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
            <button 
              type="button" 
              onClick={() => { setAddOpen(false); form.reset() }} 
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={adding} 
              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {adding ? (
                <><Loader2 size={14} className="animate-spin" /> Ajout...</>
              ) : (
                <><Plus size={14} /> Ajouter le produit</>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
