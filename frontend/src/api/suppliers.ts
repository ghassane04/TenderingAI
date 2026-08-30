import api from "./client"

export interface Supplier {
  id: number
  company_name: string
  email: string | null
  description: string | null
  created_at?: string
  updated_at?: string
}

export interface SuppliersListResponse {
  total: number
  suppliers: Supplier[]
}

export const suppliersApi = {
  list: async (): Promise<SuppliersListResponse> => {
    const res = await api.get("/api/suppliers")
    return res.data
  },

  getsupplier: async (id: number): Promise<Supplier> => {
    const res = await api.get(`/api/suppliers/${id}`)
    return res.data
  },

  create: async (data: {
    company_name: string
    email: string
    description?: string
  }): Promise<Supplier> => {
    const res = await api.post("/api/suppliers", data)
    return res.data
  },

  update: async (
    id: number,
    data: { company_name: string; email: string; description?: string }
  ): Promise<Supplier> => {
    const res = await api.put(`/api/suppliers/${id}`, data)
    return res.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/suppliers/${id}`)
  },
}