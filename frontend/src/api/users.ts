import api from "./client"

export interface User {
  id: number
  last_name: string
  first_name: string
  email: string
  username: string
  roles: string[]
  created_at?: string
  updated_at?: string
}

export interface UsersListResponse {
  total: number
  users: User[]
}

export interface UserUpdateRequest {
  first_name?: string
  last_name?: string
  email?: string
  password?: string
  roles?: string[]
}

export const usersApi = {
  list: async (): Promise<UsersListResponse> => {
    const res = await api.get("/api/users/")
    return res.data
  },

  create: async (data: {
    last_name: string
    first_name: string
    email: string
    username: string
    password: string
    roles: string[]
  }): Promise<any> => {
    const res = await api.post("/api/auth/register", data)
    return res.data
  },

  getuser: async (userId: number): Promise<User> => {
    const res = await api.get(`/api/users/${userId}`)
    return res.data
  },

  update: async (userId: number, data: UserUpdateRequest): Promise<any> => {
    const res = await api.put(`/api/users/${userId}`, data)
    return res.data
  },

  delete: async (userId: number): Promise<void> => {
    await api.delete(`/api/users/${userId}`)
  },
}