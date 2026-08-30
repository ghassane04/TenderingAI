import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { technicalLotsApi } from "../api/technical-lots"
import toast from "react-hot-toast"

export const LOTS_KEY = ["technical-lots"]
export const lotDetailKey = (id: number) => ["technical-lot", id]

export function useTechnicalLotsList() {
  return useQuery({
    queryKey: LOTS_KEY,
    queryFn: technicalLotsApi.list,
    staleTime: 1000 * 60 * 10,
  })
}

export function useTechnicalLotDetail(id: number) {
  return useQuery({
    queryKey: lotDetailKey(id),
    queryFn: () => technicalLotsApi.getlot(id),
    enabled: !!id,
  })
}

export function useCreateLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: technicalLotsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LOTS_KEY })
      toast.success("Lot technique créé")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur lors de la création"),
  })
}

export function useUpdateLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; description?: string } }) =>
      technicalLotsApi.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: LOTS_KEY })
      qc.invalidateQueries({ queryKey: lotDetailKey(vars.id) })
      toast.success("Lot technique mis à jour")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur mise à jour"),
  })
}

export function useDeleteLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: technicalLotsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LOTS_KEY })
      toast.success("Lot supprimé")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur lors de la suppression"),
  })
}