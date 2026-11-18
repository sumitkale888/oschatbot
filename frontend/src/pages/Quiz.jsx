import { useMemo, useState } from 'react'
import { Check, ChevronRight, RotateCcw, Sparkles, X } from 'lucide-react'
import { quizApi } from '../services/api'

export default function Quiz({ toast }) {
  const [topic, setTopic] = useState('Operating Systems')
  const [count, setCount] = useState(5)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    setSubmitted(false)
    setAnswers({})
    try {
      const result = await quizApi.generate(topic.trim(), count)
      const nextQuestions = (result.questions || []).map(item => ({
        ...item,
        options: (item.options || []).map(option => (
          typeof option === 'string' ? option : option?.text || String(option)
        )).filter(Boolean),
      })).filter(item => item.question && item.options.length >= 2)
      setQuestions(nextQuestions)
      if (!nextQuestions.length) throw new Error('The quiz API returned no usable questions')
      if (result.warning) toast(`${result.warning}. Showing sample questions instead.`, 'error')
      else toast(`Quiz ready — ${nextQuestions.length} questions`)
    } catch (error) {
      toast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const score = useMemo(() =>
    questions.reduce((total, question, index) => total + (answers[index] === question.answer ? 1 : 0), 0),
  [answers, questions])

  const submit = () => {
    setSubmitted(true)
    const attempts = Number(localStorage.getItem('kernelmate_quiz_attempts') || 0) + 1
    localStorage.setItem('kernelmate_quiz_attempts', String(attempts))
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">Practice</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">Quiz Studio</h1>
      </div>

      <div className="rounded-3xl border border-charcoal/[0.07] bg-white/70 p-4 shadow-[0_8px_30px_rgba(73,62,45,0.04)] md:flex md:items-end md:gap-3">
        <label className="block flex-1">
          <span className="mb-2 block text-xs font-semibold text-charcoal/55">Topic</span>
          <input value={topic} onChange={e => setTopic(e.target.value)} className="h-11 w-full rounded-xl border border-charcoal/10 bg-ivory px-3 text-sm outline-none focus:border-terracotta/40" />
        </label>
        <label className="mt-3 block md:mt-0">
          <span className="mb-2 block text-xs font-semibold text-charcoal/55">Questions</span>
          <select value={count} onChange={e => setCount(Number(e.target.value))} className="h-11 w-full rounded-xl border border-charcoal/10 bg-ivory px-3 text-sm outline-none md:w-28">
            {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button onClick={generate} disabled={loading || topic.trim().length < 2} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-terracotta px-5 text-sm font-semibold text-white hover:bg-[#b85e43] disabled:opacity-50 md:mt-0 md:w-auto">
          {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Generating...' : 'Generate quiz'}
        </button>
      </div>

      {loading && (
        <div className="mt-6 space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-3xl border border-charcoal/[0.07] p-5">
              <div className="h-4 w-3/4 animate-pulse rounded bg-charcoal/[0.07]" />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">{[0, 1, 2, 3].map(j => <div key={j} className="h-12 animate-pulse rounded-xl bg-charcoal/[0.04]" />)}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && questions.length === 0 && (
        <div className="mt-10 rounded-3xl border border-dashed border-charcoal/10 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sage/20 text-[#71836A]"><Sparkles className="h-5 w-5" /></div>
          <h2 className="mt-4 font-serif text-xl font-semibold">Ready for a knowledge check?</h2>
          <p className="mt-2 text-sm text-charcoal/45">Choose a topic and generate your first quiz.</p>
        </div>
      )}

      {!loading && submitted && (
        <div className="mt-6 flex items-center justify-between rounded-3xl bg-charcoal px-5 py-4 text-white">
          <div><p className="text-xs text-white/50">Your score</p><p className="mt-1 font-serif text-2xl font-semibold">{score} / {questions.length}</p></div>
          <button onClick={() => { setSubmitted(false); setAnswers({}) }} className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/10"><RotateCcw className="h-3.5 w-3.5" />Try again</button>
        </div>
      )}

      {!loading && questions.length > 0 && (
        <div className="mt-6 space-y-4">
          {questions.map((question, index) => (
            <section key={index} className="rounded-3xl border border-charcoal/[0.07] bg-white/70 p-5 md:p-6">
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-terracotta/10 text-xs font-bold text-terracotta">{index + 1}</span>
                <h2 className="text-sm font-semibold leading-6 md:text-base">{question.question}</h2>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {question.options.map(option => {
                  const selected = answers[index] === option
                  const correct = submitted && option === question.answer
                  const wrong = submitted && selected && option !== question.answer
                  return (
                    <button
                      key={option}
                      onClick={() => !submitted && setAnswers(values => ({ ...values, [index]: option }))}
                      disabled={submitted}
                      className={`flex min-h-12 items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        correct ? 'border-sage bg-sage/15 text-charcoal' :
                        wrong ? 'border-terracotta/40 bg-terracotta/10 text-charcoal' :
                        selected ? 'border-terracotta/50 bg-terracotta/[0.07]' :
                        'border-charcoal/[0.08] hover:border-charcoal/20 hover:bg-ivory'
                      }`}
                    >
                      <span>{option}</span>
                      {correct && <Check className="h-4 w-4 shrink-0 text-[#71836A]" />}
                      {wrong && <X className="h-4 w-4 shrink-0 text-terracotta" />}
                    </button>
                  )
                })}
              </div>
              {submitted && <p className="mt-4 rounded-xl bg-ivory px-3 py-2.5 text-xs leading-5 text-charcoal/60"><strong className="text-charcoal">Explanation:</strong> {question.explanation}</p>}
            </section>
          ))}
          {!submitted && (
            <button onClick={submit} disabled={Object.keys(answers).length !== questions.length} className="ml-auto flex h-11 items-center gap-2 rounded-xl bg-charcoal px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30">
              Submit answers <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
