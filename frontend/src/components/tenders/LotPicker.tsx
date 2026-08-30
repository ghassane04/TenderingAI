// components/tenders/LotPicker.tsx
import { useState, useRef, useEffect } from "react"
import { ChevronDown, Layers, Check } from "lucide-react"

interface LotPickerProps {
  lots: Array<{ id: number; name: string; description?: string | null }>
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function LotPicker({ 
  lots, 
  value, 
  onChange, 
  placeholder = "Sélectionner un lot" 
}: LotPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedLot = lots.find((lot) => String(lot.id) === value)

  const filteredLots = lots.filter((lot) =>
    lot.name.toLowerCase().includes(search.toLowerCase()) ||
    lot.description?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (lotId: string) => {
    onChange(lotId)
    setIsOpen(false)
    setSearch("")
  }

  const handleClear = () => {
    onChange("")
    setIsOpen(false)
    setSearch("")
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* Bouton de sélection */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:bg-white transition-all outline-none shadow-sm hover:border-slate-300"
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          <Layers size={16} className="text-slate-400 flex-shrink-0" />
          <span className={selectedLot ? "text-slate-700 font-medium truncate" : "text-slate-400 truncate"}>
            {selectedLot ? selectedLot.name : placeholder}
          </span>
          {selectedLot?.description && (
            <span className="text-[10px] text-slate-400 truncate max-w-[100px] hidden sm:inline">
              {selectedLot.description}
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
                placeholder="Rechercher un lot..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:border-amber-300 focus:ring-2 focus:ring-amber-200 focus:bg-white transition-all outline-none"
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

          {/* Liste des lots */}
          <div className="max-h-60 overflow-y-auto overscroll-contain">
            {/* Option "Sans lot" */}
            <button
              type="button"
              onClick={handleClear}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50/80 transition-colors text-left ${
                !value ? "bg-amber-50/80 text-amber-600" : "text-slate-600"
              }`}
            >
              <div className="w-5 flex-shrink-0">
                {!value && <Check size={14} className="text-amber-500" />}
              </div>
              <span className="truncate">— Sans lot (administratif) —</span>
            </button>

            {filteredLots.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">
                Aucun lot trouvé
              </div>
            ) : (
              filteredLots.map((lot) => {
                const isSelected = String(lot.id) === value
                return (
                  <button
                    key={lot.id}
                    type="button"
                    onClick={() => handleSelect(String(lot.id))}
                    className={`w-full flex items-start gap-2 px-4 py-2.5 text-sm hover:bg-slate-50/80 transition-colors text-left ${
                      isSelected ? "bg-amber-50/80 text-amber-700" : "text-slate-700"
                    }`}
                  >
                    <div className="w-5 flex-shrink-0 mt-0.5">
                      {isSelected && <Check size={14} className="text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{lot.name}</p>
                      {lot.description && (
                        <p className="text-[10px] text-slate-400 truncate line-clamp-2">{lot.description}</p>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer avec le nombre de lots */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[10px] text-slate-400">
              {filteredLots.length} lot{filteredLots.length > 1 ? 's' : ''} disponible{filteredLots.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}