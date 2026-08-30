import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useForm, Controller } from "react-hook-form"
import {
  ArrowLeft, Edit2, Trash2, Plus,
  Save, Loader2, Check, Package, ChevronRight, Layers, RefreshCw,
  ClipboardCheck, Hash, Tag, Sparkles, FileText
} from "lucide-react"
import {
  useTenderProduct, useUpdateProduct, useDeleteProduct, useAddRequirement,
} from "../../hooks/useProducts"
import { useTechnicalLotsList } from "../../hooks/useTechnicalLots"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import Modal from "../../components/ui/Modal"
import ErrorBoundary from "../../components/ui/ErrorBoundary"
import LotPicker from "../../components/tenders/LotPicker"
import { useTenderDocuments } from "../../hooks/useDocuments"

const OPERATEURS = [
  "Egal", "Minimum", "Maximum", "Superieur", "Inferieur",
  "Superieur ou egal", "Inferieur ou egal", "Entre",
  "Compatible", "Supporte", "Contient", "Non specifie",
]

interface ProductForm {
  designation: string
  technical_lot_id: string
}

interface ReqForm {
  requirement: string
  operateur: string
  value: string
}

// Couleurs pour les lots
const LOT_COLORS = [
  { bg: "from-sky-50 to-blue-50", border: "border-sky-200", text: "text-sky-700", icon: "text-sky-500", badge: "bg-sky-100/80 text-sky-600" },
  { bg: "from-emerald-50 to-teal-50", border: "border-emerald-200", text: "text-emerald-700", icon: "text-emerald-500", badge: "bg-emerald-100/80 text-emerald-600" },
  { bg: "from-violet-50 to-purple-50", border: "border-violet-200", text: "text-violet-700", icon: "text-violet-500", badge: "bg-violet-100/80 text-violet-600" },
  { bg: "from-amber-50 to-orange-50", border: "border-amber-200", text: "text-amber-700", icon: "text-amber-500", badge: "bg-amber-100/80 text-amber-600" },
  { bg: "from-rose-50 to-red-50", border: "border-rose-200", text: "text-rose-700", icon: "text-rose-500", badge: "bg-rose-100/80 text-rose-600" },
  { bg: "from-cyan-50 to-sky-50", border: "border-cyan-200", text: "text-cyan-700", icon: "text-cyan-500", badge: "bg-cyan-100/80 text-cyan-600" },
  { bg: "from-indigo-50 to-blue-50", border: "border-indigo-200", text: "text-indigo-700", icon: "text-indigo-500", badge: "bg-indigo-100/80 text-indigo-600" },
  { bg: "from-teal-50 to-emerald-50", border: "border-teal-200", text: "text-teal-700", icon: "text-teal-500", badge: "bg-teal-100/80 text-teal-600" },
]

const getLotColor = (index: number) => {
  return LOT_COLORS[index % LOT_COLORS.length]
}

export default function TenderProductDetailPage() {
  const { id: tenderId, productId } = useParams<{ id: string; productId: string }>()
  const navigate = useNavigate()

  const pid = Number(productId)
  const tid = Number(tenderId)

  const { data: products, isLoading, isFetching, refetch } = useTenderProduct(tid)
  const product = products?.find((p) => p.id === pid)

  const { data: documents } = useTenderDocuments(tid)

  const { data: lotsData } = useTechnicalLotsList()
  const lots = lotsData?.lots ?? []
  const currentLot = lots.find((l) => l.id === product?.technical_lot_id)
  const lotIndex = lots.findIndex((l) => l.id === product?.technical_lot_id)
  const colors = getLotColor(lotIndex >= 0 ? lotIndex : 0)

  const { mutate: updateProduct, isPending: updatingProduct } = useUpdateProduct(tid)
  const { mutate: deleteProduct, isPending: deletingProduct } = useDeleteProduct(tid)
  const { mutate: addReq, isPending: addingReq } = useAddRequirement(pid)

  const [editProduct, setEditProduct] = useState(false)
  const [addReqOpen, setAddReqOpen] = useState(false)
  const [deleteProductOpen, setDeleteProductOpen] = useState(false)

  const productForm = useForm<ProductForm>()
  const reqForm = useForm<ReqForm>({ defaultValues: { operateur: "Non specifie" } })

  const openEditProduct = () => {
    productForm.reset({
      designation: product?.designation ?? "",
      technical_lot_id: product?.technical_lot_id ? String(product.technical_lot_id) : "",
    })
    setEditProduct(true)
  }

  const onProductSave = (d: ProductForm) => {
    updateProduct(
      { id: pid, data: { designation: d.designation, technical_lot_id: d.technical_lot_id ? Number(d.technical_lot_id) : null } },
      { onSuccess: () => setEditProduct(false) }
    )
  }

  const onAddReq = (d: ReqForm) => {
    addReq(
      { requirement: d.requirement, operateur: d.operateur, value: d.value || null },
      { onSuccess: () => { setAddReqOpen(false); reqForm.reset({ operateur: "Non specifie" }) } }
    )
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Chargement du produit...</p>
      </div>
    </div>
  )

  if (!product) return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center max-w-3xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center justify-center mx-auto mb-4">
        <Package size={28} className="text-rose-500" />
      </div>
      <p className="text-sm font-medium text-slate-600">Produit introuvable</p>
      <p className="text-xs text-slate-400 mt-1">Ce produit n'existe pas ou a été supprimé</p>
      <button onClick={() => navigate(`/tenders/${tid}`)} className="btn-secondary text-xs mt-4">
        <ArrowLeft size={13} /> Retour au tender
      </button>
    </div>
  )
  const sourceDocument = documents?.find((d) => d.id === product.tender_document_id)
  return (
    <ErrorBoundary>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Header avec retour */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={() => navigate(`/tenders/${tid}`)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-sky-600 transition-colors"
          >
            <ArrowLeft size={14} /> Retour à l'appel d'offres
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:bg-white/80 transition-all disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin text-sky-500" : "text-slate-400"} />
            </button>
          </div>
        </div>

        {/* Carte principale du produit */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
          {/* En-tête avec dégradé */}
          <div className={`bg-gradient-to-r ${colors.bg} px-6 py-5 border-b ${colors.border}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className={`w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0 border ${colors.border}`}>
                  <Package size={22} className={colors.icon} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-lg font-bold text-slate-800 truncate">
                      {product.designation}
                    </h1>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Layers size={11} className="text-slate-400" />
                      {product.technical_lot_name || "Non classifié"}
                    </span>
                    <span className="w-px h-3 bg-slate-200" />
                    <span className="flex items-center gap-1">
                      <ClipboardCheck size={11} className="text-slate-400" />
                      {product.requirements.length} exigence(s)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={openEditProduct}
                  className="p-2 rounded-xl bg-white/60 hover:bg-white/90 border border-white/60 transition-all text-slate-500 hover:text-sky-600"
                  title="Modifier"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteProductOpen(true)}
                  className="p-2 rounded-xl bg-white/60 hover:bg-rose-50 border border-white/60 hover:border-rose-200 transition-all text-slate-500 hover:text-rose-500"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Corps */}
          <div className="p-6 space-y-5">
            {/* Informations du lot */}
            <div className={`flex items-start gap-3.5 p-3.5 bg-gradient-to-r ${colors.bg} backdrop-blur-sm rounded-xl border ${colors.border}`}>
              <div className={`w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0`}>
                <Layers size={15} className={colors.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lot technique</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {product.technical_lot_name ?? "Non classifié"}
                </p>
                {currentLot?.description && (
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{currentLot.description}</p>
                )}
              </div>
            </div>
            {product.tender_document_id && (
            <button
              onClick={() => navigate(`/tenders/${tid}/documents/${product.tender_document_id}`)}
              className={`w-full flex items-start gap-3.5 p-3.5 bg-gradient-to-r ${colors.bg} backdrop-blur-sm rounded-xl border ${colors.border} hover:brightness-95 transition-all text-left group`}
            >
              <div className={`w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0`}>
                <FileText size={15} className={colors.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Document source</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate group-hover:text-sky-600 transition-colors">
                  {sourceDocument?.designation || `Document #${product.tender_document_id}`}
                </p>
              </div>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
            </button>
            )}
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
          <div className={`px-5 py-4 bg-gradient-to-r ${colors.bg} border-b ${colors.border} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center`}>
                <ClipboardCheck size={14} className={colors.icon} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Exigences techniques</h2>
                <p className="text-xs text-slate-400">
                  {product.requirements.length} exigence(s) enregistrée(s)
                </p>
              </div>
            </div>
            <button 
              onClick={() => setAddReqOpen(true)} 
              className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
            >
              <Plus size={13} /> Ajouter
            </button>
          </div>

          {product.requirements.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center">
                <ClipboardCheck size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-600">Aucune exigence</p>
              <p className="text-xs text-slate-400">Ajoutez la première exigence technique</p>
              <button 
                onClick={() => setAddReqOpen(true)} 
                className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
              >
                <Plus size={13} /> Ajouter une exigence
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/60">
              {product.requirements.map((req, index) => (
                <motion.button
                  key={req.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => navigate(`/tenders/${tid}/products/${pid}/requirements/${req.id}`)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/60 transition-all text-left group"
                >
                  <div className={`w-8 h-8 rounded-lg bg-white/70 border border-white/60 flex items-center justify-center flex-shrink-0 group-hover:${colors.bg} transition-colors`}>
                    <ClipboardCheck size={14} className="text-slate-400 group-hover:text-sky-600 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-sky-600 transition-colors">
                      {req.requirement}
                    </p>
                  </div>
                  <ChevronRight 
                    size={14} 
                    className="text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" 
                  />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Edit product modal amélioré ── */}
      <Modal 
        open={editProduct} 
        onClose={() => setEditProduct(false)} 
        title="Modifier le produit" 
        subtitle={product.designation}
        size="xl"
      >
        <form onSubmit={productForm.handleSubmit(onProductSave)} className="space-y-5">
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
                {...productForm.register("designation", { required: true })} 
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none shadow-sm" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Layers size={16} className="text-sky-500" />
              Lot technique
            </label>
            <Controller
              control={productForm.control}
              name="technical_lot_id"
              render={({ field }) => (
                <LotPicker lots={lots} value={field.value} onChange={field.onChange} />
              )}
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles size={11} className="text-slate-400" />
              Choisissez le lot correspondant à la nature du produit
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
            <button 
              type="button" 
              onClick={() => setEditProduct(false)} 
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={updatingProduct} 
              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {updatingProduct ? (
                <><Loader2 size={14} className="animate-spin" /> Enregistrement...</>
              ) : (
                <><Save size={14} /> Enregistrer</>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Add requirement modal amélioré ── */}
      <Modal 
        open={addReqOpen} 
        onClose={() => setAddReqOpen(false)} 
        title="Ajouter une exigence" 
        subtitle={product.designation}
        size="xl"
      >
        <form onSubmit={reqForm.handleSubmit(onAddReq)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ClipboardCheck size={16} className="text-emerald-500" />
              Exigence
              <span className="text-red-500 text-xs font-normal">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ClipboardCheck size={16} className="text-emerald-400" />
              </div>
              <input 
                {...reqForm.register("requirement", { required: true })} 
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none shadow-sm" 
                placeholder="ex: Puissance nominale" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Tag size={16} className="text-amber-500" />
                Opérateur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag size={16} className="text-amber-400" />
                </div>
                <select 
                  {...reqForm.register("operateur")} 
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-amber-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:bg-white transition-all outline-none shadow-sm"
                >
                  {OPERATEURS.map((op) => <option key={op} value={op}>{op}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Hash size={16} className="text-indigo-500" />
                Valeur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash size={16} className="text-indigo-400" />
                </div>
                <input 
                  {...reqForm.register("value")} 
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all outline-none shadow-sm" 
                  placeholder="ex: 10 kW" 
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
            <button 
              type="button" 
              onClick={() => setAddReqOpen(false)} 
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={addingReq} 
              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {addingReq ? (
                <><Loader2 size={14} className="animate-spin" /> Ajout...</>
              ) : (
                <><Check size={14} /> Ajouter</>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteProductOpen}
        title="Supprimer ce produit ?"
        description={`"${product.designation}" et toutes ses exigences seront supprimés définitivement.`}
        confirmLabel="Supprimer"
        danger
        loading={deletingProduct}
        onConfirm={() => deleteProduct(pid, { onSuccess: () => navigate(`/tenders/${tid}`) })}
        onCancel={() => setDeleteProductOpen(false)}
      />
    </ErrorBoundary>
  )
}
