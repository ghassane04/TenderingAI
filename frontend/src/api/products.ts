import api from "./client"

export interface RequirementDetail {
  id: number
  requirement: string
  value: string | null
  operateur: string | null
}

export interface ProductDetail {
  id: number
  designation: string
  technical_lot_id: number | null
  technical_lot_name: string | null
  tender_document_id: number | null
  requirements: RequirementDetail[]
}

export const productsApi = {
  geProducts: async (tenderId: number): Promise<ProductDetail[]> => {
    const res = await api.get(`/api/products/${tenderId}`)
    return res.data
  },

  addProduct: async (
    tenderId: number,
    data: { designation: string; technical_lot_id: number | null }
  ): Promise<any> => {
    const res = await api.post(`/api/products/${tenderId}`, data)
    return res.data
  },

  addRequirement: async (
    productId: number,
    data: { requirement: string; operateur: string; value: string | null }
  ): Promise<any> => {
    const res = await api.post(`/api/products/${productId}/requirements`, data)
    return res.data
  },

  updateProduct: async (
    productId: number,
    data: { designation: string; technical_lot_id: number | null }
  ): Promise<any> => {
    const res = await api.patch(`/api/products/${productId}`, data)
    return res.data
  },

  updateRequirement: async (
    requirementId: number,
    data: { requirement: string; operateur: string; value: string | null }
  ): Promise<any> => {
    const res = await api.patch(`/api/products/requirements/${requirementId}`, data)
    return res.data
  },

  delete: async (productId: number): Promise<void> => {
    await api.delete(`/api/products/${productId}`)
  },

  deleteRequirement: async (requirementId: number): Promise<void> => {
    await api.delete(`/api/products/requirements/${requirementId}`)
  },
}