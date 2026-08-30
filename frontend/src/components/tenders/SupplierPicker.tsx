// components/tenders/SupplierPicker.tsx
import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Building2, Mail, FileText } from "lucide-react"

interface Supplier {
  id: number
  company_name: string
  email?: string | null
  description?: string | null
}

interface Props {
  suppliers: Supplier[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SupplierPicker({ 
  suppliers, 
  value, 
  onChange, 
  placeholder = "— Sélectionner un fournisseur —" 
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selected = suppliers.find((s) => String(s.id) === value)

  const filteredSuppliers = suppliers.filter((s) =>
    s.company_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (supplierId: string) => {
    onChange(supplierId)
    setIsOpen(false)
    setSearch("")
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* Bouton de sélection */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none shadow-sm hover:border-slate-300"
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          <Building2 size={16} className={selected ? "text-sky-500" : "text-slate-400"} />
          <span className={selected ? "text-slate-700 font-medium" : "text-slate-400"}>
            {selected ? selected.company_name : placeholder}
          </span>
          {selected?.email && (
            <span className="text-[10px] text-slate-400 truncate max-w-[100px] hidden sm:inline">
              {selected.email}
            </span>
          )}
        </div>
        <ChevronDown 
          size={16} 
          className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`} 
        />
      </button>

      {/* Dropdown en relative (pousse le contenu) */}
      {isOpen && (
        <div className="w-full mt-1 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl shadow-slate-300/30 overflow-hidden">
          {/* Barre de recherche */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un fournisseur..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none"
                onClick={(e) => e.stopPropagation()}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Liste des fournisseurs */}
          <div className="max-h-60 overflow-y-auto overscroll-contain">
            {filteredSuppliers.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">
                Aucun fournisseur trouvé
              </div>
            ) : (
              filteredSuppliers.map((s) => {
                const isSelected = String(s.id) === value
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelect(String(s.id))}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-sm hover:bg-slate-50/80 transition-colors text-left ${
                      isSelected ? "bg-sky-50/80" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-100/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 size={14} className="text-sky-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isSelected ? 'text-sky-700' : 'text-slate-700'}`}>
                        {s.company_name}
                      </p>
                      {s.email && (
                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                          <Mail size={9} /> {s.email}
                        </p>
                      )}
                      {s.description && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 line-clamp-2">
                          <FileText size={9} className="inline mr-1" />
                          {s.description}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="text-sky-500 flex-shrink-0 mt-1" />}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[10px] text-slate-400">
              {filteredSuppliers.length} fournisseur{filteredSuppliers.length > 1 ? 's' : ''} disponible{filteredSuppliers.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
