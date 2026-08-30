import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useForm } from "react-hook-form"
import {
  ArrowLeft, Edit2, Trash2, Plus, Save, Tag, Link2, RefreshCw, Check,
  Loader2, Package, BarChart3, Building2,
  Sparkles, AlertCircle, ChevronRight, ChevronDown, Search,
  CheckCircle2, XCircle, MinusCircle, X,
} from "lucide-react"
import {
  useSupplierProduct, useUpdateSupplierProduct, useDeleteSupplierProduct,
  useAddCharacteristic, useUpdateCharacteristic, useDeleteCharacteristic,
} from "../../hooks/useSupplierProducts"
import { useSupplierProductComparison, useCorrectComparison, useRunComparison } from "../../hooks/useCompare"
import { useConfirmProduct } from "../../hooks/useDatasheets"
import { useTenderProduct } from "../../hooks/useProducts"
import ScoreGauge from "../../components/ui/ScoreGauge"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import Modal from "../../components/ui/Modal"
import ErrorBoundary from "../../components/ui/ErrorBoundary"

type TabId = "info" | "characteristics" | "comparison"

interface ProductForm {
  designation: string
  product_id: string
}
interface CharForm {
  technical_data: string
  value: string
}

// Couleurs pour les onglets
const TAB_COLORS: Record<TabId, { active: string; icon: string; badge: string }> = {
  info: { active: "from-sky-500 to-blue-600", icon: "text-sky-500", badge: "bg-sky-100/80 text-sky-600" },
  characteristics: { active: "from-emerald-500 to-teal-600", icon: "text-emerald-500", badge: "bg-emerald-100/80 text-emerald-600" },
  comparison: { active: "from-violet-500 to-purple-600", icon: "text-violet-500", badge: "bg-violet-100/80 text-violet-600" },
}

const EVALUATION_COLORS = {
  1: { bg: "from-emerald-50 to-teal-50", border: "border-emerald-200", text: "text-emerald-700", label: "Conforme" },
  2: { bg: "from-rose-50 to-red-50", border: "border-rose-200", text: "text-rose-700", label: "Non conforme" },
  3: { bg: "from-slate-50 to-slate-100", border: "border-slate-200", text: "text-slate-600", label: "Non spécifié" },
}

export default function SupplierProductDetailPage() {
  const { id: tenderId, datasheetId, productId } = useParams<{ id: string; datasheetId: string; productId: string }>()
  const navigate = useNavigate()
  const tid = Number(tenderId)
  const dsid = Number(datasheetId)
  const pid = Number(productId)

  const [activeTab, setActiveTab] = useState<TabId>("info")
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addCharOpen, setAddCharOpen] = useState(false)
  const [editCharTarget, setEditCharTarget] = useState<any>(null)
  const [deleteCharTarget, setDeleteCharTarget] = useState<any>(null)
  const [chosenProductId, setChosenProductId] = useState<string>("")
  const [charSearch, setCharSearch] = useState("")
  const [charFilter, setCharFilter] = useState<0 | 1 | 2 | 3>(0)
  const [expandedChars, setExpandedChars] = useState<Set<number>>(new Set())

  const [compSearch, setCompSearch] = useState("")
  const [compFilter, setCompFilter] = useState<"all" | 1 | 2 | 3>("all")
  const [compEditMode, setCompEditMode] = useState(false)
  const [compCorrections, setCompCorrections] = useState<Record<number, number>>({}) // clé = index de ligne (pas characteristic_id)
  const [expandedExigences, setExpandedExigences] = useState<Set<number>>(new Set())


  const toggleExigenceExpanded = (key: number) =>
    setExpandedExigences((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const toggleCharExpanded = (id: number) =>
    setExpandedChars((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const { data: product, isLoading, isFetching: fetchingProduct, refetch: refetchProduct } = useSupplierProduct(pid)
  const { data: comparison, isLoading: loadingComparison, isError: comparisonError, isFetching: fetchingComparison, refetch: refetchComparison } = useSupplierProductComparison(pid)
  const { data: tenderProducts } = useTenderProduct(tid)

  const isRefreshing = fetchingProduct || fetchingComparison
  const handleRefresh = () => {
    refetchProduct()
    refetchComparison()
  }

  const { mutate: updateProduct, isPending: updating } = useUpdateSupplierProduct()
  const { mutate: deleteProduct, isPending: deleting } = useDeleteSupplierProduct(dsid)
  const { mutate: addChar } = useAddCharacteristic(pid)
  const { mutate: updateChar, isPending: updatingChar } = useUpdateCharacteristic(pid)
  const { mutate: deleteChar, isPending: deletingChar } = useDeleteCharacteristic(pid)
  const { mutate: confirmProduct, isPending: confirming } = useConfirmProduct()
  const { mutate: compare, isPending: recomparing } = useRunComparison(pid)
  const { mutate: correctComparison, isPending: correcting } = useCorrectComparison(pid)

  const editForm = useForm<ProductForm>()
  const addCharForm = useForm<CharForm>()
  const editCharForm = useForm<CharForm>()

  const openEdit = () => {
    editForm.reset({ designation: product?.designation ?? "", product_id: String(product?.product_id ?? "") })
    setEditOpen(true)
  }

  const onEditSave = (d: ProductForm) => {
    updateProduct(
      { id: pid, data: { designation: d.designation, product_id: d.product_id ? Number(d.product_id) : null } },
      { onSuccess: () => setEditOpen(false) }
    )
  }

  const onConfirm = () => {
    if (!chosenProductId) return
    confirmProduct(
      { supplierProductId: pid, chosenProductId: Number(chosenProductId) },
      { onSuccess: () => { setConfirmOpen(false); setActiveTab("comparison") } }
    )
  }

  const openEditChar = (c: any) => {
    editCharForm.reset({ technical_data: c.technical_data, value: c.value ?? "" })
    setEditCharTarget(c)
  }

  const onAddChar = (d: CharForm) => {
    addChar({ technical_data: d.technical_data, value: d.value || null }, {
      onSuccess: () => { setAddCharOpen(false); addCharForm.reset() },
    })
  }

  const onEditCharSave = (d: CharForm) => {
    if (!editCharTarget) return
    updateChar(
      { id: editCharTarget.id, data: { technical_data: d.technical_data, value: d.value || null, requirement_id: editCharTarget.requirement_id ?? null } },
      { onSuccess: () => setEditCharTarget(null) }
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
        <AlertCircle size={28} className="text-rose-500" />
      </div>
      <p className="text-sm font-medium text-slate-600">Produit fournisseur introuvable</p>
      <p className="text-xs text-slate-400 mt-1">Ce produit n'existe pas ou a été supprimé</p>
    </div>
  )

  const characteristics = product.characteristics

  const filteredChars = characteristics.filter((c) => {
    const q = charSearch.trim().toLowerCase()
    const matchSearch =
      !q ||
      c.technical_data.toLowerCase().includes(q) ||
      (c.value ?? "").toLowerCase().includes(q)
    const matchFilter = charFilter === 0 || c.evaluation === charFilter
    return matchSearch && matchFilter
  })

  const charFilters: { id: 0 | 1 | 2 | 3; label: string }[] = [
    { id: 0, label: "Toutes" },
    { id: 1, label: "Conforme" },
    { id: 2, label: "Non conforme" },
    { id: 3, label: "Non spécifié" },
  ]

  const tabs = [
    { id: "info"            as TabId, label: "Informations",     icon: <Package size={14} /> },
    { id: "characteristics" as TabId, label: "Caractéristiques", icon: <Tag size={14} />,      count: characteristics.length },
    { id: "comparison"      as TabId, label: "Comparaison",      icon: <BarChart3 size={14} /> },
  ]

  const exigenceLines = comparison?.lignes ?? []

  // score === 3 = « Non spécifié » dans tous les cas (couverte évaluée 3 OU non couverte)
  const nbConf = exigenceLines.filter((l) => l.score === 1).length
  const nbNonConf = exigenceLines.filter((l) => l.score === 2).length
  const nbNonSpec = exigenceLines.filter((l) => l.score === 3).length
  const nbEvalues = nbConf + nbNonConf + nbNonSpec
  const score = comparison?.score ?? product.score

  const filteredExigenceLines = exigenceLines.filter((l) => {
    const q = compSearch.trim().toLowerCase()
    const matchSearch =
      !q ||
      l.exigence.toLowerCase().includes(q) ||
      (l.valeur_requise ?? "").toLowerCase().includes(q) ||
      l.caracteristiques_fournies.some((c) => (c.value ?? "").toLowerCase().includes(q))
    const matchFilter = compFilter === "all" || l.score === compFilter
    return matchSearch && matchFilter
  })

  const compFilters: { id: "all" | 1 | 2 | 3; label: string }[] = [
    { id: "all", label: "Toutes" },
    { id: 1, label: "Conformes" },
    { id: 2, label: "Non conformes" },
    { id: 3, label: "Non spécifiées" },
  ]

  const handleSaveCompCorrections = () => {
    const list = Object.entries(compCorrections).map(([idxStr, evaluation]) => {
      const line = exigenceLines[Number(idxStr)]
      return {
        requirement_id: line.requirement_id,
        characteristic_ids: line.caracteristiques_fournies.map((c) => c.characteristic_id),
        evaluation,
      }
    })
    if (!list.length) { setCompEditMode(false); return }
    correctComparison(list, { onSuccess: () => { setCompEditMode(false); setCompCorrections({}) } })
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Header avec retour */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={() => navigate(`/tenders/${tid}/datasheets/${dsid}`)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-sky-600 transition-colors"
            title="Retour"
          >
            <ArrowLeft size={16} /> Retour
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap lg:ml-auto">
            {!product.product_id ? (
              <button onClick={() => setConfirmOpen(true)} className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5">
                <Link2 size={13} /> Confirmer l'association
              </button>
            ) : (
              <button onClick={() => compare()} disabled={recomparing} className="px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 rounded-xl border border-amber-200/60 transition-all flex items-center gap-1.5 disabled:opacity-50">
                {recomparing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Comparer
              </button>
            )}
            <button onClick={handleRefresh} disabled={isRefreshing} title="Actualiser les scores et la comparaison" className="p-2 rounded-xl bg-white/60 hover:bg-white/90 border border-white/60 transition-all text-slate-400 hover:text-emerald-600 disabled:opacity-50">
              <RefreshCw size={14} className={isRefreshing ? "animate-spin text-emerald-500" : ""} />
            </button>
            <button onClick={openEdit} className="p-2 rounded-xl bg-white/60 hover:bg-white/90 border border-white/60 transition-all text-slate-400 hover:text-sky-600">
              <Edit2 size={14} />
            </button>
            <button onClick={() => setDeleteOpen(true)} className="p-2 rounded-xl bg-white/60 hover:bg-rose-50 border border-white/60 hover:border-rose-200 transition-all text-slate-400 hover:text-rose-500">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Alertes */}
        {!product.product_id && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 backdrop-blur-xl border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100/60 flex items-center justify-center flex-shrink-0">
              <Link2 size={14} className="text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Produit non confirmé</p>
              <p className="text-xs text-amber-600 mt-0.5">Associez ce produit à un produit tender pour lancer la comparaison technique</p>
            </div>
            <button onClick={() => setConfirmOpen(true)} className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100/60 hover:bg-amber-200/60 rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0">
              <Link2 size={13} /> Confirmer
            </button>
          </div>
        )}

        {/* Tabs améliorés */}
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
                  <span className={isActive ? "text-white" : colors.icon}>
                    {tab.icon}
                  </span>
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : colors.badge
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
          {activeTab === "info" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Scores d'évaluation : cercles + détail du calcul */}
              <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4 border-b border-violet-200">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={15} className="text-violet-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Scores d'évaluation</h3>
                    </div>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      title="Actualiser"
                      className="p-1.5 rounded-lg bg-white/70 hover:bg-white border border-violet-200/60 transition-all text-slate-400 hover:text-violet-600 disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={isRefreshing ? "animate-spin text-violet-500" : ""} />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cercle de score */}
                    <div className="flex items-center justify-center">
                      <ScoreCircle label="Conformité" hint="Respect des exigences" value={score} />
                    </div>

                    {/* Détail du calcul */}
                    {comparison ? (
                      <div className="space-y-3">
                        {/* Compteurs */}
                        <div className="grid grid-cols-3 gap-2">
                          <StatPill icon={CheckCircle2} count={nbConf} label="Conformes" color="emerald" />
                          <StatPill icon={XCircle} count={nbNonConf} label="Non conformes" color="rose" />
                          <StatPill icon={MinusCircle} count={nbNonSpec} label="Non spécifiées" color="slate" />
                        </div>

                        {/* Formules */}
                        <div className="rounded-xl bg-slate-50/80 border border-slate-200 p-3 space-y-2.5">
                          <FormulaRow
                            label="Conformité"
                            color="text-emerald-600"
                            formula="conformes ÷ total des exigences × 100"
                            numeric={`${nbConf} ÷ ${nbEvalues || 0} × 100`}
                            result={`${score !== null ? score.toFixed(2) : "—"} %`}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50/80 border border-slate-200 p-4 text-center">
                        <BarChart3 size={22} className="text-slate-300" />
                        <p className="text-xs font-medium text-slate-500">Détail du calcul indisponible</p>
                        <p className="text-[11px] text-slate-400">
                          {product.product_id ? "Lancez la comparaison pour voir le détail" : "Confirmez d'abord l'association"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Détails du produit */}
              <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
                <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-6 py-4 border-b border-sky-200">
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-sky-500" />
                    <h3 className="text-sm font-semibold text-slate-800">Détails du produit</h3>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {/* Désignation — pleine largeur, une seule ligne */}
                  <InfoCard
                    icon={Package}
                    label="Désignation"
                    value={product.designation}
                    color="from-sky-50 to-blue-50"
                    border="border-sky-200"
                    iconColor="text-sky-500"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Fournisseur — bouton cliquable */}
                    <LinkCard
                      icon={Building2}
                      label="Fournisseur"
                      value={product.supplier_name || "—"}
                      color="from-emerald-50 to-teal-50"
                      border="border-emerald-200"
                      iconColor="text-emerald-500"
                      disabled={!product.supplier_id}
                      onClick={() => product.supplier_id && navigate(`/suppliers/${product.supplier_id}`)}
                    />

                    {/* Produit AO lié — bouton cliquable */}
                    <LinkCard
                      icon={Link2}
                      label="Produit AO lié"
                      value={product.tender_product_designation ?? "Non confirmé"}
                      color={product.product_id ? "from-emerald-50 to-teal-50" : "from-amber-50 to-orange-50"}
                      border={product.product_id ? "border-emerald-200" : "border-amber-200"}
                      iconColor={product.product_id ? "text-emerald-500" : "text-amber-500"}
                      disabled={!product.product_id}
                      onClick={() =>
                        product.product_id &&
                        navigate(`/tenders/${product.tender_id ?? tid}/products/${product.product_id}`)
                      }
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "characteristics" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
                <div className={`bg-gradient-to-r ${TAB_COLORS.characteristics.active} px-6 py-4 border-b border-white/20`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag size={15} className="text-white" />
                      <h3 className="text-sm font-semibold text-white">Caractéristiques techniques</h3>
                      <span className="text-[10px] font-medium text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                        {characteristics.length}
                      </span>
                    </div>
                    <button onClick={() => setAddCharOpen(true)} className="px-3 py-1.5 text-xs font-medium text-white bg-white/20 hover:bg-white/30 rounded-xl transition-all flex items-center gap-1.5">
                      <Plus size={13} /> Ajouter
                    </button>
                  </div>
                </div>

                {characteristics.length === 0 ? (
                  <div className="flex flex-col items-center py-12 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center">
                      <Tag size={24} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Aucune caractéristique</p>
                    <p className="text-xs text-slate-400">Ajoutez des caractéristiques techniques</p>
                    <button onClick={() => setAddCharOpen(true)} className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5">
                      <Plus size={13} /> Ajouter une caractéristique
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Barre de recherche + filtres */}
                    <div className="px-4 pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          value={charSearch}
                          onChange={(e) => setCharSearch(e.target.value)}
                          placeholder="Rechercher par nom ou valeur..."
                          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {charFilters.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setCharFilter(f.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                              charFilter === f.id
                                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredChars.length === 0 ? (
                      <div className="flex flex-col items-center py-10 gap-2">
                        <Search size={22} className="text-slate-300" />
                        <p className="text-sm font-medium text-slate-500">Aucun résultat</p>
                        <p className="text-xs text-slate-400">Aucune caractéristique ne correspond à votre recherche</p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-2.5">
                        {filteredChars.map((c, index) => {
                          const evalColors = c.evaluation ? EVALUATION_COLORS[c.evaluation as keyof typeof EVALUATION_COLORS] : null
                          const isOpen = expandedChars.has(c.id)
                          return (
                            <motion.div
                              key={c.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all overflow-hidden"
                            >
                              <div className="flex items-center gap-4 p-3.5">
                                {/* Chevron expand/collapse */}
                                <button
                                  onClick={() => toggleCharExpanded(c.id)}
                                  title={isOpen ? "Réduire" : "Voir la valeur complète"}
                                  className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-500 hover:bg-emerald-100 transition-all"
                                >
                                  <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                </button>

                                {/* Caractéristique + valeur (repliée) */}
                                <button onClick={() => toggleCharExpanded(c.id)} className="flex-1 min-w-0 text-left">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{c.technical_data}</p>
                                  {!isOpen && (
                                    <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">
                                      {c.value || <span className="text-slate-300">Valeur non renseignée</span>}
                                    </p>
                                  )}
                                </button>

                                {/* Évaluation */}
                                <div className="flex-shrink-0">
                                  {c.evaluation ? (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gradient-to-r ${evalColors?.bg} ${evalColors?.text} border ${evalColors?.border}`}>
                                      {evalColors?.label}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
                                      Non évalué
                                    </span>
                                  )}
                                </div>

                                {/* Actions — toujours visibles */}
                                <div className="flex items-center gap-1.5 flex-shrink-0 pl-2 border-l border-slate-100">
                                  <button onClick={() => openEditChar(c)} title="Modifier" className="w-8 h-8 rounded-lg bg-sky-50 hover:bg-sky-100 flex items-center justify-center text-sky-500 hover:text-sky-600 transition-all">
                                    <Edit2 size={13} />
                                  </button>
                                  <button onClick={() => setDeleteCharTarget(c)} title="Supprimer" className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500 hover:text-rose-600 transition-all">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Valeur complète (dépliée) */}
                              <AnimatePresence initial={false}>
                                {isOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-3.5 pb-3.5">
                                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Valeur</p>
                                        <p className="text-sm font-mono text-slate-700 whitespace-pre-wrap break-words">
                                          {c.value || <span className="text-slate-300">Valeur non renseignée</span>}
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "comparison" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
                <div className={`bg-gradient-to-r ${TAB_COLORS.comparison.active} px-6 py-4 border-b border-white/20`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={15} className="text-white" />
                      <h3 className="text-sm font-semibold text-white">Analyse comparative</h3>
                      {comparison && (
                        <span className="text-[10px] font-medium text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                          {exigenceLines.length}
                        </span>
                      )}
                    </div>

                    {comparison && product.product_id && (
                      <div className="flex items-center gap-1.5">
                        {compEditMode ? (
                          <>
                            <button
                              onClick={() => { setCompEditMode(false); setCompCorrections({}) }}
                              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                            >
                              <X size={14} />
                            </button>
                            <button
                              onClick={handleSaveCompCorrections}
                              disabled={correcting}
                              className="px-3 py-1.5 text-xs font-medium text-violet-700 bg-white hover:bg-white/90 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {correcting ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                              Sauvegarder
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setCompEditMode(true)}
                              title="Corriger manuellement"
                              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => compare()}
                              disabled={recomparing}
                              title="Relancer la comparaison"
                              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all disabled:opacity-50"
                            >
                              {recomparing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {loadingComparison ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-slate-400">Chargement de la comparaison...</p>
                    </div>
                  </div>
                ) : comparisonError || !comparison ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center mx-auto mb-4">
                      <BarChart3 size={28} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Comparaison non disponible</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {product.product_id ? "Lancez la comparaison via le bouton ci-dessous" : "Confirmez d'abord l'association avec un produit tender"}
                    </p>
                    {product.product_id && (
                      <button onClick={() => compare()} className="mt-4 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 rounded-xl border border-amber-200/60 transition-all flex items-center gap-1.5 mx-auto">
                        <RefreshCw size={13} /> Lancer la comparaison
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Recherche + filtres */}
                    <div className="px-4 pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          value={compSearch}
                          onChange={(e) => setCompSearch(e.target.value)}
                          placeholder="Rechercher une exigence ou une valeur..."
                          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {compFilters.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setCompFilter(f.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                              compFilter === f.id
                                ? "bg-violet-500 text-white border-violet-500 shadow-sm"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredExigenceLines.length === 0 ? (
                      <div className="flex flex-col items-center py-10 gap-2">
                        <Search size={22} className="text-slate-300" />
                        <p className="text-sm font-medium text-slate-500">Aucun résultat</p>
                        <p className="text-xs text-slate-400">Aucune exigence ne correspond à votre recherche</p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-2.5">
                        {filteredExigenceLines.map((line, index) => {
                          const evalColors = EVALUATION_COLORS[line.score as keyof typeof EVALUATION_COLORS] ?? EVALUATION_COLORS[3]
                          const isOpen = expandedExigences.has(index)
                          const canEdit = compEditMode && !line.is_non_couverte && line.caracteristiques_fournies.length > 0
                          const currentScore = compCorrections[index] ?? line.score

                          return (
                            <motion.div
                              key={line.requirement_id ?? `nr-${index}`}
                              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                              className="rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-violet-200 transition-all overflow-hidden"
                            >
                              <div className="flex items-center gap-4 p-3.5">
                                <button
                                  onClick={() => toggleExigenceExpanded(index)}
                                  className="w-9 h-9 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0 text-violet-500 hover:bg-violet-100 transition-all"
                                >
                                  <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                </button>

                                <button onClick={() => toggleExigenceExpanded(index)} className="flex-1 min-w-0 text-left">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{line.exigence}</p>
                                  {!isOpen && (
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                      {line.caracteristiques_fournies.length > 0
                                        ? `${line.caracteristiques_fournies.length} caractéristique(s) fournie(s)`
                                        : <span className="text-slate-300 italic">Aucune</span>}
                                    </p>
                                  )}
                                </button>

                                <div className="flex-shrink-0">
                                  {canEdit ? (
                                    // Exigence déjà spécifiée (réponse fournie) → uniquement Conforme / Non conforme
                                    <select
                                      value={currentScore}
                                      onChange={(e) => setCompCorrections((prev) => ({ ...prev, [index]: Number(e.target.value) }))}
                                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                    >
                                      {currentScore !== 1 && currentScore !== 2 && (
                                        <option value={currentScore} disabled>À corriger…</option>
                                      )}
                                      <option value={1}>Conforme</option>
                                      <option value={2}>Non conforme</option>
                                    </select>
                                  ) : (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gradient-to-r ${evalColors.bg} ${evalColors.text} border ${evalColors.border}`}>
                                      {evalColors.label}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <AnimatePresence initial={false}>
                                {isOpen && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-3.5 pb-3.5 space-y-2.5">
                                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center gap-4 text-xs">
                                        <span className="text-slate-400">Opérateur :</span>
                                        {line.operateur ? (
                                          <span className="px-2 py-0.5 bg-white text-slate-600 rounded-full border border-slate-200 font-medium">{line.operateur}</span>
                                        ) : <span className="text-slate-300">—</span>}
                                        <span className="text-slate-400 ml-2">Valeur requise :</span>
                                        <span className="font-mono text-slate-700">{line.valeur_requise || "—"}</span>
                                      </div>

                                      {line.caracteristiques_fournies.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic px-1">Aucune caractéristique fournisseur ne couvre cette exigence.</p>
                                      ) : (
                                        <div className="rounded-lg bg-slate-50 border border-slate-100 overflow-hidden">
                                          <table className="w-full text-xs">
                                            <thead>
                                              <tr className="border-b border-slate-200 bg-slate-100/60">
                                                <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wider">Caractéristique fournisseur</th>
                                                <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wider">Valeur fournie</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {line.caracteristiques_fournies.map((c) => (
                                                <tr key={c.characteristic_id}>
                                                  <td className="px-3 py-2 text-slate-600">{c.technical_data}</td>
                                                  <td className="px-3 py-2 font-mono text-slate-700">{c.value || "—"}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </ErrorBoundary>
      </motion.div>

      {/* Modals et ConfirmDialogs */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le produit fournisseur" subtitle={product.designation}>
        <form onSubmit={editForm.handleSubmit(onEditSave)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Package size={16} className="text-sky-500" />
              Désignation
              <span className="text-red-500 text-xs font-normal">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Package size={16} className="text-sky-400" />
              </div>
              <input {...editForm.register("designation", { required: true })} className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-sky-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none shadow-sm" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
            <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5">
              Annuler
            </button>
            <button type="submit" disabled={updating} className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60">
              {updating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirmer l'association" subtitle="Sélectionnez le produit tender correspondant">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Link2 size={16} className="text-sky-500" />
              Produit tender correspondant
              <span className="text-red-500 text-xs font-normal">*</span>
            </label>
            <select value={chosenProductId} onChange={(e) => setChosenProductId(e.target.value)} className="w-full px-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-sky-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none shadow-sm">
              <option value="">— Sélectionner —</option>
              {(tenderProducts ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.designation} {p.technical_lot_name ? `(${p.technical_lot_name})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200">
            <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Cette action va lier définitivement ce produit au produit tender sélectionné.
              Lancez ensuite la comparaison technique manuellement depuis l'onglet Comparaison.
            </p>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
            <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5">
              Annuler
            </button>
            <button onClick={onConfirm} disabled={!chosenProductId || confirming} className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60">
              {confirming ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirmer et comparer
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={addCharOpen} onClose={() => setAddCharOpen(false)} title="Ajouter une caractéristique" subtitle="Caractéristique technique du produit">
        <form onSubmit={addCharForm.handleSubmit(onAddChar)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Tag size={16} className="text-emerald-500" />
              Caractéristique
              <span className="text-red-500 text-xs font-normal">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Tag size={16} className="text-emerald-400" />
              </div>
              <input {...addCharForm.register("technical_data", { required: true })} className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none shadow-sm" placeholder="ex: Puissance nominale" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Sparkles size={16} className="text-amber-500" />
              Valeur
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Sparkles size={16} className="text-amber-400" />
              </div>
              <input {...addCharForm.register("value")} className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-amber-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:bg-white transition-all outline-none shadow-sm" placeholder="ex: 10 kW" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
            <button type="button" onClick={() => setAddCharOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5">
              <Check size={14} /> Ajouter
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editCharTarget} onClose={() => setEditCharTarget(null)} title="Modifier la caractéristique">
        <form onSubmit={editCharForm.handleSubmit(onEditCharSave)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Tag size={16} className="text-sky-500" />
              Caractéristique
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Tag size={16} className="text-sky-400" />
              </div>
              <input {...editCharForm.register("technical_data", { required: true })} className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-sky-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none shadow-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Sparkles size={16} className="text-amber-500" />
              Valeur
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Sparkles size={16} className="text-amber-400" />
              </div>
              <input {...editCharForm.register("value")} className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-amber-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:bg-white transition-all outline-none shadow-sm" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
            <button type="button" onClick={() => setEditCharTarget(null)} className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5">
              Annuler
            </button>
            <button type="submit" disabled={updatingChar} className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60">
              {updatingChar ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteCharTarget}
        title="Supprimer cette caractéristique ?"
        description={`"${deleteCharTarget?.technical_data}" sera supprimée définitivement.`}
        confirmLabel="Supprimer"
        danger
        loading={deletingChar}
        onConfirm={() => deleteChar(deleteCharTarget!.id, { onSuccess: () => setDeleteCharTarget(null) })}
        onCancel={() => setDeleteCharTarget(null)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Supprimer ce produit fournisseur ?"
        description={`"${product.designation}" et toutes ses caractéristiques seront supprimés définitivement.`}
        confirmLabel="Supprimer"
        danger
        loading={deleting}
        onConfirm={() => deleteProduct(pid, { onSuccess: () => navigate(`/tenders/${tid}/datasheets/${dsid}`) })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}

// Composant InfoCard
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

// Carte cliquable (Fournisseur / Produit AO lié)
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
        disabled
          ? "opacity-70 cursor-not-allowed"
          : "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
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

// Cercle de score (Conformité / Couverture)
function ScoreCircle({ label, hint, value }: {
  label: string
  hint: string
  value: number | null
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200">
      {value !== null ? (
        <ScoreGauge value={value} size="md" showLabel={false} decimals={2} />
      ) : (
        <div className="w-20 h-20 rounded-full border-4 border-slate-200 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-slate-300">—</span>
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>
      </div>
    </div>
  )
}

// Pastille compteur (conformes / non conformes / etc.)
const STAT_PILL_COLORS = {
  emerald: "from-emerald-50 to-teal-50 border-emerald-200 text-emerald-600",
  rose: "from-rose-50 to-red-50 border-rose-200 text-rose-600",
  slate: "from-slate-50 to-slate-100 border-slate-200 text-slate-500",
  amber: "from-amber-50 to-orange-50 border-amber-200 text-amber-600",
}
function StatPill({ icon: Icon, count, label, color }: {
  icon: React.ElementType
  count: number
  label: string
  color: keyof typeof STAT_PILL_COLORS
}) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r border ${STAT_PILL_COLORS[color]}`}>
      <Icon size={16} className="flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-base font-bold leading-none text-slate-800">{count}</p>
        <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  )
}

// Ligne de formule (libellé = formule = calcul = résultat)
function FormulaRow({ label, color, formula, numeric, result }: {
  label: string
  color: string
  formula: string
  numeric: string
  result: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${color}`}>{label}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{formula}</p>
        <p className="text-[11px] font-mono text-slate-500 mt-0.5">{numeric}</p>
      </div>
      <span className="text-sm font-bold text-slate-800 flex-shrink-0">{result}</span>
    </div>
  )
}
