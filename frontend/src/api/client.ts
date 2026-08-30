import axios from "axios"
import toast from "react-hot-toast"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  // Les extractions structurées d'un modèle local peuvent dépasser 30 s,
  // surtout au premier chargement sur un GPU portable. Le délai reste
  // configurable et s'aligne par défaut sur le timeout LLM du backend.
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 300000),
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg = error.response?.data?.detail || "Erreur inattendue"
    if (error.response?.status === 401) {
      localStorage.clear()
      window.location.href = "/login"
    } else if (error.response?.status >= 500) {
      toast.error(`Erreur serveur : ${msg}`)
    }
    return Promise.reject(error)
  }
)

export default api
