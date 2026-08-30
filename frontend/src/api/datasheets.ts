import api from "./client"

export interface DatasheetInfo {
  id: number
  designation: string | null
  file_path: string | null
  file_size: string | null
  supplier_name: string | null
  technical_lot_id: number | null
  lot_name: string | null
  status: string | null
  status_id: number | null
  uploaded_at: string | null
  uploaded_by: string | null
  products_count: number
}

export interface ListDatasheet {
  total: number
  datasheets: DatasheetInfo[]
}

export interface DatasheetDetail {
  datasheet_id: number
  designation: string | null
  file_path: string | null
  supplier_id: number | null
  supplier_name: string | null
  technical_lot_id: number | null
  lot_name: string | null
  status: string | null
  status_id: number | null
  filetype: string | null
  file_size: string | null
  uploaded_by: string | null
  uploaded_at: string | null
}

export interface ProductCandidate {
  product_id: number
  designation: string
  score: number
}
export interface SupplierProductMatchInfo {
  supplier_product_id: number
  nom_produit: string
  candidats: ProductCandidate[]
}

export interface SemanticMatchResult {
  success: boolean
  datasheet_id: number
  produits: SupplierProductMatchInfo[]
  message?: string
}

export const datasheetsApi = {
  listByTender: async (tenderId: number): Promise<ListDatasheet> => {
    const res = await api.get(`/api/datasheets/${tenderId}`)
    return res.data
  },

  getDetail: async (datasheetId: number): Promise<DatasheetDetail> => {
    const res = await api.get(`/api/datasheets/${datasheetId}/detail`)
    return res.data
  },

  getFileBlob: async (datasheetId: number): Promise<Blob> => {
    const res = await api.get(`/api/datasheets/${datasheetId}/download`, { responseType: "blob" })
    return res.data
  },
  
  extractDatasheet: async (datasheetId: number): Promise<any> => {
    const res = await api.post(`/api/datasheets/${datasheetId}/extract`)
    return res.data
  },

  runSemanticMatch: async (
    datasheetId: number, 
    tenderId: number, 
    lotId: number
  ): Promise<SemanticMatchResult> => {
      const res = await api.post(`/api/datasheets/${datasheetId}/semantic-match`, {
        tender_id: tenderId,
        lot_id: lotId,
      })
      return res.data
    },

  getCandidates: async (supplierProductId: number): Promise<SupplierProductMatchInfo> => {
    const res = await api.get(`/api/datasheets/supplier-products/${supplierProductId}/candidates`)
    return res.data
  },

  confirmProduct: async (supplierProductId: number, chosenProductId: number): Promise<any> => {
    const res = await api.post("/api/datasheets/confirm", {
      supplier_product_id: supplierProductId,
      chosen_product_id: chosenProductId,
    })
    return res.data
  },
}
