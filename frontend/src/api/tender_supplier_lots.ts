import api from "./client"

export interface TslSummary {
  tsl_id: number
  tender_id: number | null
  supplier_id: number | null
  supplier_name: string
  supplier_email: string | null
  technical_lot_id: number | null
  lot_name: string
  status_id: number | null
  status_name: string | null
  email_sent_at: string | null
  created_at: string | null
  pdf_exists: boolean
}

export const tslApi = {
  getTsl: async (tenderId: number): Promise<TslSummary[]> => {
    const res = await api.get(`/api/tender_supplier_lots/${tenderId}`)
    return res.data
  },
  createTsl: async (tenderId: number, supplierId: number, lotId: number): Promise<any> => {
    const res = await api.post(`/api/tender_supplier_lots/${tenderId}`, {
      supplier_id: supplierId,
      technical_lot_id: lotId,
    })
    return res.data
  },
  getTslDetail: async (tslId: number): Promise<TslSummary> => {
    const res = await api.get(`/api/tender_supplier_lots/detail/${tslId}`)
    return res.data
  },
  deleteTsl: async (tslId: number): Promise<void> => {
    await api.delete(`/api/tender_supplier_lots/${tslId}`)
  },
}