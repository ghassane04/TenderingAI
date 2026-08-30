import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import {
  ArrowLeft, FileText, Package,
  Loader2, RefreshCw, AlertCircle,
  Building2, Layers, Calendar, User, HardDrive, FileType,
  ClipboardCheck, Eye, ChevronRight, Sparkles, Check, Link2, Plus, Trash2,
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  useDatasheetDetail, useViewDatasheetFile,
  useSemanticMatch, useConfirmProduct,
} from "../../hooks/useDatasheets"
import {
  useDatasheetSupplierProducts, useAddSupplierProduct, useDeleteSupplierProduct,
} from "../../hooks/useSupplierProducts"
import ErrorBoundary from "../../components/ui/ErrorBoundary"
import StatusBadge from "../../components/ui/StatusBadge"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import type { ProductCandidate } from "../../api/datasheets"

type TabId = "overview" | "products"

const TAB_COLORS: Record<TabId, { active: string; icon: string; badge: string }> = {
  overview: { active: "from-sky-500 to-blue-600", icon: "text-sky-500", badge: "bg-sky-100/80 text-sky-600" },
  products: { active: "from-emerald-500 to-teal-600", icon: "text-emerald-500", badge: "bg-emerald-100/80 text-emerald-600" },
}

interface AddForm {
  designation: string
}

export default function DatasheetDetailPage() {
  const { id: tenderId, datasheetId } = useParams<{ id: string; datasheetId: string }>()
  const navigate = useNavigate()
  const tid = Number(tenderId)
  const dsid = Number(datasheetId)

  const [activeTab, setActiveTab] = useState<TabId>("overview")

  // Produits (intégré depuis l'ancien DatasheetProductsTab)
  const [candidates, setCandidates] = useState<Record<number, ProductCandidate[]>>({})
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; designation: string } | null>(null)
  const addForm = useForm<AddForm>()

  const { mutate: viewFile, isPending: isOpeningFile } = useViewDatasheetFile()
  const { data: ds, isLoading, isFetching: fetchingDs, refetch: refetchDs } = useDatasheetDetail(dsid)
  const { data: productsData, isFetching: fetchingProducts, refetch: refetchProducts } = useDatasheetSupplierProducts(dsid)

  const { mutate: runMatch, isPending: matching } = useSemanticMatch(tid)
  const { mutate: confirmProduct, isPending: confirming, variables: confirmingVars } = useConfirmProduct()
  const { mutate: addProduct, isPending: adding } = useAddSupplierProduct(dsid)
  const { mutate: deleteProduct, isPending: deleting } = useDeleteSupplierProduct(dsid)

  const fmt = (d: string | null) =>
    d ? format(new Date(d), "dd MMM yyyy à HH:mm", { locale: fr }) : "—"

  const isFetchingAny = fetchingDs || fetchingProducts
  const handleRefreshAll = () => {
    refetchDs()
    refetchProducts()
  }

  const handleMatch = () => {
    if (!ds?.technical_lot_id) return
    runMatch(
      { datasheetId: dsid, lotId: ds.technical_lot_id },
      {
        onSuccess: (result) => {
          const map: Record<number, ProductCandidate[]> = {}
          for (const p of result.produits ?? []) map[p.supplier_product_id] = p.candidats
          setCandidates(map)
        },
      }
    )
  }

  const onAddSubmit = (d: AddForm) => {
    addProduct({ designation: d.designation }, { onSuccess: () => { setAddOpen(false); addForm.reset() } })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Chargement de la fiche...</p>
      </div>
    </div>
  )

  if (!ds) return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center max-w-3xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={28} className="text-rose-500" />
      </div>
      <p className="text-sm font-medium text-slate-600">Fiche technique introuvable</p>
      <p className="text-xs text-slate-400 mt-1">Cette fiche n'existe pas ou a été supprimée</p>
      <button onClick={() => navigate(`/tenders/${tid}`)} className="btn-secondary text-xs mt-4">
        <ArrowLeft size={13} /> Retour au tender
      </button>
    </div>
  )

  const products = productsData?.products ?? []
  const totalCharacteristics = products.reduce((a, p) => a + p.characteristics.length, 0)

  const tabs = [
    { id: "overview" as TabId, label: "Vue d'ensemble", icon: <FileText size={14} /> },
    { id: "products" as TabId, label: "Produits",       icon: <Package size={14} />, count: products.length },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header : retour à gauche, actions groupées à droite */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate(`/tenders/${tid}`)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-sky-600 transition-colors"
        >
          <ArrowLeft size={14} /> Retour à l'appel d'offres
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={isFetchingAny}
            className="p-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:bg-white/80 transition-all disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw size={14} className={isFetchingAny ? "animate-spin text-sky-500" : "text-slate-400"} />
          </button>
          <button
            onClick={() => viewFile({ datasheetId: dsid, filename: ds.designation || `fiche-${dsid}` })}
            disabled={isOpeningFile}
            className="px-3 py-2 text-xs font-medium text-slate-600 bg-white/60 hover:bg-white/90 rounded-xl border border-white/40 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isOpeningFile ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
            Voir le fichier
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-1.5 overflow-x-auto shadow-sm">
        <nav className="flex gap-1 w-full min-w-max">
          {tabs.map((tab) => {
            const colors = TAB_COLORS[tab.id]
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${colors.active} text-white shadow-md`
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/40 border border-transparent"
                }`}
              >
                <span className={isActive ? "text-white" : colors.icon}>{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive ? "bg-white/20 text-white" : colors.badge
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <ErrorBoundary>
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {ds.status === "En cours" && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50/80 border border-amber-200">
                <Loader2 size={16} className="animate-spin text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Extraction en cours</p>
                  <p className="text-xs text-amber-600">Le traitement peut prendre quelques instants selon la taille du document.</p>
                </div>
              </div>
            )}

            <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
              <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-6 py-5 border-b border-sky-200">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center border border-sky-200 flex-shrink-0">
                      <FileText size={22} className="text-sky-500" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-slate-800 truncate">
                        {ds.designation || `Fiche #${dsid}`}
                      </h1>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        <StatusBadge status={ds.status} />
                        <span className="flex items-center gap-1">
                          <FileType size={11} className="text-slate-400" />
                          {ds.filetype || "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive size={11} className="text-slate-400" />
                          {ds.file_size || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <LinkCard
                    icon={Building2}
                    label="Fournisseur"
                    value={ds.supplier_name || "—"}
                    color="from-sky-50 to-blue-50"
                    border="border-sky-200"
                    iconColor="text-sky-500"
                    disabled={!ds.supplier_id}
                    onClick={() => ds.supplier_id && navigate(`/suppliers/${ds.supplier_id}`)}
                  />
                  <LinkCard
                    icon={Layers}
                    label="Lot"
                    value={ds.lot_name || "—"}
                    color="from-emerald-50 to-teal-50"
                    border="border-emerald-200"
                    iconColor="text-emerald-500"
                    disabled={!ds.technical_lot_id}
                    onClick={() => ds.technical_lot_id && navigate(`/settings/lots/${ds.technical_lot_id}`)}
                  />
                  <InfoCard
                    icon={Calendar}
                    label="Reçu le"
                    value={fmt(ds.uploaded_at)}
                    color="from-amber-50 to-orange-50"
                    border="border-amber-200"
                    iconColor="text-amber-500"
                  />
                  <InfoCard
                    icon={User}
                    label="Par"
                    value={ds.uploaded_by || "—"}
                    color="from-violet-50 to-purple-50"
                    border="border-violet-200"
                    iconColor="text-violet-500"
                  />
                  <InfoCard
                    icon={Package}
                    label="Produits extraits"
                    value={products.length}
                    color="from-rose-50 to-red-50"
                    border="border-rose-200"
                    iconColor="text-rose-500"
                  />
                  <InfoCard
                    icon={ClipboardCheck}
                    label="Caractéristiques"
                    value={totalCharacteristics}
                    color="from-indigo-50 to-blue-50"
                    border="border-indigo-200"
                    iconColor="text-indigo-500"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "products" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
              {/* En-tête produits + actions */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-white" />
                    <h3 className="text-sm font-semibold text-white">Produits extraits</h3>
                    <span className="text-[10px] font-medium text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                      {products.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAddOpen(true)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-white/20 hover:bg-white/30 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Plus size={13} /> Ajouter un produit
                    </button>
                    <button
                      onClick={handleMatch}
                      disabled={matching || !ds.technical_lot_id}
                      title={!ds.technical_lot_id ? "Cette fiche n'a pas de lot technique associé" : undefined}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white hover:bg-emerald-50 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {matching ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      Matching sémantique
                    </button>
                  </div>
                </div>
              </div>

              {products.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center">
                    <Package size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">Aucun produit extrait</p>
                  <p className="text-xs text-slate-400">L'extraction n'a pas encore été effectuée</p>
                  <button
                    onClick={() => setAddOpen(true)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
                  >
                    <Plus size={13} /> Ajouter un produit
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-2.5">
                  {products.map((product, index) => {
                    const productCandidates = candidates[product.id]
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.3) }}
                        className="rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all overflow-hidden"
                      >
                        <div className="flex items-center gap-4 p-3.5">
                          {/* Produit cliquable */}
                          <button
                            onClick={() => navigate(`/tenders/${tid}/datasheets/${dsid}/products/${product.id}`)}
                            className="flex-1 flex items-center gap-3 text-left group min-w-0"
                          >
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                              <Package size={15} className="text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                                {product.designation}
                              </p>
                              {product.tender_product_designation ? (
                                <p className="text-xs text-emerald-600 mt-0.5 truncate">
                                  → Associé à : {product.tender_product_designation}
                                </p>
                              ) : (
                                <span className="inline-flex items-center mt-0.5 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  Non confirmé
                                </span>
                              )}
                            </div>
                          </button>

                          {/* Barres Conformité / Couverture */}
                          {product.score !== null && (
                            <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                              <ScoreBar label="Conf." value={product.score} />
                            </div>
                          )}

                          <ChevronRight
                            size={16}
                            className="text-slate-300 flex-shrink-0 cursor-pointer hover:text-emerald-500 transition-colors"
                            onClick={() => navigate(`/tenders/${tid}/datasheets/${dsid}/products/${product.id}`)}
                          />

                          {/* Supprimer */}
                          <button
                            onClick={() => setDeleteTarget({ id: product.id, designation: product.designation })}
                            className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500 hover:text-rose-600 transition-all flex-shrink-0"
                            title="Supprimer ce produit"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Suggestions matching sémantique */}
                        {!product.product_id && productCandidates && productCandidates.length > 0 && (
                          <div className="px-4 py-3 bg-emerald-50/40 border-t border-emerald-100 space-y-1.5">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles size={11} /> Suggestions (matching sémantique)
                            </p>
                            {productCandidates.map((c) => {
                              const isConfirmingThis = confirming && confirmingVars?.supplierProductId === product.id && confirmingVars?.chosenProductId === c.product_id
                              return (
                                <div key={c.product_id} className="flex items-center justify-between gap-2 py-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Link2 size={12} className="text-slate-400 flex-shrink-0" />
                                    <span className="text-xs text-slate-700 truncate">{c.designation}</span>
                                    <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">{Math.round(c.score * 100)}%</span>
                                  </div>
                                  <button
                                    onClick={() => confirmProduct({ supplierProductId: product.id, chosenProductId: c.product_id })}
                                    disabled={confirming}
                                    className="px-2.5 py-1 text-[11px] font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-lg transition-all flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
                                  >
                                    {isConfirmingThis ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                    Confirmer
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </ErrorBoundary>

      {/* Modal ajout produit */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Ajouter un produit fournisseur" subtitle="Produit non détecté par l'extraction automatique">
        <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Package size={16} className="text-emerald-500" />
              Désignation
              <span className="text-red-500 text-xs font-normal">*</span>
            </label>
            <input
              {...addForm.register("designation", { required: true })}
              className="w-full px-4 py-2.5 text-sm bg-white/90 border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none shadow-sm"
              placeholder="ex: Onduleur 1000VA Modèle X"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all">
              Annuler
            </button>
            <button type="submit" disabled={adding} className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60">
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Ajouter
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer ce produit ?"
        description={`"${deleteTarget?.designation}" et ses caractéristiques seront supprimés définitivement.`}
        confirmLabel="Supprimer"
        danger
        loading={deleting}
        onConfirm={() => deleteProduct(deleteTarget!.id, { onSuccess: () => setDeleteTarget(null) })}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}

// Carte d'information (non cliquable)
function InfoCard({ icon: Icon, label, value, color, border, iconColor }: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  color: string
  border: string
  iconColor: string
}) {
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl bg-gradient-to-r ${color} backdrop-blur-sm border ${border}`}>
      <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
        <Icon size={13} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  )
}

// Carte cliquable (Fournisseur / Lot)
function LinkCard({ icon: Icon, label, value, color, border, iconColor, onClick, disabled }: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  color: string
  border: string
  iconColor: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group w-full text-left flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r ${color} backdrop-blur-sm border ${border} transition-all ${
        disabled ? "opacity-70 cursor-not-allowed" : "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
      }`}
    >
      <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
        <Icon size={13} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5 truncate">{value}</p>
      </div>
      {!disabled && (
        <ChevronRight size={16} className="text-slate-400 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
      )}
    </button>
  )
}

// Barre de score (remplace le cercle) — Conformité / Couverture
function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const v = Math.min(100, Math.max(0, value ?? 0))
  const barColor = v >= 80 ? "bg-emerald-500" : v >= 50 ? "bg-amber-500" : "bg-rose-500"
  const textColor = v >= 80 ? "text-emerald-600" : v >= 50 ? "text-amber-600" : "text-rose-600"
  return (
    <div className="w-24">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-slate-400">{label}</span>
        <span className={`text-[10px] font-bold ${textColor}`}>{Math.round(v)}%</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}
