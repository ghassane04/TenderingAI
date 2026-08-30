import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extrait un message d'erreur lisible d'une erreur API (axios) en privilégiant
 * le champ `detail` renvoyé par le backend, avec un repli sur le message fourni.
 */
export function getApiErrorMessage(error: unknown, fallback = "Une erreur est survenue"): string {
  const detail = (error as any)?.response?.data?.detail
  if (typeof detail === "string" && detail.trim()) return detail
  // FastAPI renvoie parfois un tableau d'erreurs de validation
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    if (typeof first?.msg === "string") return first.msg
  }
  const message = (error as any)?.message
  if (typeof message === "string" && message.trim()) return message
  return fallback
}