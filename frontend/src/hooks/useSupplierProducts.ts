import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supplierProductsApi } from "../api/supplier-products"
import toast from "react-hot-toast"

export function useDatasheetSupplierProducts(datasheetId: number) {
  return useQuery({
    queryKey: ["datasheet", datasheetId, "supplier-products"],
    queryFn: () => supplierProductsApi.getProductsByDatasheet(datasheetId),
    enabled: !!datasheetId,
  })
}

export function useSupplierProduct(id: number) {
  return useQuery({
    queryKey: ["supplier-product", id],
    queryFn: () => supplierProductsApi.getById(id),
    enabled: !!id,
  })
}

export function useAddSupplierProduct(datasheetId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { designation: string }) => supplierProductsApi.addProduct(datasheetId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["datasheet", datasheetId, "supplier-products"] })
      toast.success("Produit ajouté")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur ajout produit"),
  })
}

export function useUpdateSupplierProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { designation: string; product_id: number | null } }) =>
      supplierProductsApi.updateProduct(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["supplier-product", vars.id] })
      toast.success("Produit mis à jour")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur mise à jour"),
  })
}

export function useAddCharacteristic(supplierProductId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { technical_data: string; value: string | null }) =>
      supplierProductsApi.addCharacteristic(supplierProductId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-product", supplierProductId] })
      toast.success("Caractéristique ajoutée")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur ajout caractéristique"),
  })
}

export function useUpdateCharacteristic(supplierProductId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { technical_data: string; value: string | null; requirement_id: number | null } }) =>
      supplierProductsApi.updateCharacteristic(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-product", supplierProductId] })
      toast.success("Caractéristique mise à jour")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur mise à jour"),
  })
}

export function useDeleteSupplierProduct(datasheetId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: supplierProductsApi.deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["datasheet", datasheetId, "supplier-products"] })
      toast.success("Produit supprimé")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur suppression"),
  })
}

export function useDeleteCharacteristic(supplierProductId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: supplierProductsApi.deleteCharacteristic,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-product", supplierProductId] })
      toast.success("Caractéristique supprimée")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Erreur suppression"),
  })
}