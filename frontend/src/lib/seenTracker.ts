const STORAGE_KEY = "tender_status_seen"

type SeenMap = Record<number, string>

function readSeen(): SeenMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  } catch {
    return {}
  }
}

function writeSeen(map: SeenMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

const NOTIFIABLE_STATUSES = ["Extraction des exigences terminée", "Erreur"]

/** Tenders dont le statut final (terminé/erreur) n'a pas encore été vu par l'utilisateur. */
export function getNewlyChangedTenders(
  tenders: { id: number; status_name: string | null }[]
): { id: number; status_name: string | null }[] {
  const seen = readSeen()
  return tenders.filter(
    (t) => t.status_name && NOTIFIABLE_STATUSES.includes(t.status_name) && seen[t.id] !== t.status_name
  )
}

export function markTendersSeen(tenders: { id: number; status_name: string | null }[]) {
  const seen = readSeen()
  tenders.forEach((t) => {
    if (t.status_name) seen[t.id] = t.status_name
  })
  writeSeen(seen)
}