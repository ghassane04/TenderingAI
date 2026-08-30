import { Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "./store/authStore"
import Layout from "./components/layout/Layout"
import LoginPage from "./pages/auth/LoginPage"
import DashboardPage from "./pages/dashboard/DashboardPage"
import TendersListPage from "./pages/tenders/TendersListPage"
import TenderDetailPage from "./pages/tenders/TenderDetailPage"
import SuppliersPage from "./pages/suppliers/SuppliersPage"
import SupplierDetailPage from "./pages/suppliers/SupplierDetailPage"
import UsersPage from "./pages/settings/UsersPage"
import TechnicalLotsPage from "./pages/settings/TechnicalLotsPage"
import TechnicalLotDetailPage from "./pages/settings/TechnicalLotDetailPage"
import DatasheetDetailPage from "./pages/datasheets/DatasheetDetailPage"
import TenderProductDetailPage from "./pages/tenders/TenderProductDetailPage"
import TenderRequirementDetailPage from "./pages/tenders/TenderRequirementDetailPage"
import TenderDocumentDetails from "./pages/tenders/TenderDocumentDetails"
import ProfilePage from "./pages/settings/ProfilePage"
import TenderEmailHistoryPage from "./pages/tenders/TenderEmailHistoryPage"
import SupplierProductDetailPage from "./pages/datasheets/SupplierProductDetailPage"

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.includes("ROLE_ADMIN")
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route 
          path="settings/users/:id" element={<ProfilePage />}
        />
        <Route path="tenders" element={<TendersListPage />} />
        <Route path="tenders/:id" element={<TenderDetailPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="/tenders/:id/datasheets/:datasheetId" element={<DatasheetDetailPage />} />
        <Route path="tenders/:id/products/:productId" element={<TenderProductDetailPage />} />
        <Route path="tenders/:id/products/:productId/requirements/:requirementId" element={<TenderRequirementDetailPage />}/>
        <Route path="tenders/:id/documents/:documentId" element={<TenderDocumentDetails />} />
        <Route path="/tenders/:id/emails/:tslId" element={<TenderEmailHistoryPage />} />
        <Route path="/tenders/:id/datasheets/:datasheetId/products/:productId" element={<SupplierProductDetailPage />} />
        <Route
          path="settings/users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="settings/lots"
          element={
            <AdminRoute>
              <TechnicalLotsPage />
            </AdminRoute>
          }
        />
        <Route
          path="settings/lots/:id"
          element={
            <AdminRoute>
              <TechnicalLotDetailPage />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}