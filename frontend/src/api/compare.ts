import api from "./client"

export interface MatchedCharacteristic {
  characteristic_id: number
  technical_data: string
  value: string | null
}

export interface ComparisonLine {
  requirement_id: number | null
  exigence: string
  valeur_requise: string | null
  operateur: string | null
  caracteristiques_fournies: MatchedCharacteristic[]
  score: number
  conformite: string
  conformite_description: string
  is_non_couverte: boolean
}

export interface ExtraCharacteristic {
  characteristic_id: number
  technical_data: string
  value: string | null
}

export interface SupplierProductComparison {
  supplier_product_id: number
  supplier_product_designation: string
  tender_product_id: number
  tender_product_designation: string
  score: number
  nb_conformes: number
  nb_non_conformes: number
  nb_non_specifies: number
  nb_exigences_total: number
  lignes: ComparisonLine[]
  caracteristiques_hors_exigences: ExtraCharacteristic[]
}

export interface RequirementLineCorrection {
  requirement_id: number | null
  characteristic_ids: number[]
  evaluation: number
}

export interface LotProductCoverage {
  tender_product_id: number
  tender_product_designation: string
  supplier_product_id: number | null
  datasheet_id: number | null
  score: number
  addressed: boolean
}

export interface SupplierLotAggregateResult {
  supplier_id: number
  supplier_name: string
  nb_tender_products: number
  nb_tender_products_addressed: number
  score_global: number
  products: LotProductCoverage[]
}

export interface LotSupplierRankingResponse {
  lot_id: number
  lot_name: string
  suppliers: SupplierLotAggregateResult[]
}

export const comparisonApi = {
  runComparison: async (supplierProductId: number): Promise<any> => {
    const res = await api.post(`/api/compare/${supplierProductId}`)
    return res.data
  },
  correctComparison: async (supplierProductId: number, corrections: RequirementLineCorrection[]): Promise<SupplierProductComparison> => {
    const res = await api.patch(`/api/compare/${supplierProductId}/corrections`, { corrections })
    return res.data
  },

  getTenderLotRankings: async (tenderId: number): Promise<LotSupplierRankingResponse[]> => {
    const res = await api.get(`/api/compare/${tenderId}/rankings`)
    return res.data
  },

  getProductComparison: async (supplierProductId: number): Promise<SupplierProductComparison> => {
    const res = await api.get(`/api/compare/${supplierProductId}/supplier_product`)
    return res.data
  },
}