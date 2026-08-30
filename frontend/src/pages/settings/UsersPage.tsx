import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Plus, Users, ShieldCheck, UserCircle,
  Loader2, Check, RefreshCw, Search,
  Mail, User as UserIcon, Briefcase, Crown, ChevronRight,
} from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useUsers, useCreateUser } from "../../hooks/useUsers"
import { useAuthStore } from "../../store/authStore"
import Modal from "../../components/ui/Modal"
import EmptyState from "../../components/ui/EmptyState"

const ALL_ROLES = [
  { value: "ROLE_ADMIN",    label: "Administrateur", desc: "Accès complet à toute la plateforme", icon: Crown },
  { value: "ROLE_ACHETEUR", label: "Acheteur",       desc: "Gère les AO, fournisseurs et comparatifs", icon: Briefcase },
]

const roleStyle: Record<string, { bg: string; text: string; border: string; light: string }> = {
  ROLE_ADMIN: {
    bg: "bg-gradient-to-r from-sky-500 to-blue-600",
    text: "text-sky-700",
    border: "border-sky-200",
    light: "from-sky-50 to-blue-50"
  },
  ROLE_ACHETEUR: {
    bg: "bg-gradient-to-r from-emerald-500 to-teal-600",
    text: "text-emerald-700",
    border: "border-emerald-200",
    light: "from-emerald-50 to-teal-50"
  },
}

const DEFAULT_ROLE = "ROLE_ACHETEUR"

const roleLabel: Record<string, string> = {
  ROLE_ADMIN: "Admin",
  ROLE_ACHETEUR: "Acheteur",
}

const roleAvatarBg: Record<string, string> = {
  ROLE_ADMIN: "bg-gradient-to-r from-sky-500 to-blue-600",
  ROLE_ACHETEUR: "bg-gradient-to-r from-emerald-500 to-teal-600",
}

interface CreateFormData {
  last_name: string; first_name: string; email: string
  username: string; password: string; role: string
}

export default function UsersPage() {
  const navigate = useNavigate()
  const { user: me } = useAuthStore()
  const { data, isLoading, refetch, isFetching } = useUsers()
  const { mutate: create, isPending: creating } = useCreateUser()

  const [createOpen, setCreateOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string>("Tous")
  const [search, setSearch] = useState("")

  const createForm = useForm<CreateFormData>({ defaultValues: { role: DEFAULT_ROLE } })

  const users = useMemo(() => data?.users ?? [], [data])
  const selectedRole = useWatch({ control: createForm.control, name: "role" })

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.roles.includes("ROLE_ADMIN")).length,
    acheteurs: users.filter(u => u.roles.includes("ROLE_ACHETEUR")).length,
  }), [users])

  const filteredUsers = useMemo(() => {
    let list = roleFilter === "Tous" ? users : users.filter((u) => u.roles.includes(roleFilter))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    }
    return list
  }, [users, roleFilter, search])

  const onCreateSubmit = (d: CreateFormData) => {
    create(
      { last_name: d.last_name, first_name: d.first_name, email: d.email,
        username: d.username, password: d.password, roles: [d.role] },
      { onSuccess: () => { setCreateOpen(false); createForm.reset() } }
    )
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Utilisateurs</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Gestion des comptes ayant accès à la plateforme d'AO
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary text-xs px-3 py-2">
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setCreateOpen(true)} className="btn-primary text-xs">
              <Plus size={15} /> Nouvel utilisateur
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            icon={Users}
            label="Total"
            value={stats.total}
            gradient="from-sky-50 to-blue-50"
            border="border-sky-200"
            iconColor="text-sky-500"
          />
          <StatCard
            icon={Crown}
            label="Administrateurs"
            value={stats.admins}
            gradient="from-indigo-50 to-purple-50"
            border="border-indigo-200"
            iconColor="text-indigo-500"
          />
          <StatCard
            icon={Briefcase}
            label="Acheteurs"
            value={stats.acheteurs}
            gradient="from-emerald-50 to-teal-50"
            border="border-emerald-200"
            iconColor="text-emerald-500"
          />
        </div>

        {/* Filter + search bar */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un nom, identifiant, email..."
              className="w-full pl-8 pr-4 py-2.5 text-sm bg-white/80 backdrop-blur-sm border-2 border-slate-200/60 rounded-xl focus:border-sky-400 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="text-xs font-medium">✕</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {["Tous", "ROLE_ADMIN", "ROLE_ACHETEUR"].map((r) => {
              const isActive = roleFilter === r
              const style = r === "Tous" ? roleStyle.ROLE_ADMIN : roleStyle[r as keyof typeof roleStyle]
              return (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? `bg-gradient-to-r ${style.bg} text-white shadow-md`
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {r === "Tous" ? "Tous" : roleLabel[r] ?? r}
                </button>
              )
            })}
          </div>
        </div>

        {/* Table — consultation uniquement, clic sur une ligne = détail */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-sky-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState icon={Users} title="Aucun utilisateur trouvé" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white/80">
                    {["Utilisateur", "Identifiant", "Email", "Rôles", ""].map((h) => (
                      <th key={h || "chevron"} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((u, i) => {
                    const isMe = u.id === me?.user_id
                    const primaryRole = u.roles[0] || DEFAULT_ROLE
                    return (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        onClick={() => navigate(`/settings/users/${u.id}`)}
                        className={`group cursor-pointer transition-colors ${isMe ? "bg-sky-50/30" : "hover:bg-slate-50/80"}`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${roleAvatarBg[primaryRole] || roleAvatarBg[DEFAULT_ROLE]} shadow-sm`}>
                              {u.first_name?.charAt(0)}{u.last_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 group-hover:text-sky-600 transition-colors">
                                {u.first_name} {u.last_name}
                                {isMe && <span className="ml-2 text-[10px] text-sky-500 font-medium">(vous)</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs text-slate-600 bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200/60">
                            {u.username}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail size={11} className="text-slate-400" />
                            {u.email}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {u.roles.map((r) => {
                              const style2 = roleStyle[r] || roleStyle[DEFAULT_ROLE]
                              return (
                                <span key={r} className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${style2.text} ${style2.border} bg-gradient-to-r ${style2.light}`}>
                                  {roleLabel[r] || "Acheteur"}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all inline-block" />
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

      {/* Create modal — reste ici, la création n'a pas de "détail" préexistant à consulter */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); createForm.reset() }}
        title="Nouvel utilisateur"
        subtitle="Le compte sera actif immédiatement"
        size="lg"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserIcon size={16} className="text-sky-500" />
                Prénom
                <span className="text-red-500 text-xs font-normal">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon size={16} className="text-sky-400" />
                </div>
                <input
                  {...createForm.register("first_name", { required: true })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-sky-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none shadow-sm"
                  placeholder="Yassine"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserIcon size={16} className="text-indigo-500" />
                Nom
                <span className="text-red-500 text-xs font-normal">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon size={16} className="text-indigo-400" />
                </div>
                <input
                  {...createForm.register("last_name", { required: true })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all outline-none shadow-sm"
                  placeholder="Benali"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Mail size={16} className="text-emerald-500" />
              Email
              <span className="text-red-500 text-xs font-normal">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-emerald-400" />
              </div>
              <input
                {...createForm.register("email", { required: true })}
                type="email"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none shadow-sm"
                placeholder="yassine.benali@entreprise.ma"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserCircle size={16} className="text-amber-500" />
                Identifiant
                <span className="text-red-500 text-xs font-normal">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircle size={16} className="text-amber-400" />
                </div>
                <input
                  {...createForm.register("username", { required: true })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-amber-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:bg-white transition-all outline-none shadow-sm font-mono"
                  placeholder="y.benali"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ShieldCheck size={16} className="text-purple-500" />
                Mot de passe
                <span className="text-red-500 text-xs font-normal">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheck size={16} className="text-purple-400" />
                </div>
                <input
                  {...createForm.register("password", { required: true, minLength: 8 })}
                  type="password"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:bg-white transition-all outline-none shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Crown size={16} className="text-rose-500" />
              Rôle initial
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_ROLES.map((r) => {
                const selected = selectedRole === r.value
                const style = roleStyle[r.value] || roleStyle[DEFAULT_ROLE]
                const Icon = r.icon
                return (
                  <label key={r.value} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                    selected
                      ? `bg-gradient-to-r ${style.light} ${style.border} border-current shadow-sm`
                      : "border-slate-200 hover:border-slate-300 bg-white/50"
                  }`}>
                    <input type="radio" value={r.value} {...createForm.register("role")} className="hidden" />
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selected ? `bg-gradient-to-r ${style.bg} text-white` : "bg-slate-100 text-slate-400"}`}>
                      <Icon size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{r.label}</p>
                      <p className="text-[9px] text-slate-400">{r.desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? (
                <><Loader2 size={14} className="animate-spin" /> Création...</>
              ) : (
                <><Check size={14} /> Créer le compte</>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function StatCard({ icon: Icon, label, value, gradient, border, iconColor }: {
  icon: React.ElementType; label: string; value: number
  gradient: string; border: string; iconColor: string
}) {
  return (
    <div className={`bg-gradient-to-r ${gradient} backdrop-blur-xl border ${border} rounded-2xl px-4 py-3 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shadow-sm`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
    </div>
  )
}
