import React, { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Bell, Search, User, ShieldCheck, LogOut, X, FileText, Building2, Layers, ArrowRight, Loader2 } from "lucide-react"
import { useAuthStore } from "../../store/authStore"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { authApi } from "../../api/auth"
import toast from "react-hot-toast"
import { useQuery } from "@tanstack/react-query"
import { tendersApi } from "../../api/tenders"
import { suppliersApi } from "../../api/suppliers"
import { technicalLotsApi } from "../../api/technical-lots"
import { SUPPLIERS_KEY } from "../../hooks/useSuppliers"
import { LOTS_KEY } from "../../hooks/useTechnicalLots"
import { TENDERS_KEY } from "../../hooks/useTenders"
import { getNewlyChangedTenders, markTendersSeen } from "../../lib/seenTracker"
import { CheckCircle2, AlertCircle } from "lucide-react"

interface HeaderProps {
  title: string
  subtitle?: string
}

type SearchResult = {
  id: number
  title: string
  subtitle: string
  type: "tender" | "supplier" | "lot"
  icon: React.ReactNode
  path: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isAdmin = user?.roles?.includes("ROLE_ADMIN")

  // Requêtes pour la recherche - toujours actives pour que les données soient disponibles
  const { data: tendersData, isLoading: loadingTenders } = useQuery({
    queryKey: TENDERS_KEY,
    queryFn: tendersApi.list,
    staleTime: 1000 * 60 * 5,
  })


  const { data: suppliersData, isLoading: loadingSuppliers } = useQuery({
    queryKey: SUPPLIERS_KEY,
    queryFn: suppliersApi.list,
    staleTime: 1000 * 60 * 5,
  })

  const { data: lotsData, isLoading: loadingLots } = useQuery({
    queryKey: LOTS_KEY,
    queryFn: technicalLotsApi.list,
    staleTime: 1000 * 60 * 5,
  })

  // Memoize les données pour éviter de recalculer à chaque rendu
  const tenders = useMemo(() => tendersData?.tenders ?? [], [tendersData])
  const suppliers = useMemo(() => suppliersData?.suppliers ?? [], [suppliersData])
  const lots = useMemo(() => lotsData?.lots ?? [], [lotsData])
  const changedTenders = useMemo(
    () => getNewlyChangedTenders(tenders.map((t) => ({ id: t.id, status_name: t.status_name }))),
    [tenders]
  )
  const isLoading = loadingTenders || loadingSuppliers || loadingLots

  const [isAlertsOpen, setIsAlertsOpen] = useState(false)
  const alertsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setIsAlertsOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
        setSearchQuery("")
        setSearchResults([])
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false)
        setIsSearchOpen(false)
        setSearchQuery("")
        setSearchResults([])
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  // Focus sur l'input quand la recherche s'ouvre
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isSearchOpen])

  const handleAlertClick = (tenderId: number) => {
    markTendersSeen(tenders.filter((t) => t.id === tenderId).map((t) => ({ id: t.id, status_name: t.status_name })))
    setIsAlertsOpen(false)
    navigate(`/tenders/${tenderId}`)
  }

  const handleMarkAllSeen = () => {
    markTendersSeen(changedTenders)
    setIsAlertsOpen(false)
  }
  // Fonction de recherche - utilise les données memoized
  const performSearch = useCallback((query: string) => {
    setSearchQuery(query)

    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const q = query.toLowerCase().trim()
    const results: SearchResult[] = []

    // Recherche dans les tenders
    tenders.forEach((tender) => {
      const codeMatch = tender.code?.toLowerCase().includes(q)
      const designationMatch = tender.designation?.toLowerCase().includes(q)
      const clientMatch = tender.nom_client?.toLowerCase().includes(q)
      
      if (codeMatch || designationMatch || clientMatch) {
        results.push({
          id: tender.id,
          title: tender.designation || `Tender #${tender.id}`,
          subtitle: tender.code ? `${tender.code} · ${tender.nom_client || "Sans client"}` : tender.nom_client || "Sans client",
          type: "tender",
          icon: <FileText size={14} className="text-indigo-500" />,
          path: `/tenders/${tender.id}`,
        })
      }
    })

    // Recherche dans les fournisseurs
    suppliers.forEach((supplier) => {
      const nameMatch = supplier.company_name?.toLowerCase().includes(q)
      const emailMatch = supplier.email?.toLowerCase().includes(q)
      const descMatch = supplier.description?.toLowerCase().includes(q)
      
      if (nameMatch || emailMatch || descMatch) {
        results.push({
          id: supplier.id,
          title: supplier.company_name,
          subtitle: supplier.email || "Aucun email",
          type: "supplier",
          icon: <Building2 size={14} className="text-emerald-500" />,
          path: `/suppliers/${supplier.id}`,
        })
      }
    })

    // Recherche dans les lots techniques
    lots.forEach((lot) => {
      const nameMatch = lot.name?.toLowerCase().includes(q)
      const descMatch = lot.description?.toLowerCase().includes(q)
      
      if (nameMatch || descMatch) {
        results.push({
          id: lot.id,
          title: lot.name,
          subtitle: lot.description || "Aucune description",
          type: "lot",
          icon: <Layers size={14} className="text-violet-500" />,
          path: `/settings/lots/${lot.id}`,
        })
      }
    })

    // Limiter les résultats à 10
    setSearchResults(results.slice(0, 10))
    setIsSearching(false)
  }, [tenders, suppliers, lots])

  // Debounce la recherche pour éviter trop de recalculs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && searchQuery.length >= 2) {
        performSearch(searchQuery)
      } else {
        setSearchResults([])
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleResultClick = (result: SearchResult) => {
    setIsSearchOpen(false)
    setSearchQuery("")
    setSearchResults([])
    navigate(result.path)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setIsSearching(false)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const toggleSearch = () => {
    if (isSearchOpen) {
      setIsSearchOpen(false)
      setSearchQuery("")
      setSearchResults([])
      setIsSearching(false)
    } else {
      setIsSearchOpen(true)
    }
  }

  const currentUserId = user?.user_id
  const userInitials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U"

  const handleLogout = async () => {
    setIsProfileOpen(false)
    try { await authApi.logout() } catch { /* ignore */ }
    logout()
    navigate("/login")
    toast.success("Déconnexion réussie")
  }

  // Fonction pour obtenir le label du type
  const getTypeLabel = (type: string) => {
    switch(type) {
      case "tender": return "AO"
      case "supplier": return "Fournisseur"
      case "lot": return "Lot"
      default: return ""
    }
  }

  // Nombre total de résultats
  const totalResults = searchResults.length

  return (
    <header className="h-16 border-b border-white/60 bg-gradient-to-r from-white/80 via-sky-50/40 to-white/80 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 shadow-[0_1px_20px_rgba(148,197,255,0.08)]">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-slate-800 tracking-tight truncate max-w-[45vw] sm:max-w-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Recherche */}
        <div ref={searchRef} className="relative flex items-center">
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden relative"
              >
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Rechercher un AO, fournisseur, lot..."
                    className="w-[320px] pl-9 pr-9 py-2 rounded-xl border border-white/80 bg-white/90 backdrop-blur-md text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dropdown de résultats — sorti du conteneur overflow-hidden, mais toujours
              dans searchRef pour que le click-outside continue de le fermer correctement */}
          <AnimatePresence>
            {isSearchOpen && searchQuery.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full left-0 mt-2 w-[320px] bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/70 overflow-hidden max-h-80 overflow-y-auto z-20"
              >
                {isLoading && searchQuery.length >= 2 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-indigo-500" />
                    <span className="ml-2 text-sm text-slate-500">Chargement...</span>
                  </div>
                ) : isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Search size={20} className="text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Aucun résultat trouvé</p>
                    <p className="text-xs text-slate-400 mt-1">Essayez avec d'autres mots-clés</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100/60 flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {totalResults} résultat{totalResults > 1 ? 's' : ''}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {tenders.length} AO · {suppliers.length} fournisseurs · {lots.length} lots
                      </span>
                    </div>

                    {searchResults.map((result, index) => (
                      <motion.button
                        key={`${result.type}-${result.id}`}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/60 transition-colors text-left border-b border-slate-50 last:border-b-0 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                          {result.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {result.title}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300 group-hover:text-indigo-500 transition-colors">
                          <span className="text-[10px] font-medium uppercase tracking-wider bg-slate-100/80 px-2 py-0.5 rounded-md hidden sm:inline">
                            {getTypeLabel(result.type)}
                          </span>
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </motion.button>
                    ))}

                    <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100/60 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{totalResults} résultat{totalResults > 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/80 rounded text-[9px] font-mono border border-slate-200">ESC</kbd>
                        <span>pour fermer</span>
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={toggleSearch}
            title="Rechercher"
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
              isSearchOpen ? "ml-2 border-indigo-200 text-indigo-500 bg-indigo-50/80" : "border-white/80 bg-white/40 text-slate-400 hover:text-indigo-500 hover:border-indigo-200"
            }`}
          >
            <Search size={16} />
          </button>
        </div>

        {/* Notifications */}
        <div ref={alertsRef} className="relative flex-shrink-0">
          <button
            onClick={() => setIsAlertsOpen((o) => !o)}
            className="w-9 h-9 rounded-xl border border-white/80 bg-white/40 flex items-center justify-center text-slate-400 hover:text-sky-500 hover:border-sky-200 transition-all relative"
          >
            <Bell size={16} />
            {changedTenders.length > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white">
                {changedTenders.length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isAlertsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/70 overflow-hidden z-20"
              >
                <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100/60 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600">Notifications</p>
                  {changedTenders.length > 0 && (
                    <button onClick={handleMarkAllSeen} className="text-[10px] text-sky-600 hover:text-sky-700 font-medium">
                      Tout marquer lu
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {changedTenders.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-xs text-slate-400">Rien de nouveau</p>
                    </div>
                  ) : (
                    changedTenders.map((t) => {
                      const isError = t.status_name === "Erreur"
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleAlertClick(t.id)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-b-0"
                        >
                          {isError ? (
                            <AlertCircle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-800 truncate">
                              {tenders.find((x) => x.id === t.id)?.designation || `Tender #${t.id}`}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {isError ? "Extraction en erreur" : "Extraction terminée"}
                            </p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="w-px h-6 bg-slate-200/70 flex-shrink-0" />

        {/* Profil */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setIsProfileOpen((o) => !o)}
            className="flex items-center gap-3 hover:bg-white/50 rounded-xl px-2 sm:px-3 py-1.5 transition-colors"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-slate-800 truncate max-w-[140px]">{user?.full_name || "Utilisateur"}</p>
              <p className="text-xs text-slate-500">{isAdmin ? "Administrateur" : "Acheteur"}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-300 to-amber-200 border border-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-slate-700 text-sm font-semibold">{userInitials}</span>
            </div>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-64 bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/70 overflow-hidden"
              >
                <div className="px-4 py-4 bg-gradient-to-r from-indigo-50/70 to-transparent border-b border-white/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-300 to-amber-200 border border-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-slate-700 text-sm font-semibold">{userInitials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {user?.full_name || "Utilisateur"}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isAdmin && <ShieldCheck size={12} className="text-indigo-500" />}
                        <span className="text-xs text-slate-500">
                          {isAdmin ? "Administrateur" : "Acheteur"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-2 py-2">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false)
                      if (currentUserId) navigate(`/settings/users/${currentUserId}`)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-white/60 transition-colors"
                  >
                    <User size={16} />
                    <span>Mon profil</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
