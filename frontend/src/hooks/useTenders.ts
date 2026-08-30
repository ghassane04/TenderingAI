import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { tendersApi } from "../api/tenders"
import toast from "react-hot-toast"

export const TENDERS_KEY = ["tenders"]

export function useInitializeTender() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (files: File[]) => tendersApi.initialize(files),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: TENDERS_KEY })
      toast.success(`Tender créé : ${data.code}`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Erreur lors de la création")
    },
  })
}

export function useManualTender() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn:tendersApi.manual,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: TENDERS_KEY })
      toast.success(`Tender créé : ${data.code}`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Erreur lors de la création")
    },
  })
}

export function useProcessTender() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tendersApi.process,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENDERS_KEY })
      toast.success("Extraction démarrée, suivez la progression sur la fiche du tender")
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Erreur lors du démarrage de l'extraction")
    },
  })
}

export function useTenders() {
  return useQuery({
    queryKey: TENDERS_KEY,
    queryFn: tendersApi.list,
    staleTime: 1000 * 60,
  })
}

export function useTenderMetadata(tenderId: number) {
  return useQuery({
    queryKey: ["tender", tenderId, "metadata"],
    queryFn: () => tendersApi.getMetadata(tenderId),
    enabled: !!tenderId,
    refetchInterval: (query) => {
      const status = query.state.data?.status_name
      return status === "Extraction des exigences en cours" ? 3000 : false
    },
  })
}

export function useUpdateMetadata(tenderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      code: string
      designation: string
      nom_client: string | null
    }) => tendersApi.updateMetadata(tenderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tender", tenderId, "detail"] })
      toast.success("Métadonnées mises à jour")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur mise à jour"),
  })
}

export function useDeleteTender() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tendersApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENDERS_KEY })
      toast.success("Appel d'offres supprimé")
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Erreur lors de la suppression")
    },
  })
}
