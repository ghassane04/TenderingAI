import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pdfApi } from "../api/pdf"
import toast from "react-hot-toast"
import { openFileInNewTab } from "../lib/viewFile"

export const LOTS_KEY = ["pdf"]

export function useGeneratePdfs(tenderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => pdfApi.generatePdfs(tenderId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tender", tenderId] })
      toast.success(data.message || "PDFs générés avec succès")
      data.warnings?.forEach((w) => toast(w, { icon: "⚠️" }))
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur génération PDF"),
  })
}

export function useGenerateLotPdf(tenderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (technicalLotId: number) => pdfApi.generateLotPdf(tenderId, technicalLotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tender", tenderId, "pdfs"] })
      toast.success("PDF du lot régénéré")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur régénération du lot"),
  })
}

export function useViewPdf() {
  return useMutation({
    mutationFn: ({ pdfId, filename }: { pdfId: number; filename: string }) =>
      openFileInNewTab(() => pdfApi.downloadPdf(pdfId), filename),
    onError: () => toast.error("Erreur lors de l'ouverture du PDF"),
  })
}

export function useTenderPdfs(tenderId: number) {
  return useQuery({
    queryKey: ["tender", tenderId, "pdfs"],
    queryFn: () => pdfApi.getPdfs(tenderId),
    enabled: !!tenderId,
  })
}