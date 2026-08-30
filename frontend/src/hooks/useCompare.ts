import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { comparisonApi } from "../api/compare"
import type { RequirementLineCorrection } from "../api/compare"
import { getApiErrorMessage } from "../lib/utils"
import toast from "react-hot-toast"

export function useSupplierProductComparison(supplierProductId: number, enabled = true) {
  return useQuery({
    queryKey: ["supplier-product", supplierProductId, "comparison"],
    queryFn: () => comparisonApi.getProductComparison(supplierProductId),
    enabled: !!supplierProductId && enabled,
    refetchInterval: 3000,
  })
}

function invalidateComparisonData(qc: ReturnType<typeof useQueryClient>, supplierProductId: number) {
  qc.invalidateQueries({ queryKey: ["supplier-product", supplierProductId] })
  qc.invalidateQueries({ queryKey: ["datasheet"] })
  qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "tender" && q.queryKey[2] === "rankings" })
}

export function useCorrectComparison(supplierProductId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (corrections: RequirementLineCorrection[]) =>
      comparisonApi.correctComparison(supplierProductId, corrections),
    onSuccess: () => {
      invalidateComparisonData(qc, supplierProductId)
      toast.success("Corrections enregistrées")
    },
    onError: (e: any) => toast.error(getApiErrorMessage(e, "Erreur correction")),
  })
}

export function useRunComparison(supplierProductId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => comparisonApi.runComparison(supplierProductId),
    onSuccess: () => {
      toast.success("Comparaison démarrée")
      invalidateComparisonData(qc, supplierProductId)
    },
    onError: (e: any) => toast.error(getApiErrorMessage(e, "Erreur démarrage comparaison")),
  })
}

export function useTenderLotRankings(tenderId: number) {
  return useQuery({
    queryKey: ["tender", tenderId, "rankings"],
    queryFn: () => comparisonApi.getTenderLotRankings(tenderId),
    enabled: !!tenderId,
  })
}