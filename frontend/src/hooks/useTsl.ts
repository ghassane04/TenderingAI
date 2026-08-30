import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { tslApi } from "../api/tender_supplier_lots"
import toast from "react-hot-toast"

export const LOTS_KEY = ["tsl"]

export function useTenderSuppliersOverview(tenderId: number) {
  return useQuery({
    queryKey: ["tender", tenderId, "suppliers-overview"],
    queryFn: () => tslApi.getTsl(tenderId),
    enabled: !!tenderId,
  })
}

export function useCreateTsl(tenderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ supplierId, lotId }: { supplierId: number; lotId: number }) =>
      tslApi.createTsl(tenderId, supplierId, lotId),
    onSuccess: () => {
      // Invalider TOUTES les queries du tender
      qc.invalidateQueries({ queryKey: ["tender", tenderId] })
      qc.invalidateQueries({ queryKey: ["tender", tenderId, "detail"] })
      toast.success("Fournisseur assigné au lot")
    },
    onError: (e: any) => {
      const msg = e.response?.data?.detail || "Erreur assignation"
      // 409 = doublon — pas une vraie erreur bloquante
      if (e.response?.status === 409) {
        toast.error("Cette association fournisseur/lot existe déjà")
      } else {
        toast.error(msg)
      }
    },
  })
}

export function useTslDetail(tslId: number | null) {
  return useQuery({
    queryKey: ["tsl-detail", tslId],
    queryFn: () => tslApi.getTslDetail(tslId as number),
    enabled: !!tslId,
  })
}

export function useDeleteTsl(tenderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tslId: number) => tslApi.deleteTsl(tslId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tender", tenderId] })
      qc.invalidateQueries({ queryKey: ["tender", tenderId, "detail"] })
      toast.success("Association supprimée")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur suppression"),
  })
}
