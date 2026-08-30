import { beforeEach, describe, expect, it, vi } from "vitest"

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock("../src/api/client", () => ({ default: apiMock }))

import { suppliersApi } from "../src/api/suppliers"
import { tendersApi } from "../src/api/tenders"

describe("contrats HTTP front-end", () => {
  beforeEach(() => vi.clearAllMocks())

  it("utilise les routes d'appels d'offres attendues par FastAPI", async () => {
    apiMock.get.mockResolvedValue({ data: { total: 0, tenders: [] } })
    apiMock.post.mockResolvedValue({ data: { success: true } })
    apiMock.patch.mockResolvedValue({ data: { id: 28 } })

    await tendersApi.list()
    await tendersApi.manual({ tender_code: "28/2026", designation: "Matériel", nom_client: "Client" })
    await tendersApi.process(28)
    await tendersApi.getMetadata(28)
    await tendersApi.updateMetadata(28, { code: "28/2026", designation: "Matériel", nom_client: null })
    await tendersApi.delete(28)

    expect(apiMock.get).toHaveBeenCalledWith("/api/tenders")
    expect(apiMock.post).toHaveBeenCalledWith("/api/tenders/28/process")
    expect(apiMock.get).toHaveBeenCalledWith("/api/tenders/28/metadata")
    expect(apiMock.patch).toHaveBeenCalledWith("/api/tenders/28/metadata", expect.any(Object))
    expect(apiMock.delete).toHaveBeenCalledWith("/api/tenders/28")
  })

  it("utilise les routes CRUD fournisseurs attendues par FastAPI", async () => {
    apiMock.get.mockResolvedValue({ data: { total: 0, suppliers: [] } })
    apiMock.post.mockResolvedValue({ data: { id: 1 } })
    apiMock.put.mockResolvedValue({ data: { id: 1 } })

    await suppliersApi.list()
    await suppliersApi.getsupplier(1)
    await suppliersApi.create({ company_name: "Atlas IT", email: "contact@example.test" })
    await suppliersApi.update(1, { company_name: "Atlas IT", email: "achats@example.test" })
    await suppliersApi.delete(1)

    expect(apiMock.get).toHaveBeenCalledWith("/api/suppliers")
    expect(apiMock.get).toHaveBeenCalledWith("/api/suppliers/1")
    expect(apiMock.post).toHaveBeenCalledWith("/api/suppliers", expect.any(Object))
    expect(apiMock.put).toHaveBeenCalledWith("/api/suppliers/1", expect.any(Object))
    expect(apiMock.delete).toHaveBeenCalledWith("/api/suppliers/1")
  })
})
