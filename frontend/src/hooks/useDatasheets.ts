import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { datasheetsApi } from "../api/datasheets"
import toast from "react-hot-toast"
import { openFileInNewTab } from "../lib/viewFile"

export function useDatasheetsByTender(tenderId: number) {
  return useQuery({
    queryKey: ["datasheets", "tender", tenderId],
    queryFn: () => datasheetsApi.listByTender(tenderId),
    enabled: !!tenderId,
    staleTime: 1000 * 60,
  })
}

export function useDatasheetDetail(datasheetId: number) {
  return useQuery({
    queryKey: ["datasheet", datasheetId],
    queryFn: () => datasheetsApi.getDetail(datasheetId),
    enabled: !!datasheetId,
    refetchInterval: (query) => (query.state.data?.status === "En cours" ? 2000 : false),
  })
}

export function useViewDatasheetFile() {
  return useMutation({
    mutationFn: ({ datasheetId, filename }: { datasheetId: number; filename: string }) =>
      openFileInNewTab(() => datasheetsApi.getFileBlob(datasheetId), filename),
    onError: () => toast.error("Erreur lors de l'ouverture de la fiche"),
  })
}

export function useExtractDatasheet(tenderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datasheetId: number) => datasheetsApi.extractDatasheet(datasheetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tender", tenderId, "datasheets"] })
      toast.success("Extraction démarrée — suivez la progression sur la fiche")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur démarrage extraction"),
  })
}

export function useSemanticMatch(tenderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ datasheetId, lotId }: { datasheetId: number; lotId: number }) =>
      datasheetsApi.runSemanticMatch(datasheetId, tenderId, lotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tender", tenderId, "datasheets"] })
      toast.success("Matching terminé — les suggestions sont disponibles sous chaque produit")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur démarrage matching"),
  })
}


export function useMatchCandidates(supplierProductId: number, enabled = true) {
  return useQuery({
    queryKey: ["match-candidates", supplierProductId],
    queryFn: () => datasheetsApi.getCandidates(supplierProductId),
    enabled: !!supplierProductId && enabled,
    refetchInterval: 3000,
  })
}

export function useConfirmProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ supplierProductId, chosenProductId }: { supplierProductId: number; chosenProductId: number }) =>
      datasheetsApi.confirmProduct(supplierProductId, chosenProductId),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["supplier-product", vars.supplierProductId] })
      qc.invalidateQueries({ queryKey: ["datasheet"] })
      toast.success(data?.message || "Produit confirmé — lancez la comparaison technique séparément")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur confirmation"),
  })
}
