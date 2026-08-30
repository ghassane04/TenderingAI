import api from "./client"

export interface DocumentInfo {
  id: number
  designation?: string
  statut_name?: string
  statut_id?: number
  count_chunks?: number
  nb_chunks_done?: number
  uploaded_at?: string
  uploaded_by?: string
}

export interface DocumentDetail extends DocumentInfo {
  tender_id?: number
  file_size?: string
  path?: string
  filetype?: string
  count_chunks: number
  nb_chunks_done: number
  updated_at?: string
  updated_by?: string
}

export const documentApi = {
  getDocuments: async (tenderId: number): Promise<DocumentInfo[]> => {
    const res = await api.get(`/api/documents/${tenderId}`)
    return res.data
  },

  getDocumentDetail: async (documentId: number): Promise<DocumentDetail> => {
    const res = await api.get(`/api/documents/${documentId}/detail`)
    return res.data
  },

  uploadDocument: async (tenderId: number, files: File[]): Promise<any> => {
    const form = new FormData()
    files.forEach((f) => form.append("files", f))
    const res = await api.post(`/api/documents/${tenderId}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data
  },

  getFileBlob: async (documentId: number): Promise<Blob> => {
    const res = await api.get(`/api/documents/${documentId}/download`, { responseType: "blob" })
    return res.data
  },

  reprocessDocument: async (documentId: number): Promise<any> => {
    const res = await api.post(`/api/documents/${documentId}/reprocess`)
    return res.data
  },

  deleteDocument: async (documentId: number) => {
    const res = await api.delete(`/api/documents/${documentId}`)
    return res.data
  },
}