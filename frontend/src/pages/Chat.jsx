import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowUp, BookOpen, RotateCcw, Sparkles } from 'lucide-react'
import { chatApi, historyApi } from '../services/api'

const suggestions = [
  'Explain the difference between process and thread',
  'How does virtual memory work?',
  'What happens during a context switch?',
  'List the main CPU scheduling algorithms',
]

function TypingDots() {
  return (
    <div className="flex gap-1 px-1 py-2" aria-label="KernelMate is typing">
      {[0, 1, 2].map(i => (
        <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-terracotta/60" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  )
}

export default function Chat({ toast }) {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [activeId, setActiveId] = useState(conversationId ? Number(conversationId) : null)
  const bottomRef = useRef(null)
  const skipHistoryLoad = useRef(false)

  useEffect(() => {
    const nextId = conversationId ? Number(conversationId) : null
    setActiveId(Number.isFinite(nextId) ? nextId : null)

    if (!conversationId) {
      if (!skipHistoryLoad.current) setMessages([])
      skipHistoryLoad.current = false
      return
    }

    if (skipHistoryLoad.current) {
      skipHistoryLoad.current = false
      return
    }

    const load = async () => {
      setLoadingHistory(true)
      try {
        const conversation = await historyApi.get(Number(conversationId))
        setMessages(conversation.messages || [])
      } catch (error) {
        toast(error.message, 'error')
      } finally {
        setLoadingHistory(false)
      }
    }
    load()
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text = question) => {
    const clean = text.trim()
    if (!clean || loading) return
    setQuestion('')
    setMessages(items => [...items, { role: 'user', content: clean, created_at: new Date().toISOString() }])
    setLoading(true)
    try {
      const result = await chatApi.send(clean, Number.isFinite(activeId) ? activeId : null)
      setActiveId(result.conversation_id)
      setMessages(items => [...items, {
        role: 'assistant',
        content: result.answer,
        sources: result.sources || [],
        created_at: new Date().toISOString(),
      }])
      if (!conversationId && result.conversation_id) {
        skipHistoryLoad.current = true
        navigate(`/chat/${result.conversation_id}`, { replace: true })
      }
    } catch (error) {
      setMessages(items => [...items, {
        role: 'assistant',
        content: `I could not answer that just now. ${error.message}`,
        created_at: new Date().toISOString(),
      }])
      toast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  const reset = () => {
    setMessages([])
    setQuestion('')
    setActiveId(null)
    navigate('/chat')
  }

  if (loadingHistory) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="h-16 animate-pulse rounded-2xl bg-charcoal/[0.06]" />
        <div className="mt-6 h-28 animate-pulse rounded-3xl bg-charcoal/[0.04]" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col lg:h-screen">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-charcoal/[0.06] px-5 md:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta">Operating systems</p>
          <h1 className="font-serif text-lg font-semibold text-charcoal">Study assistant</h1>
        </div>
        {messages.length > 0 && (
          <button onClick={reset} className="flex items-center gap-2 rounded-xl border border-charcoal/10 bg-white px-3 py-2 text-xs font-semibold hover:border-terracotta/30">
            <RotateCcw className="h-3.5 w-3.5" /> New chat
          </button>
        )}
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-5 py-10 md:px-10">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="max-w-xl font-serif text-4xl font-semibold leading-[1.12] tracking-tight md:text-5xl">
              What would you like to understand?
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-charcoal/55 md:text-base">
              Ask about processes, memory, scheduling, file systems, or any topic in your study documents.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {suggestions.map(item => (
                <button
                  key={item}
                  onClick={() => send(item)}
                  className="group rounded-2xl border border-charcoal/[0.08] bg-white/70 p-4 text-left text-sm leading-5 text-charcoal/70 shadow-[0_4px_20px_rgba(73,62,45,0.03)] transition hover:-translate-y-0.5 hover:border-terracotta/25 hover:shadow-soft"
                >
                  {item}
                  <ArrowUp className="ml-auto mt-3 h-4 w-4 rotate-45 text-charcoal/25 transition group-hover:text-terracotta" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-7 px-5 py-8 md:px-8">
            {messages.map((message, index) => (
              <div key={`${message.id || index}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={message.role === 'user'
                  ? 'max-w-[85%] rounded-[22px] rounded-br-md bg-charcoal px-5 py-3.5 text-sm leading-6 text-white md:max-w-[70%]'
                  : 'w-full max-w-[92%]'}>
                  {message.role === 'assistant' ? (
                    <>
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-terracotta">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-terracotta/10">K</span>
                        KernelMate
                      </div>
                      <article className="markdown prose prose-sm max-w-none leading-7 text-charcoal/80">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </article>
                      {message.sources?.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {message.sources.map((source, i) => (
                            <div key={`${source.source}-${source.page}-${i}`} title={source.excerpt} className="flex items-center gap-1.5 rounded-lg border border-sage/30 bg-sage/10 px-2.5 py-1.5 text-xs text-charcoal/60">
                              <BookOpen className="h-3 w-3 text-sage" />
                              {source.source} · p. {source.page}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-terracotta/10 text-xs font-bold text-terracotta">K</span>
                <TypingDots />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2 md:px-8">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[22px] border border-charcoal/10 bg-white p-2 shadow-soft focus-within:border-terracotta/35">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={2000}
            placeholder="Ask an Operating Systems question..."
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-5 outline-none placeholder:text-charcoal/35"
          />
          <button
            onClick={() => send()}
            disabled={!question.trim() || loading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-terracotta text-white transition hover:bg-[#b85e43] disabled:cursor-not-allowed disabled:bg-charcoal/10 disabled:text-charcoal/30"
            aria-label="Send question"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-charcoal/35">KernelMate can make mistakes. Verify important concepts.</p>
      </div>
    </div>
  )
}
