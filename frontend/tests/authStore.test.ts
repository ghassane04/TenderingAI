import { beforeEach, describe, expect, it, vi } from "vitest"

describe("authStore", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it("enregistre puis supprime la session utilisateur", async () => {
    const { useAuthStore } = await import("../src/store/authStore")
    const user = {
      user_id: 7,
      full_name: "Acheteur Test",
      roles: ["ROLE_ACHETEUR"],
      access_token: "token-test",
    }

    useAuthStore.getState().login(user)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(localStorage.getItem("access_token")).toBe("token-test")

    useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
    expect(localStorage.getItem("access_token")).toBeNull()
  })

  it("nettoie une session locale corrompue au chargement", async () => {
    localStorage.setItem("auth_user", "{json-invalide")
    localStorage.setItem("access_token", "ancien-token")

    const { useAuthStore } = await import("../src/store/authStore")
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(localStorage.getItem("auth_user")).toBeNull()
    expect(localStorage.getItem("access_token")).toBeNull()
  })
})
