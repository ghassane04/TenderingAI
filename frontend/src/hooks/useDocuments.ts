import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { documentApi } from "../api/document"
import { openFileInNewTab } from "../lib/viewFile"
import toast from "react-hot-toast"

export function useTenderDocuments(tenderId: number) {
  return useQuery({
    queryKey: ["tender", tenderId, "documents"],
    queryFn: () => documentApi.getDocuments(tenderId),
    enabled: !!tenderId,
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.some((d) => d.statut_name === "En cours")
      return hasProcessing ? 2000 : false
    },
  })
}

export function useDocumentDetail(documentId: number) {
  return useQuery({
    queryKey: ["document", documentId],
    queryFn: () => documentApi.getDocumentDetail(documentId),
    enabled: !!documentId,
    refetchInterval: (query) => {
      const status = query.state.data?.statut_name
      return status === "En cours" ? 2000 : false
    },
  })
}

export function useUploadDocuments(tenderId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (files: File[]) => documentApi.uploadDocument(tenderId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender", tenderId, "documents"] })
    },
  })
}

export function useViewDocument() {
  return useMutation({
    mutationFn: ({ documentId, filename }: { documentId: number; filename: string }) =>
      openFileInNewTab(() => documentApi.getFileBlob(documentId), filename),
    onError: () => toast.error("Erreur lors de l'ouverture du document"),
  })
}

export function useReprocessDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (documentId: number) => documentApi.reprocessDocument(documentId),
    onSuccess: (_data, documentId) => {
      queryClient.invalidateQueries({ queryKey: ["document", documentId] })
      queryClient.invalidateQueries({ queryKey: ["tender"] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (documentId: number) => documentApi.deleteDocument(documentId),
    onSuccess: (_data, documentId) => {
      queryClient.invalidateQueries({ queryKey: ["document", documentId] })
      queryClient.invalidateQueries({ queryKey: ["tender"] })
    },
  })
}