import api from "./client"

export interface CharacteristicInfo {
  id: number
  technical_data: string
  value: string | null
  requirement_id: number | null
  evaluation: number | null
  conformite: string | null
  conformite_description: string | null
}

export interface SupplierProductDetail {
  id: number
  designation: string
  product_id: number | null
  tender_product_designation: string | null
  supplier_datasheet_id: number | null
  datasheet_designation: string | null
  supplier_id: number | null
  supplier_name: string | null
  tender_id: number | null
  tender_designation: string | null
  score: number | null
  characteristics: CharacteristicInfo[]
}

export interface SupplierProductsListResponse {
  total: number
  products: SupplierProductDetail[]
}

export const supplierProductsApi = {
  getProductsByDatasheet: async (datasheetId: number): Promise<SupplierProductsListResponse> => {
    const res = await api.get(`/api/supplier_product/${datasheetId}`)
    return res.data
  },

  getById: async (id: number): Promise<SupplierProductDetail> => {
    const res = await api.get(`/api/supplier_product/${id}/detail`)
    return res.data
  },

  addProduct: async (datasheetId: number, data: { designation: string }): Promise<any> => {
    const res = await api.post(`/api/supplier_product/${datasheetId}`, data)
    return res.data
  },

  addCharacteristic: async (supplierProductId: number, data: { technical_data: string; value: string | null }): Promise<any> => {
    const res = await api.post(`/api/supplier_product/${supplierProductId}/characteristic`, data)
    return res.data
  },

  updateProduct: async (supplierProductId: number, data: { designation: string; product_id: number | null }): Promise<any> => {
    const res = await api.patch(`/api/supplier_product/${supplierProductId}`, data)
    return res.data
  },

  updateCharacteristic: async (characteristicId: number, data: { technical_data: string; value: string | null; requirement_id: number | null }): Promise<any> => {
    const res = await api.patch(`/api/supplier_product/characteristics/${characteristicId}`, data)
    return res.data
  },

  deleteProduct: async (supplierProductId: number): Promise<void> => {
    await api.delete(`/api/supplier_product/${supplierProductId}`)
  },

  deleteCharacteristic: async (characteristicId: number): Promise<void> => {
    await api.delete(`/api/supplier_product/characteristics/${characteristicId}`)
  },
}