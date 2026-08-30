import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { emailsApi } from "../api/emails"
import type { EmailCheckRange } from "../api/emails"
import toast from "react-hot-toast"

export function useTenderEmails(tenderId: number) {
  return useQuery({
    queryKey: ["tender", tenderId, "emails"],
    queryFn: () => emailsApi.getemails(tenderId),
    enabled: !!tenderId,
  })
}

export function useEmailPreview(tslId: number | null) {
  return useQuery({
    queryKey: ["email-preview", tslId],
    queryFn: () => emailsApi.getPreview(tslId as number),
    enabled: !!tslId,
  })
}

export function useEmailHistory(tslId: number | null) {
  return useQuery({
    queryKey: ["email-history", tslId],
    queryFn: () => emailsApi.getHistory(tslId as number),
    enabled: !!tslId,
  })
}

export function useSendEmail(tenderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tslId, subject, body }: { tslId: number; subject: string; body: string }) =>
      emailsApi.sendEmail(tslId, subject, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tender", tenderId, "emails"] })
      qc.invalidateQueries({ queryKey: ["tender", tenderId, "suppliers-overview"] })
      toast.success("Email envoyé")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur envoi email"),
  })
}

export function useCheckEmails(tenderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (range: EmailCheckRange) => emailsApi.checkemails(range),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tender", tenderId, "emails"] })
      toast.success(data.message)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur récupération des emails"),
  })
}

export function useDeleteEmailLog(tslId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (logId: number) => emailsApi.deleteLog(logId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-history", tslId] })
      toast.success("Entrée supprimée")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur suppression"),
  })
}