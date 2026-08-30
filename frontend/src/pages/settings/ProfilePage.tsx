import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useForm, useWatch } from "react-hook-form"
import {
  User, Mail, Calendar, Building2, Loader2, History,
  Crown, Briefcase, Award, Clock, RefreshCw, ArrowLeft,
  Edit2, Trash2, Check, X, UserCircle, ShieldCheck,
} from "lucide-react"
import { useUserDetail, useUpdateUser, useDeleteUser } from "../../hooks/useUsers"
import { useAuthStore } from "../../store/authStore"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"

const ALL_ROLES = [
  { value: "ROLE_ADMIN",    label: "Administrateur", desc: "Accès complet à toute la plateforme", icon: Crown },
  { value: "ROLE_ACHETEUR", label: "Acheteur",       desc: "Gère les AO, fournisseurs et comparatifs", icon: Briefcase },
]

const roleStyle: Record<string, { bg: string; text: string; border: string; light: string; icon: any }> = {
  ROLE_ADMIN: {
    bg: "bg-gradient-to-r from-sky-500 to-blue-600",
    text: "text-sky-700",
    border: "border-sky-200",
    light: "from-sky-50 to-blue-50",
    icon: Crown
  },
  ROLE_ACHETEUR: {
    bg: "bg-gradient-to-r from-emerald-500 to-teal-600",
    text: "text-emerald-700",
    border: "border-emerald-200",
    light: "from-emerald-50 to-teal-50",
    icon: Briefcase
  },
}

const DEFAULT_ROLE = "ROLE_ACHETEUR"

const roleLabel: Record<string, string> = {
  ROLE_ADMIN: "Administrateur",
  ROLE_ACHETEUR: "Acheteur",
}

const roleColors: Record<string, string> = {
  ROLE_ADMIN: "from-sky-600 to-blue-700",
  ROLE_ACHETEUR: "from-emerald-600 to-teal-700",
}

interface EditFormData {
  first_name: string; last_name: string; email: string
  password: string; roles: string[]
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const isAdmin = currentUser?.roles?.includes("ROLE_ADMIN")
  const isViewingOwnProfile = currentUser?.user_id === Number(id)

  const { data: profile, isLoading, isFetching, error, refetch } = useUserDetail(Number(id))
  const { mutate: update, isPending: updating } = useUpdateUser()
  const { mutate: remove, isPending: deleting } = useDeleteUser()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const editForm = useForm<EditFormData>()

  const primaryRole = profile?.roles?.[0] || DEFAULT_ROLE
  const style = roleStyle[primaryRole] || roleStyle[DEFAULT_ROLE]
  const Icon = style.icon
  const colorGradient = roleColors[primaryRole] || roleColors[DEFAULT_ROLE]

  const userInitials = profile
    ? `${profile.first_name?.charAt(0) ?? ""}${profile.last_name?.charAt(0) ?? ""}`.toUpperCase()
    : "U"

  const formatDate = (date?: string) =>
    date
      ? new Date(date).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "—"

  const openEdit = () => {
    if (!profile) return
    editForm.reset({
      first_name: profile.first_name, last_name: profile.last_name, email: profile.email,
      password: "", roles: [...profile.roles],
    })
    setEditOpen(true)
  }

  const onEditSubmit = (d: EditFormData) => {
    if (!profile) return
    const payload: any = { first_name: d.first_name, last_name: d.last_name, email: d.email, roles: d.roles }
    if (d.password?.trim()) payload.password = d.password
    update({ id: profile.id, data: payload }, { onSuccess: () => setEditOpen(false) })
  }

  const watchedRoles = useWatch({ control: editForm.control, name: "roles" }) ?? []
  const toggleEditRole = (role: string) => {
    const current = editForm.getValues("roles") ?? []
    editForm.setValue("roles", current.includes(role) ? current.filter((r) => r !== role) : [...current, role])
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-sky-500" />
          <p className="text-sm text-slate-400">Chargement du profil...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <User size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-red-500">Profil non trouvé</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-4"
      >
        {/* Barre d'actions : retour (admin uniquement) + actualiser */}
        <div className="flex items-center justify-between">
          {isAdmin ? (
            <button
              onClick={() => navigate("/settings/users")}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 transition-colors"
            >
              <ArrowLeft size={13} /> Retour à la liste des utilisateurs
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:bg-white/80 transition-all disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin text-sky-500" : "text-slate-400"} />
          </button>
        </div>

        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
          {/* En-tête avec dégradé coloré selon le rôle */}
          <div className={`bg-gradient-to-r ${colorGradient} px-8 py-10 relative overflow-hidden`}>
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full blur-3xl" />

            <div className="flex items-start justify-between gap-4 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border-2 border-white/30 flex-shrink-0 shadow-lg">
                  <span className="text-white text-3xl font-bold">{userInitials}</span>
                </div>
                <div className="text-white">
                  <h1 className="text-2xl font-bold">
                    {profile.first_name} {profile.last_name}
                    {isViewingOwnProfile && (
                      <span className="ml-2 text-sm font-normal text-white/70">(vous)</span>
                    )}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white/70 text-sm">@{profile.username}</span>
                    <span className="w-px h-4 bg-white/30" />
                    <div className="flex items-center gap-1.5">
                      <Icon size={14} className="text-white/80" />
                      <span className="text-sm text-white/80 font-medium">
                        {roleLabel[primaryRole] || "Acheteur"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-white/60">
                      Membre depuis {formatDate(profile.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions admin uniquement */}
              {isAdmin && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={openEdit}
                    className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors hover:scale-105"
                    title="Modifier"
                  >
                    <Edit2 size={15} />
                  </button>
                  {!isViewingOwnProfile && (
                    <button
                      onClick={() => setDeleteOpen(true)}
                      className="w-9 h-9 rounded-lg bg-white/15 hover:bg-red-500/70 flex items-center justify-center text-white transition-colors hover:scale-105"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Informations */}
          <div className="px-8 py-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${style.light} backdrop-blur-sm border ${style.border}`}>
                <div className={`w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0`}>
                  <Mail size={16} className={style.text} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Email</p>
                  <p className="text-sm font-semibold text-slate-800">{profile.email}</p>
                </div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${style.light} backdrop-blur-sm border ${style.border}`}>
                <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                  <User size={16} className={style.text} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Nom d'utilisateur</p>
                  <p className="text-sm font-semibold text-slate-800 font-mono">{profile.username}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${style.light} backdrop-blur-sm border ${style.border}`}>
                <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className={style.text} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Rôle principal</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {roleLabel[primaryRole] || "Acheteur"}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${style.light} backdrop-blur-sm border ${style.border}`}>
                <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className={style.text} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Dernière mise à jour</p>
                  <p className="text-sm font-semibold text-slate-800">{formatDate(profile.updated_at)}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <Award size={14} className="text-amber-500" />
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Rôles attribués</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.roles?.map((role) => {
                  const roleInfo = roleStyle[role] || roleStyle[DEFAULT_ROLE]
                  const RoleIcon = roleInfo.icon
                  const label = roleLabel[role] || "Acheteur"
                  return (
                    <span key={role} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-gradient-to-r ${roleInfo.light} ${roleInfo.border} ${roleInfo.text} shadow-sm`}>
                      <RoleIcon size={11} />
                      {label}
                    </span>
                  )
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100/60">
              <div className="flex items-center gap-4 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  Créé le {formatDate(profile.created_at)}
                </span>
                {profile.updated_at && profile.updated_at !== profile.created_at && (
                  <>
                    <span className="w-px h-3 bg-slate-200" />
                    <span className="flex items-center gap-1">
                      <History size={11} />
                      Mis à jour {formatDate(profile.updated_at)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit modal — admin uniquement */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier l'utilisateur"
        subtitle={`${profile.first_name} ${profile.last_name}`}
        size="lg"
      >
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserCircle size={16} className="text-sky-500" />
                Prénom
              </label>
              <input {...editForm.register("first_name")} className="w-full px-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-sky-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none shadow-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserCircle size={16} className="text-indigo-500" />
                Nom
              </label>
              <input {...editForm.register("last_name")} className="w-full px-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all outline-none shadow-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Mail size={16} className="text-emerald-500" />
              Email
            </label>
            <input {...editForm.register("email")} type="email" className="w-full px-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none shadow-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ShieldCheck size={16} className="text-purple-500" />
              Nouveau mot de passe
              <span className="text-slate-400 text-xs font-normal">(laisser vide pour ne pas changer)</span>
            </label>
            <input {...editForm.register("password")} type="password" className="w-full px-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:bg-white transition-all outline-none shadow-sm" placeholder="••••••••" />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Crown size={16} className="text-rose-500" />
              Rôles
            </label>
            <div className="space-y-2">
              {ALL_ROLES.map((r) => {
                const checked = watchedRoles.includes(r.value)
                const st = roleStyle[r.value] || roleStyle[DEFAULT_ROLE]
                const RIcon = r.icon
                return (
                  <label key={r.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    checked
                      ? `bg-gradient-to-r ${st.light} ${st.border} border-current shadow-sm`
                      : "border-slate-200 hover:border-slate-300 bg-white/50"
                  }`}>
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        checked ? `bg-gradient-to-r ${st.bg} border-transparent` : "border-slate-300"
                      }`}
                      onClick={() => toggleEditRole(r.value)}
                    >
                      {checked && <Check size={12} className="text-white" />}
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${checked ? `bg-gradient-to-r ${st.bg} text-white` : "bg-slate-100 text-slate-400"}`}>
                      <RIcon size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                      <p className="text-[10px] text-slate-400">{r.desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              <X size={14} /> Annuler
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {updating ? (
                <><Loader2 size={14} className="animate-spin" /> Enregistrement...</>
              ) : (
                <><Check size={14} /> Enregistrer</>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Supprimer cet utilisateur ?"
        description={`Le compte de ${profile.first_name} ${profile.last_name} sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        danger
        loading={deleting}
        onConfirm={() => remove(profile.id, { onSuccess: () => navigate("/settings/users") })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
