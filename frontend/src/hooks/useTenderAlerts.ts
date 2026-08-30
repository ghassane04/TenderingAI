import { useQuery, useQueries } from "@tanstack/react-query"
import { tendersApi } from "../api/tenders"
import { tslApi } from "../api/tender_supplier_lots"

const STALE_DAYS = 3
const MAX_TENDERS_SCANNED = 15 // borne le coût : seuls les N tenders "terminés" les plus récents sont scannés

export interface TenderAlert {
  id: string
  tenderId: number
  label: string
  message: string
  type: "ready_not_sent" | "stale_no_response" | "send_error"
}

export function useTenderAlerts() {
  const { data: tendersData, dataUpdatedAt: tendersUpdatedAt } = useQuery({
    queryKey: ["tenders"],
    queryFn: tendersApi.list,
    staleTime: 1000 * 60,
  })

  const activeTenders = (tendersData?.tenders ?? [])
    .filter((t) => t.status_name === "Extraction des exigences terminée")
    .slice(0, MAX_TENDERS_SCANNED)

  const tslQueries = useQueries({
    queries: activeTenders.map((t) => ({
      queryKey: ["tender", t.id, "suppliers-overview"],
      queryFn: () => tslApi.getTsl(t.id),
      staleTime: 1000 * 60 * 2,
    })),
  })

  const alerts: TenderAlert[] = []
  const now = Math.max(tendersUpdatedAt, ...tslQueries.map((query) => query.dataUpdatedAt))

  activeTenders.forEach((tender, idx) => {
    const items = tslQueries[idx]?.data ?? []
    const label = tender.designation || tender.code || `Tender #${tender.id}`

    items.forEach((tsl) => {
      if (tsl.status_id === 1 && tsl.pdf_exists) {
        alerts.push({
          id: `ready-${tsl.tsl_id}`, tenderId: tender.id, label, type: "ready_not_sent",
          message: `${tsl.supplier_name} (${tsl.lot_name}) — PDF prêt, non envoyé`,
        })
      }
      if (tsl.status_id === 2 && tsl.email_sent_at) {
        const days = Math.floor((now - new Date(tsl.email_sent_at).getTime()) / 86_400_000)
        if (days >= STALE_DAYS) {
          alerts.push({
            id: `stale-${tsl.tsl_id}`, tenderId: tender.id, label, type: "stale_no_response",
            message: `${tsl.supplier_name} (${tsl.lot_name}) — envoyé il y a ${days} j, sans réponse`,
          })
        }
      }
      if (tsl.status_id === 4) {
        alerts.push({
          id: `senderr-${tsl.tsl_id}`, tenderId: tender.id, label, type: "send_error",
          message: `${tsl.supplier_name} (${tsl.lot_name}) — erreur d'envoi`,
        })
      }
    })
  })

  return {
    alerts,
    isLoading: tslQueries.some((q) => q.isLoading),
    scannedCount: activeTenders.length,
  }
}
