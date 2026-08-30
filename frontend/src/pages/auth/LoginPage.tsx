import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react"
import toast from "react-hot-toast"
import { authApi } from "../../api/auth"
import type { LoginPayload } from "../../api/auth"
import { useAuthStore } from "../../store/authStore"
import { CompanyLogo } from "../../components/ui/CompanyLogo"

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginPayload>()

  const onSubmit = async (data: LoginPayload) => {
    setLoading(true)
    try {
      const res = await authApi.login(data)
      login(res)
      toast.success(`Bienvenue, ${res.full_name.split(" ")[0]} !`)
      navigate("/")
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Identifiants incorrects"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0f2fe] via-[#f8fafc] to-[#fef3c7]/40 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* 🔮 BOULES 3D ANIMÉES (Même style que les images) */}

      {/* 1. Grande sphère Bleue / Cyan à gauche */}
      <motion.div
        animate={{
          y: [0, -18, 0],
          x: [0, 10, 0],
          scale: [1, 1.04, 1]
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[15%] left-[8%] w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-white via-[#7dd3fc] to-[#0284c7] shadow-[0_20px_50px_rgba(2,132,199,0.25)] border border-white/60 pointer-events-none"
      />

      {/* 2. Petite bille bleu ciel en bas à gauche */}
      <motion.div
        animate={{
          y: [0, 15, 0],
          x: [0, -8, 0]
        }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[18%] left-[12%] w-12 h-12 rounded-full bg-gradient-to-br from-white via-[#bae6fd] to-[#38bdf8] shadow-[0_10px_25px_rgba(56,189,248,0.2)] border border-white/80 pointer-events-none"
      />

      {/* 3. Sphère Ambrée / Pêche en haut à droite */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          x: [0, -12, 0]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[20%] right-[10%] w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-white via-[#fde68a] to-[#f59e0b] shadow-[0_15px_35px_rgba(245,158,11,0.2)] border border-white/70 pointer-events-none"
      />

      {/* 4. Sphère Ambrée douce en bas à droite */}
      <motion.div
        animate={{
          y: [0, 18, 0],
          x: [0, 10, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[12%] right-[14%] w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-white via-[#fed7aa] to-[#f97316] shadow-[0_20px_45px_rgba(249,115,22,0.2)] border border-white/60 pointer-events-none"
      />

      {/* 5. Minuscule bille de cristal flottante au centre haut */}
      <motion.div
        animate={{
          y: [0, -10, 0],
          opacity: [0.6, 1, 0.6]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[8%] right-[38%] w-6 h-6 rounded-full bg-gradient-to-br from-white to-[#93c5fd] shadow-md border border-white/80 pointer-events-none"
      />

      {/* Halos lumineux flous en fond */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#7dd3fc]/30 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-[#fde68a]/30 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* CARTE DE CONNEXION DE STYLE FROSTED GLASS CLAIR */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* En-tête avec logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CompanyLogo size="lg" />
          </div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-slate-900 tracking-tight"
          >
            Tendering IA
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 text-sm mt-1 font-medium"
          >
            Plateforme de gestion des appels d'offres
          </motion.p>
        </div>

        {/* Carte Frosted Glass */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/70 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-white/80 p-8 sm:p-9"
        >
          <h2 className="text-xl font-bold text-slate-900 mb-1">Connexion</h2>
          <p className="text-slate-500 text-sm mb-6">Entrez vos identifiants pour accéder à la plateforme</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Nom d'utilisateur */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={16} />
                </span>
                <input
                  {...register("username", { required: "Champ requis" })}
                  type="text"
                  autoComplete="username"
                  placeholder="ex: jean.dupont"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200/80 bg-white/60 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all shadow-sm"
                />
              </div>
              {errors.username && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mot de passe
                </label>
                <button 
                  type="button"
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  {...register("password", { required: "Champ requis" })}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 rounded-2xl border border-slate-200/80 bg-white/60 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-200 shadow-xl shadow-slate-900/15"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Connexion en cours...
                </span>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          {/* Séparateur */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/60" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white/80 backdrop-blur-md text-[11px] font-medium text-slate-400 rounded-full border border-slate-200/50">
                Accès sécurisé
              </span>
            </div>
          </div>

          {/* Informations supplémentaires */}
          <div className="text-center">
            <p className="text-xs text-slate-400 font-medium">
              Plateforme interne - Réservé aux utilisateurs autorisés
            </p>
          </div>
        </motion.div>

        {/* Pied de page */}
        <p className="text-center text-slate-400 text-xs mt-6 font-medium">
          © 2026 Tendering IA — Tous droits réservés
        </p>
      </motion.div>
    </div>
  )
}
