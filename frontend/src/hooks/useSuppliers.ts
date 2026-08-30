import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { suppliersApi } from "../api/suppliers"
import toast from "react-hot-toast"

export const SUPPLIERS_KEY = ["suppliers"]
export const supplierDetailKey = (id: number) => ["supplier", id]

export function useSuppliersList() {
  return useQuery({
    queryKey: SUPPLIERS_KEY,
    queryFn: suppliersApi.list,
    staleTime: 1000 * 60 * 5,
  })
}

export function useSupplierDetail(id: number) {
  return useQuery({
    queryKey: supplierDetailKey(id),
    queryFn: () => suppliersApi.getsupplier(id),
    enabled: !!id,
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPLIERS_KEY })
      toast.success("Fournisseur créé avec succès")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur lors de la création"),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { company_name: string; email: string; description?: string } }) =>
      suppliersApi.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: SUPPLIERS_KEY })
      qc.invalidateQueries({ queryKey: supplierDetailKey(vars.id) })
      toast.success("Fournisseur mis à jour")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur lors de la mise à jour"),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: suppliersApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPLIERS_KEY })
      toast.success("Fournisseur supprimé")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur lors de la suppression"),
  })
}