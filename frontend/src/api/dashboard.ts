import api from "./client"

export interface DashboardStats {
  total_tenders: number
  tenders_en_cours: number
  tenders_termines: number
  total_suppliers: number
  total_lots: number
  emails_envoyes: number
  emails_reponses: number
  taux_reponse: number
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const [tenders, suppliers, lots] = await Promise.all([
      api.get("/api/tenders"),
      api.get("/api/suppliers"),
      api.get("/api/technical-lots"),
    ])

    const tList = tenders.data.tenders ?? []
    const termines = tList.filter((t: any) =>
      t.status_name === "Extraction des exigences terminée"
    ).length
    const en_cours = tList.filter((t: any) =>
      t.status_name === "Extraction des exigences en cours"
    ).length

    return {
      total_tenders:    tenders.data.total ?? 0,
      tenders_en_cours: en_cours,
      tenders_termines: termines,
      total_suppliers:  suppliers.data.total ?? 0,
      total_lots:       lots.data.total ?? 0,
      emails_envoyes:   0,
      emails_reponses:  0,
      taux_reponse:     0,
    }
  },
}