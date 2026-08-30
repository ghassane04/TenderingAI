import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usersApi } from "../api/users"
import type { UserUpdateRequest } from "../api/users"
import toast from "react-hot-toast"

export const USERS_KEY = ["users"]
export const userDetailKey = (id: number) => ["user", id]

export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: usersApi.list,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUserDetail(id: number) {
  return useQuery({
    queryKey: userDetailKey(id),
    queryFn: () => usersApi.getuser(id),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY })
      toast.success("Utilisateur créé avec succès")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur lors de la création"),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdateRequest }) =>
      usersApi.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: USERS_KEY })
      qc.invalidateQueries({ queryKey: userDetailKey(vars.id) })
      toast.success("Utilisateur mis à jour")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur mise à jour"),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY })
      toast.success("Utilisateur supprimé")
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail || "Erreur lors de la suppression"),
  })
}