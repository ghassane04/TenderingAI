import api from "./client"

export interface PdfFileInfo {
  id: number | null
  lot_id: number
  lot_name: string
  filename: string
  file_size?: string | null
  generated_at?: string | null
  generated_by?: string | null
  exists: boolean
}

export interface GeneratePdfsResponse {
  success: boolean
  tender_id: number
  generated: number
  pdfs: PdfFileInfo[]
  warnings: string[]
  message: string
}

export const pdfApi = {
  getPdfs: async (tenderId: number): Promise<PdfFileInfo[]> => {
    const res = await api.get(`/api/pdf/${tenderId}`)
    return res.data
  },

  generatePdfs: async (tenderId: number): Promise<GeneratePdfsResponse> => {
    const res = await api.post("/api/pdf/generate-lots-pdf", { tender_id: tenderId })
    return res.data
  },

  generateLotPdf: async (tenderId: number, technicalLotId: number) => {
    const res = await api.post("/api/pdf/generate-lot-pdf", {
      tender_id: tenderId,
      technical_lot_id: technicalLotId,
    })
    return res.data
  },

  downloadPdf: async (pdfId: number): Promise<Blob> => {
    const res = await api.get(`/api/pdf/download/${pdfId}`, { responseType: "blob" })
    return res.data
  },
}