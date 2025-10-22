import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Dashboard } from '@/components/Dashboard'
import { JobTracker } from '@/components/JobTracker'
import { NetworkTracker } from '@/components/NetworkTracker'
import { DocumentVault } from '@/components/DocumentVault'
import { Settings } from '@/components/Settings'
import { ProfileEditor } from '@/components/ProfileEditor'
import { CoverLetterGenerator } from '@/components/CoverLetterGenerator'
import { Toaster } from '@/components/ui/toaster'
import './App.css'

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (!darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <Router>
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
        <main className={`flex-1 overflow-hidden transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<ProfileEditor />} />
            <Route path="/cover-letter" element={<CoverLetterGenerator />} />
            <Route path="/job-tracker" element={<JobTracker />} />
            <Route path="/network-tracker" element={<NetworkTracker />} />
            <Route path="/documents" element={<DocumentVault />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </Router>
  )
}

export default App

