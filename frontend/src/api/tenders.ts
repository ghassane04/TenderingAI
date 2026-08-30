import api from "./client"

export interface TenderManualCreate {
  tender_code: string
  designation: string
  nom_client: string | null
}

export interface TenderMetadata {
  id: number
  code: string
  designation: string
  nom_client: string | null
  status_name: string | null
  uploaded_at: string | null
  uploaded_by: string | null
}

export interface TenderListResponse {
  total: number
  tenders: TenderMetadata[]
}

export interface ProcessTenderResponse {
  success: boolean
  tender_id: number
  files_processed: number
  files_skipped: number
  files_error: number
  message: string
}

export const tendersApi = {
  list: async (): Promise<TenderListResponse> => {
    const res = await api.get("/api/tenders")
    return res.data
  },

  initialize: async (files: File[]): Promise<any> => {
    const form = new FormData()
    files.forEach((f) => form.append("files", f))
    const res = await api.post("/api/tenders/initialize", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    })
    return res.data
  },

  manual: async (data: TenderManualCreate): Promise<any> => {
    const res = await api.post("/api/tenders/manual", data)
    return res.data
  },

  process: async (tenderId: number): Promise<ProcessTenderResponse> => {
    const res = await api.post(`/api/tenders/${tenderId}/process`)
    return res.data
  },

  getMetadata: async (tenderId: number): Promise<TenderMetadata> => {
    const res = await api.get(`/api/tenders/${tenderId}/metadata`)
    return res.data
  },

  updateMetadata: async (
    tenderId: number,
    data: { code: string; designation: string; nom_client: string | null }
  ): Promise<any> => {
    const res = await api.patch(`/api/tenders/${tenderId}/metadata`, data)
    return res.data
  },

  delete: async (tenderId: number): Promise<void> => {
    await api.delete(`/api/tenders/${tenderId}`)
  },
}