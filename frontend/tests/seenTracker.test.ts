import { beforeEach, describe, expect, it } from "vitest"
import { getNewlyChangedTenders, markTendersSeen } from "../src/lib/seenTracker"

describe("seenTracker", () => {
  beforeEach(() => localStorage.clear())

  it("signale uniquement les appels d'offres terminés ou en erreur", () => {
    const changed = getNewlyChangedTenders([
      { id: 1, status_name: "Extraction des exigences terminée" },
      { id: 2, status_name: "Erreur" },
      { id: 3, status_name: "Extraction des exigences en cours" },
      { id: 4, status_name: null },
    ])

    expect(changed.map((tender) => tender.id)).toEqual([1, 2])
  })

  it("ne signale plus un statut déjà vu", () => {
    const tenders = [{ id: 28, status_name: "Erreur" }]
    markTendersSeen(tenders)
    expect(getNewlyChangedTenders(tenders)).toEqual([])
  })

  it("signale de nouveau un appel d'offres si son statut final change", () => {
    markTendersSeen([{ id: 28, status_name: "Erreur" }])
    expect(getNewlyChangedTenders([
      { id: 28, status_name: "Extraction des exigences terminée" },
    ])).toHaveLength(1)
  })

  it("tolère une valeur localStorage corrompue", () => {
    localStorage.setItem("tender_status_seen", "{invalide")
    expect(getNewlyChangedTenders([{ id: 5, status_name: "Erreur" }])).toHaveLength(1)
  })
})
