import api from "./client"

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user_id: number
  full_name: string
  roles: string[]
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const form = new FormData()
    form.append("username", payload.username)
    form.append("password", payload.password)
    const res = await api.post("/api/auth/login", form)
    return res.data
  },

  logout: async () => {
    await api.post("/api/auth/logout")
  },
}