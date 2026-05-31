import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import CandidatesPage from './pages/Candidates'
import CandidateDetailPage from './pages/CandidateDetail'
import NewCandidatePage from './pages/NewCandidate'
import IntakePage from './pages/Intake'
import PortalPage from './pages/Portal'
import CommunicationsPage from './pages/Communications'
import DocumentsPage from './pages/Documents'
import FinancesPage from './pages/Finances'
import BundeslandPage from './pages/Bundesland'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/bewerber" element={<IntakePage />} />
      <Route path="/portal/:candidateId/:token" element={<PortalPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="candidates/new" element={<NewCandidatePage />} />
        <Route path="candidates/:id" element={<CandidateDetailPage />} />
        <Route path="communications" element={<CommunicationsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="finances" element={<FinancesPage />} />
        <Route path="bundesland" element={<BundeslandPage />} />
      </Route>
    </Routes>
  )
}
