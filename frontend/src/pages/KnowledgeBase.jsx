import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, FileText, RefreshCw, Trash2, Upload } from 'lucide-react'
import { pdfApi } from '../services/api'

function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`
}

export default function KnowledgeBase({ toast }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const inputRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try { setDocuments(await pdfApi.list()) }
    catch (error) { toast(error.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const upload = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast('Please select a PDF file', 'error')
      event.target.value = ''
      return
    }
    setUploading(true)
    try {
      const document = await pdfApi.upload(file)
      setDocuments(items => [...items.filter(item => item.filename !== document.filename), document])
      toast(`${document.filename} uploaded and indexed`)
    } catch (error) {
      toast(error.message, 'error')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const remove = async filename => {
    try {
      await pdfApi.delete(filename)
      setDocuments(items => items.filter(item => item.filename !== filename))
      toast(`${filename} deleted`)
    } catch (error) {
      toast(error.message, 'error')
    }
  }

  const reindex = async () => {
    setReindexing(true)
    try {
      await pdfApi.reindex()
      await load()
      toast('Knowledge base re-indexed')
    } catch (error) {
      toast(error.message, 'error')
    } finally {
      setReindexing(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">Library</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">Knowledge Base</h1>
        </div>
        <button onClick={reindex} disabled={reindexing} className="flex h-10 items-center gap-2 rounded-xl border border-charcoal/10 bg-white px-3 text-xs font-semibold hover:border-sage/50 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${reindexing ? 'animate-spin' : ''}`} />
          {reindexing ? 'Re-indexing...' : 'Re-index'}
        </button>
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group flex w-full items-center justify-center rounded-3xl border border-dashed border-terracotta/30 bg-terracotta/[0.035] px-5 py-10 transition hover:border-terracotta/60 hover:bg-terracotta/[0.06]"
      >
        <input ref={inputRef} type="file" accept=".pdf,application/pdf" onChange={upload} className="hidden" />
        <div className="flex items-center gap-4 text-left">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta text-white shadow-sm">
            {uploading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-semibold">{uploading ? 'Uploading and indexing...' : 'Upload a PDF'}</p>
            <p className="mt-1 text-xs text-charcoal/40">PDF only · up to 25 MB</p>
          </div>
        </div>
      </button>

      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold">Documents</h2>
          <span className="text-xs text-charcoal/40">{documents.length} files</span>
        </div>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-charcoal/[0.05]" />)}
          </div>
        ) : documents.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {documents.map(document => (
              <article key={document.filename} className="group flex items-center rounded-2xl border border-charcoal/[0.07] bg-white/70 p-4 transition hover:border-sage/40 hover:shadow-[0_8px_24px_rgba(73,62,45,0.05)]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{document.filename}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-charcoal/40">
                    <span>{formatBytes(document.size_bytes)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-[#71836A]">
                      <CheckCircle2 className="h-3 w-3" />
                      {document.indexed ? 'Indexed' : 'Not indexed'}
                    </span>
                  </div>
                </div>
                <button onClick={() => remove(document.filename)} className="ml-2 rounded-xl p-2 text-charcoal/25 opacity-70 hover:bg-terracotta/10 hover:text-terracotta group-hover:opacity-100" aria-label={`Delete ${document.filename}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-charcoal/10 py-16 text-center">
            <FileText className="mx-auto h-6 w-6 text-charcoal/20" />
            <p className="mt-3 text-sm text-charcoal/45">No PDFs in the knowledge base yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
