import { CheckCircle2, CircleAlert, X } from 'lucide-react'

export default function ToastContainer({ toasts, dismiss }) {
  return (
    <div className="fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="animate-toast-in flex items-start gap-3 rounded-2xl border border-charcoal/10 bg-white px-4 py-3 shadow-soft"
          role="status"
        >
          {toast.type === 'error'
            ? <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" />
            : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sage" />}
          <p title={toast.message} className="line-clamp-4 min-w-0 flex-1 break-words text-sm font-medium leading-5 text-charcoal">{toast.message}</p>
          <button onClick={() => dismiss(toast.id)} className="text-charcoal/40 hover:text-charcoal" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
