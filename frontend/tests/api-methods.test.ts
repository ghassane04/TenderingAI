import { beforeEach, describe, expect, it, vi } from "vitest"

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock("../src/api/client", () => ({ default: apiMock }))

import { authApi } from "../src/api/auth"
import { comparisonApi } from "../src/api/compare"
import { dashboardApi } from "../src/api/dashboard"
import { datasheetsApi } from "../src/api/datasheets"
import { documentApi } from "../src/api/document"
import { emailsApi } from "../src/api/emails"
import { pdfApi } from "../src/api/pdf"
import { productsApi } from "../src/api/products"
import { supplierProductsApi } from "../src/api/supplier-products"
import { technicalLotsApi } from "../src/api/technical-lots"
import { tslApi } from "../src/api/tender_supplier_lots"
import { tendersApi } from "../src/api/tenders"
import { usersApi } from "../src/api/users"

describe("méthodes des clients API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.get.mockResolvedValue({ data: {} })
    apiMock.post.mockResolvedValue({ data: {} })
    apiMock.put.mockResolvedValue({ data: {} })
    apiMock.patch.mockResolvedValue({ data: {} })
    apiMock.delete.mockResolvedValue({ data: {} })
  })

  it("couvre l'authentification et le tableau de bord", async () => {
    await authApi.login({ username: "acheteur", password: "secret" })
    await authApi.logout()

    apiMock.get.mockImplementation(async (url: string) => ({
      data: url === "/api/tenders"
        ? { total: 2, tenders: [
            { status_name: "Extraction des exigences terminée" },
            { status_name: "Extraction des exigences en cours" },
          ] }
        : { total: 3 },
    }))
    const stats = await dashboardApi.getStats()
    expect(stats).toMatchObject({ total_tenders: 2, tenders_termines: 1, tenders_en_cours: 1 })
  })

  it("couvre les opérations de comparaison et de fiches fournisseurs", async () => {
    await comparisonApi.runComparison(4)
    await comparisonApi.correctComparison(4, [{ requirement_id: 1, characteristic_ids: [2], evaluation: 1 }])
    await comparisonApi.getTenderLotRankings(28)
    await comparisonApi.getProductComparison(4)

    await datasheetsApi.listByTender(28)
    await datasheetsApi.getDetail(5)
    await datasheetsApi.getFileBlob(5)
    await datasheetsApi.extractDatasheet(5)
    await datasheetsApi.runSemanticMatch(5, 28, 1)
    await datasheetsApi.getCandidates(9)
    await datasheetsApi.confirmProduct(9, 1)

    await supplierProductsApi.getProductsByDatasheet(5)
    await supplierProductsApi.getById(9)
    await supplierProductsApi.addProduct(5, { designation: "PC" })
    await supplierProductsApi.addCharacteristic(9, { technical_data: "RAM", value: "16 Go" })
    await supplierProductsApi.updateProduct(9, { designation: "PC SFF", product_id: 1 })
    await supplierProductsApi.updateCharacteristic(12, { technical_data: "RAM", value: "32 Go", requirement_id: 2 })
    await supplierProductsApi.deleteProduct(9)
    await supplierProductsApi.deleteCharacteristic(12)
  })

  it("couvre les documents, PDF et emails", async () => {
    const file = new File(["contenu"], "exemple.txt", { type: "text/plain" })
    await documentApi.getDocuments(28)
    await documentApi.getDocumentDetail(2)
    await documentApi.uploadDocument(28, [file])
    await documentApi.getFileBlob(2)
    await documentApi.reprocessDocument(2)
    await documentApi.deleteDocument(2)

    await pdfApi.getPdfs(28)
    await pdfApi.generatePdfs(28)
    await pdfApi.generateLotPdf(28, 1)
    await pdfApi.downloadPdf(3)

    await emailsApi.getemails(28)
    await emailsApi.getPreview(7)
    await emailsApi.getHistory(7)
    await emailsApi.sendEmail(7, "Objet", "Corps")
    await emailsApi.checkemails()
    await emailsApi.deleteLog(8)
  })

  it("couvre les produits, lots, associations et utilisateurs", async () => {
    await productsApi.geProducts(28)
    await productsApi.addProduct(28, { designation: "Scanner", technical_lot_id: 1 })
    await productsApi.addRequirement(3, { requirement: "RAM", operateur: "Minimum", value: "16 Go" })
    await productsApi.updateProduct(3, { designation: "Scanner A4", technical_lot_id: 1 })
    await productsApi.updateRequirement(4, { requirement: "RAM", operateur: "Minimum", value: "32 Go" })
    await productsApi.delete(3)
    await productsApi.deleteRequirement(4)

    await technicalLotsApi.list()
    await technicalLotsApi.getlot(1)
    await technicalLotsApi.create({ name: "Informatique" })
    await technicalLotsApi.update(1, { name: "Infrastructure" })
    await technicalLotsApi.delete(1)

    await tslApi.getTsl(28)
    await tslApi.createTsl(28, 2, 1)
    await tslApi.getTslDetail(6)
    await tslApi.deleteTsl(6)

    await usersApi.list()
    await usersApi.create({ last_name: "Test", first_name: "Agent", email: "agent@example.test", username: "agent", password: "secret", roles: ["ROLE_ACHETEUR"] })
    await usersApi.getuser(1)
    await usersApi.update(1, { first_name: "Acheteur" })
    await usersApi.delete(1)
  })

  it("couvre l'initialisation multipart d'un appel d'offres", async () => {
    const file = new File(["CPS"], "cps.txt", { type: "text/plain" })
    await tendersApi.initialize([file])
    expect(apiMock.post).toHaveBeenCalledWith(
      "/api/tenders/initialize",
      expect.any(FormData),
      expect.objectContaining({ timeout: 120_000 }),
    )
  })
})
