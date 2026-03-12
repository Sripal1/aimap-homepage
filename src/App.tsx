import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { MapHistoryProvider } from '@/contexts/MapHistoryContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import HomePage from '@/pages/HomePage'
import CreatePage from '@/pages/CreatePage'
import DocsPage from '@/pages/DocsPage'
import ProgressPage from '@/pages/ProgressPage'
import DashboardPage from '@/pages/DashboardPage'

function App() {
  return (
    <AuthProvider>
      <MapHistoryProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/create" element={<CreatePage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/progress/:owner/:repo" element={<ProgressPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </MapHistoryProvider>
    </AuthProvider>
  )
}

export default App
