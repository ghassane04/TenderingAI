import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import {
  FileText, Building2, Layers,
  TrendingUp, ArrowRight,
  Sparkles, Calendar,
  Activity, PieChart as PieChartIcon, Plus,
  Bell as BellIcon, FileWarning, Clock3, MailWarning
} from "lucide-react"
import {
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from "recharts"
import { useNavigate } from "react-router-dom"
import { tendersApi } from "../../api/tenders"
import { suppliersApi } from "../../api/suppliers"
import { technicalLotsApi } from "../../api/technical-lots"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import StatusBadge from "../../components/ui/StatusBadge"
import { useTenderAlerts } from "../../hooks/useTenderAlerts"

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

const CUSTOM_TOOLTIP = {
  contentStyle: {
    backgroundColor: "#1e293b",
    border: "none",
    borderRadius: "10px",
    color: "#f1f5f9",
    fontSize: "12px",
    padding: "8px 12px",
  },
  itemStyle: {
    color: "#f1f5f9",
  },
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: tendersData, isLoading: lt } = useQuery({
    queryKey: ["tenders"],
    queryFn: tendersApi.list,
    staleTime: 1000 * 60,
  })

  const { data: suppliersData, isLoading: ls } = useQuery({
    queryKey: ["suppliers"],
    queryFn: suppliersApi.list,
    staleTime: 1000 * 60 * 5,
  })

  const { data: lotsData, isLoading: ll } = useQuery({
    queryKey: ["technical-lots"],
    queryFn: technicalLotsApi.list,
    staleTime: 1000 * 60 * 10,
  })

  const isLoading = lt || ls || ll

  const tenders   = tendersData?.tenders ?? []
  const { alerts, scannedCount } = useTenderAlerts()

  const ALERT_STYLE = {
    ready_not_sent:     { icon: <FileWarning size={14} />, bg: "from-amber-50 to-orange-50", border: "border-amber-200", text: "text-amber-700" },
    stale_no_response:  { icon: <Clock3 size={14} />,      bg: "from-sky-50 to-blue-50",     border: "border-sky-200",   text: "text-sky-700" },
    send_error:         { icon: <MailWarning size={14} />, bg: "from-rose-50 to-red-50",     border: "border-rose-200",  text: "text-rose-700" },
  }

  // Computed stats
  const statusCounts = tenders.reduce<Record<string, number>>((acc, t) => {
    const k = t.status_name ?? "Inconnu"
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name:
      name === "Metadonnées extraites" ? "Créé"
      : name === "Extraction des exigences en cours" ? "En cours"
      : name === "Extraction des exigences terminée" ? "Terminé"
      : name === "Erreur" ? "Erreur"
      : name,
    value,
  }))

  const termines  = statusCounts["Extraction des exigences terminée"] ?? 0
  const en_cours  = statusCounts["Extraction des exigences en cours"] ?? 0
  const en_erreur = statusCounts["Erreur"] ?? 0
  const crees     = statusCounts["Metadonnées extraites"] ?? 0

  // Tenders par mois (6 derniers mois)
  const monthlyData = (() => {
    const months: Record<string, number> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months[format(d, "MMM yy", { locale: fr })] = 0
    }
    tenders.forEach((t) => {
      if (!t.uploaded_at) return
      const key = format(new Date(t.uploaded_at), "MMM yy", { locale: fr })
      if (key in months) months[key]++
    })
    return Object.entries(months).map(([month, count]) => ({ month, count }))
  })()

  const recentTenders = [...tenders]
    .sort((a, b) =>
      new Date(b.uploaded_at ?? 0).getTime() - new Date(a.uploaded_at ?? 0).getTime()
    )
    .slice(0, 6)

  const statCards = [
    {
      label:   "Appels d'offres",
      value:   tendersData?.total ?? "—",
      icon:    <FileText size={20} />,
      color:   "indigo",
      sub:     `${termines} terminé(s) · ${en_cours} en cours`,
      trend:   termines > 0 ? `+${termines}` : null,
      onClick: () => navigate("/tenders"),
    },
    {
      label:   "Fournisseurs",
      value:   suppliersData?.total ?? "—",
      icon:    <Building2 size={20} />,
      color:   "emerald",
      sub:     "Partenaires actifs",
      trend:   null,
      onClick: () => navigate("/suppliers"),
    },
    {
      label:   "Lots techniques",
      value:   lotsData?.total ?? "—",
      icon:    <Layers size={20} />,
      color:   "violet",
      sub:     "Catégories configurées",
      trend:   null,
      onClick: () => navigate("/settings/lots"),
    },
    {
      label:   "En cours",
      value:   en_cours,
      icon:    <Activity size={20} />,
      color:   "amber",
      sub:     `${en_erreur} erreur(s) · ${crees} créé(s)`,
      trend:   en_cours > 0 ? `${en_cours} actif(s)` : null,
      onClick: () => navigate("/tenders"),
    },
  ]

  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    indigo:  { bg: "bg-indigo-50", text: "text-indigo-500", icon: "text-indigo-500" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-500", icon: "text-emerald-500" },
    violet:  { bg: "bg-violet-50", text: "text-violet-500", icon: "text-violet-500" },
    amber:   { bg: "bg-amber-50", text: "text-amber-500", icon: "text-amber-500" },
  }

  const fmt = (d: string | null) =>
    d ? format(new Date(d), "dd MMM yyyy", { locale: fr }) : "—"

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Chargement du tableau de bord...</p>
      </div>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
          <p className="text-sm text-slate-400 mt-0.5">Vue d'ensemble de l'activité</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Sparkles size={12} className="text-indigo-400" />
            {tenders.length} tenders actifs
          </span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-amber-50/80 to-orange-50/80 border-b border-amber-100 flex items-center gap-2">
            <BellIcon size={15} className="text-amber-500" />
            <p className="text-sm font-semibold text-amber-800">
              {alerts.length} point{alerts.length > 1 ? "s" : ""} d'attention
            </p>
            <span className="text-[10px] text-amber-500/70 ml-auto">
              {scannedCount} tender(s) terminé(s) analysé(s)
            </span>
          </div>
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {alerts.map((a) => {
              const style = ALERT_STYLE[a.type]
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/tenders/${a.tenderId}`)}
                  className="w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-r ${style.bg} border ${style.border} flex items-center justify-center flex-shrink-0 ${style.text}`}>
                    {style.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{a.label}</p>
                    <p className="text-xs text-slate-500 truncate">{a.message}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={s.onClick}
            className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 p-5 cursor-pointer group hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colorMap[s.color].bg} flex items-center justify-center ${colorMap[s.color].text}`}>
                {s.icon}
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">{s.sub}</p>
              <ArrowRight size={12} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Progress bar des statuts ── */}
      {tenders.length > 0 && (
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Activity size={14} className="text-indigo-500" />
            Progression globale
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-slate-100/80 rounded-full overflow-hidden flex">
              {pieData.map((d, i) => (
                <div
                  key={d.name}
                  style={{ width: `${(d.value / tenders.length) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  className="h-full transition-all duration-700"
                  title={`${d.name} : ${d.value}`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-600 flex-shrink-0">
              {tenders.length} total
            </span>
          </div>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-xs text-slate-500">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie statuts */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={15} className="text-indigo-500" />
            <p className="text-sm font-semibold text-slate-700">Répartition des statuts</p>
          </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-slate-300 text-xs">
              Aucun tender
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="45%"
                  innerRadius={48} outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...CUSTOM_TOOLTIP} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "10px", color: "#64748b" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line — tenders par mois */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700">Tenders créés (6 derniers mois)</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip {...CUSTOM_TOOLTIP} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: "#6366f1", r: 4 }}
                activeDot={{ r: 6 }}
                name="Tenders"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Recent tenders ── */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100/60 flex items-center justify-between bg-gradient-to-r from-slate-50/80 to-white/80">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-indigo-500" />
            <p className="text-sm font-semibold text-slate-700">Appels d'offres récents</p>
          </div>
          <button
            onClick={() => navigate("/tenders")}
            className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors font-medium"
          >
            Voir tous <ArrowRight size={12} />
          </button>
        </div>

        {recentTenders.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center">
              <FileText size={24} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">Aucun appel d'offres</p>
            <p className="text-xs text-slate-400">Commencez par créer votre premier tender</p>
            <button onClick={() => navigate("/tenders")} className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 mt-1">
              <Plus size={13} /> Créer un tender
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100/60 bg-gradient-to-r from-slate-50/80 to-white/80">
                  {["Code", "Désignation", "Client", "Statut", "Date"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {recentTenders.map((t, i) => {
                  const statusColors = 
                    t.status_name === "Extraction des exigences terminée" ? "from-emerald-500 to-teal-600" :
                    t.status_name === "Extraction des exigences en cours" ? "from-amber-500 to-orange-600" :
                    t.status_name === "Erreur" ? "from-rose-500 to-red-600" :
                    "from-indigo-500 to-blue-600"
                  
                  return (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/tenders/${t.id}`)}
                      className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3">
                        {t.code ? (
                          <span className={`font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-gradient-to-r ${statusColors}`}>
                            {t.code}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-slate-800 font-medium truncate text-sm group-hover:text-indigo-600 transition-colors">
                          {t.designation || `Tender #${t.id}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[120px]">
                        {t.nom_client || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={t.status_name} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar size={10} className="text-slate-400" />
                          {fmt(t.uploaded_at)}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
