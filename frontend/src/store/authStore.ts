import { create } from "zustand"

interface User {
  user_id: number
  full_name: string
  roles: string[]
  access_token: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (data: User) => void
  logout: () => void
}

function readStoredUser(): User | null {
  const stored = localStorage.getItem("auth_user")
  if (!stored) return null
  try {
    return JSON.parse(stored) as User
  } catch {
    localStorage.removeItem("auth_user")
    localStorage.removeItem("access_token")
    return null
  }
}

const storedUser = readStoredUser()

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser,
  isAuthenticated: !!storedUser,

  login: (data) => {
    localStorage.setItem("auth_user", JSON.stringify(data))
    localStorage.setItem("access_token", data.access_token)
    set({ user: data, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem("auth_user")
    localStorage.removeItem("access_token")
    set({ user: null, isAuthenticated: false })
  },
}))
