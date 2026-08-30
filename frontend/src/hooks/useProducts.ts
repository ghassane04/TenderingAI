import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { productsApi } from "../api/products"
import toast from "react-hot-toast"

export function useTenderProduct(tenderId: number) {
  return useQuery({
    queryKey: ["product", tenderId],
    queryFn: () => productsApi.geProducts(tenderId),
    enabled: !!tenderId,
  })
}

export function useUpdateProduct(tenderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { designation: string; technical_lot_id: number | null } }) => productsApi.updateProduct(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", tenderId] })
      toast.success("Produit mis à jour")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur mise à jour"),
  })
}

export function useDeleteProduct(tenderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", tenderId] })
      toast.success("Produit et ses exigences supprimés")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur suppression"),
  })
}

export function useAddRequirement(productId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      requirement: string
      operateur: string
      value: string | null
    }) => productsApi.addRequirement(productId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] })
      toast.success("Exigence ajoutée")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur ajout exigence"),
  })
}

export function useUpdateRequirement(productId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: { requirement: string; operateur: string; value: string | null }
    }) => productsApi.updateRequirement(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] })
      toast.success("Exigence mise à jour")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur mise à jour"),
  })
}

export function useDeleteRequirement(productId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productsApi.deleteRequirement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] })
      toast.success("Exigence supprimée")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur suppression"),
  })
}

export function useAddProductToTender(tenderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      designation: string
      technical_lot_id: number | null
    }) => productsApi.addProduct(tenderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", tenderId] })  // ✅ corrigé
      toast.success("Produit ajouté")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur ajout produit"),
  })
}