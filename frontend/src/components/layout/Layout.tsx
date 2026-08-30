import { Outlet, useLocation } from "react-router-dom"
import Sidebar from "./Sidebar"
import Header from "./Header"

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Tableau de bord", subtitle: "Vue d'ensemble de vos appels d'offres" },
  "/tenders": { title: "Appels d'offres", subtitle: "Extraction des produits et exigences par IA" },
  "/suppliers": { title: "Fournisseurs", subtitle: "Carnet d'adresses et propositions reçues" },
  "/settings/users": { title: "Utilisateurs", subtitle: "Gestion des comptes et des rôles" },
  "/settings/lots": { title: "Lots techniques", subtitle: "Configuration des catégories métier" },
}

function resolveMeta(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith("/tenders/")) return { title: "Appel d'offres", subtitle: "Détail, produits extraits et comparatif fournisseurs" }
  if (pathname.startsWith("/datasheets/")) return { title: "Fiche produit", subtitle: "Fiche technique extraite" }
  if (pathname.startsWith("/supplier-products/")) return { title: "Produit fournisseur", subtitle: "Détail de la proposition" }
  return { title: "Tendering IA", subtitle: "" }
}

export default function Layout() {
  const location = useLocation()
  const meta = resolveMeta(location.pathname)

  return (
    <div className="flex min-h-screen bg-[#f0f4f8]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
