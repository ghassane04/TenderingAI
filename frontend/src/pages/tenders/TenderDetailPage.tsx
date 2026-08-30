import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowLeft, FileText, Package, FileOutput, Mail, 
  Building2, Inbox, FolderOpen, RefreshCw, AlertCircle, BarChart3,
} from "lucide-react"
import { useTenderMetadata } from "../../hooks/useTenders"
import { useTenderProduct } from "../../hooks/useProducts"
import { useTenderPdfs } from "../../hooks/usePdf"
import { useTenderEmails } from "../../hooks/useEmails"
import { useTenderDocuments } from "../../hooks/useDocuments"
import { useDatasheetsByTender } from "../../hooks/useDatasheets"
import { useTenderLotRankings } from "../../hooks/useCompare"
import ErrorBoundary from "../../components/ui/ErrorBoundary"
import TabMetadata   from "../../components/tenders/detail/TabMetadata"
import TabProducts   from "../../components/tenders/detail/TabProducts"
import TabDocuments  from "../../components/tenders/detail/TabDocuments"
import TabPdfs       from "../../components/tenders/detail/TabPdfs"
import TabEmails     from "../../components/tenders/detail/TabEmails"
import TabSuppliers  from "../../components/tenders/detail/TabSuppliers"
import TabDatasheets from "../../components/tenders/detail/TabDatasheets"
import TabComparison from "../../components/tenders/detail/TabComparison"

type TabId = "metadata" | "documents" | "products" | "pdfs" | "suppliers" | "emails" | "datasheets" | "comparison"

// Couleurs pour les onglets
const TAB_COLORS: Record<TabId, { active: string; icon: string; badge: string }> = {
  metadata: { active: "from-sky-500 to-blue-600", icon: "text-sky-500", badge: "bg-sky-100/80 text-sky-600" },
  documents: { active: "from-indigo-500 to-purple-600", icon: "text-indigo-500", badge: "bg-indigo-100/80 text-indigo-600" },
  products: { active: "from-emerald-500 to-teal-600", icon: "text-emerald-500", badge: "bg-emerald-100/80 text-emerald-600" },
  pdfs: { active: "from-rose-500 to-red-600", icon: "text-rose-500", badge: "bg-rose-100/80 text-rose-600" },
  suppliers: { active: "from-cyan-500 to-sky-600", icon: "text-cyan-500", badge: "bg-cyan-100/80 text-cyan-600" },
  emails: { active: "from-violet-500 to-purple-600", icon: "text-violet-500", badge: "bg-violet-100/80 text-violet-600" },
  datasheets: { active: "from-teal-500 to-emerald-600", icon: "text-teal-500", badge: "bg-teal-100/80 text-teal-600" },
  comparison: { active: "from-fuchsia-500 to-pink-600", icon: "text-fuchsia-500", badge: "bg-fuchsia-100/80 text-fuchsia-600" },
}

export default function TenderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const tenderId = id ? Number(id) : 0
  const [activeTab, setActiveTab] = useState<TabId>("metadata")

  const {
    data: tender, isLoading: loadingMeta, isError: errorMeta,
    fetchingMeta, refetch: refetchMeta,
  } = useTenderMetadata(tenderId) as any

  const {
    data: products = [], isLoading: loadingProducts,
    fetchingProducts, refetch: refetchProducts,
  } = useTenderProduct(tenderId) as any

  const {
    data: pdfs = [], isLoading: loadingPdfs,
    fetchingPdfs, refetch: refetchPdfs,
  } = useTenderPdfs(tenderId) as any

  const {
    data: emailsResponse, isLoading: loadingEmails,
    fetchingEmails, refetch: refetchEmails,
  } = useTenderEmails(tenderId) as any

  const {
    data: documentsData, isLoading: loadingDocs,
    fetchingDocs, refetch: refetchDocs,
  } = useTenderDocuments(tenderId) as any

  const {
    data: datasheetData, isLoading: loadingDatasheets,
    isFetching: fetchingDatasheet, refetch: refetchDatasheets,
  } = useDatasheetsByTender(tenderId)

  const {
    data: comparisonData, isLoading: loadingComparison,
    isFetching: fetchingComparison, refetch: refetchComparison,
  } = useTenderLotRankings(tenderId)
  
  const isRefreshingAll =
    fetchingMeta || fetchingProducts ||
    fetchingPdfs || fetchingEmails || fetchingDocs || fetchingDatasheet ||
    fetchingComparison

const handleRefreshAll = () => {
  refetchMeta()
  refetchProducts()
  refetchPdfs()
  refetchEmails()
  refetchDocs()
  refetchDatasheets()
  refetchComparison()
}

  if (loadingMeta) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Chargement du tender...</p>
      </div>
    </div>
  )

  if (errorMeta || !tender || isNaN(tenderId)) return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={28} className="text-rose-500" />
      </div>
      <p className="text-red-500 font-medium">Appel d'offres introuvable</p>
      <button onClick={() => navigate("/tenders")} className="btn-secondary text-xs mt-4">
        <ArrowLeft size={13} /> Retour à la liste des tenders
      </button>
    </div>
  )

  const allTsl = emailsResponse?.items ?? []
  const documents = documentsData ?? []

  // Nombre de comparaisons = total des fournisseurs classés, tous lots confondus
  // (une entrée par couple lot × fournisseur, soit le nombre de lignes affichées dans l'onglet)
  const comparisonCount = (comparisonData ?? []).reduce(
    (sum, lot) => sum + lot.suppliers.length,
    0
  )

  const stats = {
    products: products.length,
    requirements: products.reduce(
      (a: number, p: any) => a + (p.requirements?.length ?? 0),
      0
    ),
    pdfs: pdfs.filter((p: any) => p.exists).length,
  }

  const tabs = [
    { id: "metadata"   as TabId, label: "Métadonnées",   icon: <FileText size={14} />, count: null },
    { id: "documents"  as TabId, label: "Documents",     icon: <FolderOpen size={14} />, count: documents.length },
    { id: "products"   as TabId, label: "Produits",      icon: <Package size={14} />,    count: products.length },
    { id: "pdfs"       as TabId, label: "PDFs",          icon: <FileOutput size={14} />, count: stats.pdfs },
    { id: "suppliers"  as TabId, label: "Fournisseurs",  icon: <Building2 size={14} />,  count: allTsl.length },
    { id: "emails"     as TabId, label: "Emails",        icon: <Mail size={14} />,       count: emailsResponse?.total ?? 0 },
    { id: "datasheets" as TabId, label: "Fiches reçues", icon: <Inbox size={14} />,      count: datasheetData?.total ?? 0 },
    { id: "comparison" as TabId, label: "Comparaison", icon: <BarChart3 size={14} />, count: comparisonCount },
  ]

  return (
    <ErrorBoundary>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={() => navigate("/tenders")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-sky-600 transition-colors"
            title="Retour"
          >
            <ArrowLeft size={14} /> Retour au tenders
          </button>  
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshingAll}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:bg-white/80"
            title="Actualiser toutes les données du tender"
          >
            <RefreshCw size={13} className={isRefreshingAll ? "animate-spin text-sky-500" : ""} />
            Actualiser
          </button>
        </div>

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
                  {tab.count !== null && tab.count !== undefined && (
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

        {/* Tab content */}
        <ErrorBoundary>
          {activeTab === "metadata" && (
            <TabMetadata tender={tender} tenderId={tenderId} stats={stats} />
          )}
          {activeTab === "documents" && (
            loadingDocs ? <TabLoading /> : <TabDocuments documents={documents} tenderId={tenderId}/>
          )}
          {activeTab === "products" && (
            loadingProducts ? <TabLoading /> : <TabProducts products={products} tenderId={tenderId} />
          )}
          {activeTab === "pdfs" && (
            loadingPdfs ? <TabLoading /> : <TabPdfs pdfs={pdfs} tenderId={tenderId} />
          )}
          {activeTab === "suppliers" && (
            <TabSuppliers supplierLots={allTsl} tenderId={tenderId} />
          )}
          {activeTab === "emails" && (
            loadingEmails ? <TabLoading /> : <TabEmails emailsResponse={emailsResponse} tenderId={tenderId} />
          )}
          {activeTab === "datasheets" && (
            loadingDatasheets ? <TabLoading /> : <TabDatasheets datasheetData={datasheetData} tenderId={tenderId} />
          )}
          {activeTab === "comparison" && (
            loadingComparison ? <TabLoading /> : <TabComparison tenderId={tenderId} />
          )}
        </ErrorBoundary>
      </motion.div>
    </ErrorBoundary>
  )
}

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Chargement...</p>
      </div>
    </div>
  )
}
