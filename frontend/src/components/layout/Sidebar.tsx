import React, { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, FileText, Building2, GitCompare,
  Users, Layers, ChevronRight,
  LogOut, ShieldCheck,
} from "lucide-react"
import { useAuthStore } from "../../store/authStore"
import { authApi } from "../../api/auth"
import toast from "react-hot-toast"
import { CompanyLogo } from "../ui/CompanyLogo"

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  adminOnly?: boolean
  badge?: string
}

const mainNav: NavItem[] = [
  { label: "Tableau de bord", to: "/", icon: <LayoutDashboard size={18} /> },
  { label: "Appels d'offres", to: "/tenders", icon: <FileText size={18} /> },
  { label: "Fournisseurs", to: "/suppliers", icon: <Building2 size={18} /> },
]

const settingsNav: NavItem[] = [
  { label: "Utilisateurs", to: "/settings/users", icon: <Users size={18} />, adminOnly: true },
  { label: "Lots techniques", to: "/settings/lots", icon: <Layers size={18} />, adminOnly: true },
]

interface OrbProps {
  size: number
  top?: string
  left?: string
  right?: string
  bottom?: string
  colors: string
  duration: number
  delay?: number
  blur?: number
}

function FloatingOrb({ size, top, left, right, bottom, colors, duration, delay = 0, blur = 0 }: OrbProps) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        top,
        left,
        right,
        bottom,
        background: colors,
        filter: blur ? `blur(${blur}px)` : undefined,
        boxShadow:
          "inset -6px -8px 16px rgba(255,255,255,0.5), inset 6px 10px 20px rgba(255,255,255,0.35), 0 12px 30px rgba(56,189,248,0.15)",
      }}
      animate={{ y: [0, -18, 0, 14, 0], x: [0, 10, 0, -8, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  )
}

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.roles?.includes("ROLE_ADMIN")
  const [loggingOut, setLoggingOut] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await authApi.logout()
    } catch {
      // La session locale doit être fermée même si le serveur est indisponible.
    } finally {
      logout()
      navigate("/login")
      toast.success("Déconnexion réussie")
      setLoggingOut(false)
    }
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 264 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="sticky top-0 h-screen flex flex-col relative flex-shrink-0 overflow-hidden bg-gradient-to-b from-[#eef6ff] via-white to-[#fff8f0] border-r border-slate-200/70 shadow-[0_0_40px_rgba(148,197,255,0.15)] z-30 select-none"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingOrb
          size={220}
          top="-60px"
          left="-70px"
          colors="radial-gradient(circle at 35% 30%, #ffffff, #bae6fd 35%, #38bdf8 75%)"
          duration={10}
          blur={30}
        />
        <FloatingOrb
          size={200}
          bottom="-50px"
          right="-60px"
          colors="radial-gradient(circle at 35% 30%, #fff4e6, #fcd9b8 40%, #fb923c 80%)"
          duration={12}
          delay={1.5}
          blur={30}
        />
        <FloatingOrb
          size={46}
          top="120px"
          right="18px"
          colors="radial-gradient(circle at 32% 28%, #ffffff, #cffafe 35%, #67e8f9 80%)"
          duration={7}
          delay={0.4}
        />
        <FloatingOrb
          size={30}
          bottom="180px"
          left="26px"
          colors="radial-gradient(circle at 32% 28%, #fff7ed, #fed7aa 45%, #fb923c 90%)"
          duration={8.5}
          delay={2}
        />
      </div>

      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
        className={`relative z-10 flex items-center gap-3 px-4 py-5 border-b border-slate-200/70 hover:bg-white/50 transition-all text-left ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <span className="flex-shrink-0 p-1.5 rounded-xl bg-white/60 border border-white/80 backdrop-blur-md shadow-sm">
          <CompanyLogo size="sm" />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-slate-800 font-semibold text-sm tracking-tight whitespace-nowrap">
              Tendering IA
            </p>
            <p className="text-slate-500 text-[11px] leading-snug truncate">
              Extraction & comparaison d'AO
            </p>
          </div>
        )}
      </button>

      <nav className="relative z-10 flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {!collapsed && (
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
            Navigation
          </p>
        )}
        {mainNav.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} />
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1">
              {!collapsed && (
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3">
                  Administration
                </p>
              )}
            </div>
            {settingsNav.map((item) => (
              <SidebarLink key={item.to} item={item} collapsed={collapsed} />
            ))}
          </>
        )}
      </nav>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-10 px-3 pb-3 overflow-hidden"
          >
            <div className="rounded-xl bg-white/60 border border-white/80 backdrop-blur-md px-3 py-2.5 flex items-start gap-2.5 shadow-sm">
              <GitCompare size={15} className="text-sky-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                Extraction automatique des exigences AO et comparaison des propositions.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 px-3 py-4 border-t border-slate-200/70 bg-white/30 backdrop-blur-md">
        <div
          className={`flex items-center gap-3 rounded-xl bg-white/60 border border-white/80 backdrop-blur-md transition-all ${
            collapsed ? "justify-center py-2" : "px-3 py-2.5 shadow-sm"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-200 to-amber-100 border border-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-slate-700 text-xs font-bold">
              {user?.full_name?.charAt(0).toUpperCase()}
            </span>
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 text-xs font-medium truncate">
                  {user?.full_name}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {isAdmin && <ShieldCheck size={11} className="text-sky-500 flex-shrink-0" />}
                  <p className="text-slate-500 text-[10px] truncate">
                    {isAdmin ? "Administrateur" : "Acheteur"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all p-1.5 rounded-lg border border-transparent hover:border-rose-200 disabled:opacity-50"
                title="Déconnexion"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  )
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
          collapsed ? "justify-center" : ""
        } ${
          isActive
            ? "bg-white/70 text-slate-800 border border-sky-200 shadow-sm"
            : "text-slate-500 hover:text-slate-800 hover:bg-white/40 border border-transparent"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`transition-colors duration-200 ${
              isActive ? "text-sky-500" : "text-slate-400 group-hover:text-slate-600"
            }`}
          >
            {item.icon}
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold bg-sky-500 text-white px-1.5 py-0.5 rounded-full border border-sky-300 shadow-sm">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <ChevronRight size={13} className="text-sky-400 flex-shrink-0" />
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  )
}
