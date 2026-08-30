import api from "./client"
import type { TslSummary } from "./tender_supplier_lots"

export type { TslSummary }

export interface TenderEmailsResponse {
  tender_id: number
  total: number
  items: TslSummary[]
}

export interface EmailPreview {
  subject: string
  body: string
}

export interface CheckEmailsResponse {
  success: boolean
  message: string
  inserted_count: number
}

export interface TslEmailLogEntry {
  id: number
  direction: "outbound" | "inbound"
  subject: string | null
  body_envoi: string | null
  body_recu: string | null
  from_address: string | null
  to_address: string | null
  sent_at: string | null
  received_at: string | null
  status_id: number | null
  status_name: string | null
  error_message: string | null
  created_at: string | null
}

export type EmailCheckRange = "today" | "last_2_days" | "last_7_days" | "all"

export const emailsApi = {
  getemails: async (tenderId: number): Promise<TenderEmailsResponse> => {
    const res = await api.get(`/api/emails/${tenderId}`)
    return res.data
  },
  getPreview: async (tslId: number): Promise<EmailPreview> => {
    const res = await api.get(`/api/emails/preview/${tslId}`)
    return res.data
  },
  getHistory: async (tslId: number): Promise<TslEmailLogEntry[]> => {
    const res = await api.get(`/api/emails/history/${tslId}`)
    return res.data
  },
  sendEmail: async (tslId: number, subject: string, body: string) => {
    const res = await api.post(`/api/emails/send/${tslId}`, { subject, body })
    return res.data
  },

  checkemails: async (range: EmailCheckRange = "last_2_days"): Promise<CheckEmailsResponse> => {
    const res = await api.post("/api/emails/check-emails", { range }, {
      timeout: 90_000,
    })
    return res.data
  },
  
  deleteLog: async (logId: number): Promise<void> => {
    await api.delete(`/api/emails/history/log/${logId}`)
  },
}