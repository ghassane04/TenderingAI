import api from "./client"

export interface TechnicalLot {
  id: number
  name: string
  description: string | null
  created_at?: string
  updated_at?: string
}

export interface TechnicalLotsListResponse {
  total: number
  lots: TechnicalLot[]
}

export const technicalLotsApi = {
  list: async (): Promise<TechnicalLotsListResponse> => {
    const res = await api.get("/api/technical-lots")
    return res.data
  },

  getlot: async (id: number): Promise<TechnicalLot> => {
    const res = await api.get(`/api/technical-lots/${id}`)
    return res.data
  },

  create: async (data: { name: string; description?: string }): Promise<TechnicalLot> => {
    const res = await api.post("/api/technical-lots", data)
    return res.data
  },

  update: async (id: number, data: { name: string; description?: string }): Promise<TechnicalLot> => {
    const res = await api.put(`/api/technical-lots/${id}`, data)
    return res.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/technical-lots/${id}`)
  },
}