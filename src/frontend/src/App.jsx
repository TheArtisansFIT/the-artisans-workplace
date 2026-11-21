import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from './components/layout/AppShell.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import CreateGroupModal from './modals/CreateGroupModal.jsx'
import DebtModal from './modals/DebtModal.jsx'
import ExpenseDetailsModal from './modals/ExpenseDetailsModal.jsx'
import ExpenseFormModal from './modals/ExpenseFormModal.jsx'
import GroupOverviewPage from './pages/GroupOverviewPage.jsx'
import GroupsPage from './pages/GroupsPage.jsx'
import JoinGroupPage from './pages/JoinGroupPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'

function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, hash])

  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/groups" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/join/:inviteToken" element={<JoinGroupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/groups" element={<GroupsPage />}>
              <Route path="new" element={<CreateGroupModal />} />
            </Route>

            <Route path="/groups/:groupId" element={<GroupOverviewPage />}>
              <Route path="expenses/new" element={<ExpenseFormModal />} />
              <Route path="expenses/:expenseId" element={<ExpenseDetailsModal />} />
              <Route path="expenses/:expenseId/edit" element={<ExpenseFormModal />} />
              <Route path="debts/:debtId" element={<DebtModal />} />
            </Route>

            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}
