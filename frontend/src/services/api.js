import axios from 'axios'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001').replace(/\/$/, '')

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  response => response,
  error => {
    const detail = error.response?.data?.detail
    const message = Array.isArray(detail)
      ? detail.map(item => item.msg).join(', ')
      : typeof detail === 'string'
        ? detail
        : error.message || 'Unable to reach the server'
    return Promise.reject(new Error(message))
  },
)

export const chatApi = {
  send: (question, conversationId = null) =>
    api.post('/api/chat', { question, conversation_id: conversationId }).then(r => r.data),
}

export const historyApi = {
  list: () => api.get('/api/history').then(r => r.data),
  get: id => api.get(`/api/history/${id}`).then(r => r.data),
  delete: id => api.delete(`/api/history/${id}`).then(r => r.data),
  clear: () => api.delete('/api/history').then(r => r.data),
}

export const pdfApi = {
  list: () => api.get('/api/pdfs').then(r => r.data),
  upload: file => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/pdfs/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  reindex: () => api.post('/api/pdfs/reindex').then(r => r.data),
  delete: filename => api.delete(`/api/pdfs/${encodeURIComponent(filename)}`).then(r => r.data),
}

export const quizApi = {
  generate: (topic, count = 5) =>
    api.post('/api/quiz/generate', { topic, count }).then(r => r.data),
}

export const healthApi = {
  get: () => api.get('/api/health').then(r => r.data),
}
