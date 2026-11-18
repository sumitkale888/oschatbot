import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ToastContainer from './components/ToastContainer'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Quiz from './pages/Quiz'
import KnowledgeBase from './pages/KnowledgeBase'

export default function App() {
  const [toasts, setToasts] = useState([])

  const toast = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(items => [...items, { id, message, type }])
  }

  useEffect(() => {
    if (!toasts.length) return
    const timer = setTimeout(() => setToasts(items => items.slice(1)), 4200)
    return () => clearTimeout(timer)
  }, [toasts])

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/dashboard" element={<Dashboard toast={toast} />} />
          <Route path="/chat/:conversationId?" element={<Chat toast={toast} />} />
          <Route path="/quiz" element={<Quiz toast={toast} />} />
          <Route path="/knowledge" element={<KnowledgeBase toast={toast} />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </Layout>
      <ToastContainer toasts={toasts} dismiss={id => setToasts(items => items.filter(t => t.id !== id))} />
    </>
  )
}
