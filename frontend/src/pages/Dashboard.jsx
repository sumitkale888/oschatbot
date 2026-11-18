import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FileText, MessageCircle, Trophy } from 'lucide-react'
import { historyApi, pdfApi } from '../services/api'

export default function Dashboard({ toast }) {
  const [history, setHistory] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([historyApi.list(), pdfApi.list()])
      .then(([conversations, pdfs]) => {
        setHistory(conversations)
        setDocuments(pdfs)
      })
      .catch(error => toast(error.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const quizAttempts = Number(localStorage.getItem('kernelmate_quiz_attempts') || 0)
  const cards = [
    { label: 'Conversations', value: history.length, icon: MessageCircle, link: '/chat', tone: 'bg-terracotta/10 text-terracotta' },
    { label: 'Documents', value: documents.length, icon: FileText, link: '/knowledge', tone: 'bg-sage/20 text-[#71836A]' },
    { label: 'Quizzes attempted', value: quizAttempts, icon: Trophy, link: '/quiz', tone: 'bg-[#EBDCC3] text-[#946C3D]' },
  ]

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">Study overview</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">Welcome back</h1>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map(i => <div key={i} className="h-32 animate-pulse rounded-3xl bg-charcoal/[0.06]" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {cards.map(({ label, value, icon: Icon, link, tone }) => (
              <Link key={label} to={link} className="group rounded-3xl border border-charcoal/[0.07] bg-white/70 p-5 shadow-[0_8px_30px_rgba(73,62,45,0.04)] transition hover:-translate-y-1 hover:shadow-soft">
                <div className="flex items-center justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></div>
                  <ArrowRight className="h-4 w-4 text-charcoal/20 transition group-hover:translate-x-1 group-hover:text-terracotta" />
                </div>
                <p className="mt-5 font-serif text-3xl font-semibold">{value}</p>
                <p className="mt-1 text-sm text-charcoal/50">{label}</p>
              </Link>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-3xl border border-charcoal/[0.07] bg-white/70 p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold">Recent conversations</h2>
                <Link to="/chat" className="text-xs font-semibold text-terracotta">Open chat</Link>
              </div>
              {history.length ? (
                <div className="space-y-2">
                  {history.slice(0, 5).map(item => (
                    <Link key={item.id} to={`/chat/${item.id}`} className="flex items-center justify-between rounded-2xl px-3 py-3 hover:bg-ivory">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="mt-1 text-xs text-charcoal/40">{item.messages?.length || 0} messages</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-charcoal/25" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-charcoal/10 py-10 text-center">
                  <p className="text-sm text-charcoal/45">Start your first Operating Systems conversation.</p>
                  <Link to="/chat" className="mt-3 inline-block text-sm font-semibold text-terracotta">Ask KernelMate</Link>
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-charcoal p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sage">Daily study</p>
              <h2 className="mt-3 font-serif text-2xl font-semibold">Test what you know</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">Create a short quiz from your knowledge documents.</p>
              <Link to="/quiz" className="mt-6 flex h-11 items-center justify-center rounded-xl bg-terracotta text-sm font-semibold transition hover:bg-[#d17a5c]">
                Generate quiz
              </Link>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
