import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
}

// ─── Candidates ─────────────────────────────────────────────────────────────
export const candidatesApi = {
  list: (params?: Record<string, string>) =>
    api.get('/candidates', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/candidates/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/candidates', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/candidates/${id}`, data).then((r) => r.data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/candidates/${id}/status`, { status, notes }).then((r) => r.data),
  priority: (id: string) => api.get(`/candidates/${id}/priority`).then((r) => r.data),
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get('/dashboard').then((r) => r.data),
}

// ─── Bundesland ─────────────────────────────────────────────────────────────
export const bundeslandApi = {
  list: () => api.get('/bundesland').then((r) => r.data),
  get: (id: string) => api.get(`/bundesland/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/bundesland', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/bundesland/${id}`, data).then((r) => r.data),
}

// ─── Documents ──────────────────────────────────────────────────────────────
export const documentsApi = {
  list: (candidateId?: string) =>
    api.get('/documents', { params: candidateId ? { candidateId } : {} }).then((r) => r.data),
  create: (data: any) => api.post('/documents', data).then((r) => r.data),
  delete: (id: string) => api.delete(`/documents/${id}`),
  checklist: (candidateId: string) =>
    api.get(`/documents/checklist/${candidateId}`).then((r) => r.data),
  updateChecklist: (id: string, data: any) =>
    api.patch(`/documents/checklist/${id}`, data).then((r) => r.data),
}

// ─── Communications ─────────────────────────────────────────────────────────
export const communicationsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/communications', { params }).then((r) => r.data),
  templates: () => api.get('/communications/templates').then((r) => r.data),
  render: (templateId: string, candidateId: string) =>
    api.post('/communications/render', { templateId, candidateId }).then((r) => r.data),
  create: (data: any) => api.post('/communications', data).then((r) => r.data),
  submit: (id: string) => api.patch(`/communications/${id}/submit`).then((r) => r.data),
  approve: (id: string) => api.patch(`/communications/${id}/approve`).then((r) => r.data),
  reject: (id: string) => api.patch(`/communications/${id}/reject`).then((r) => r.data),
}

// ─── Tasks ──────────────────────────────────────────────────────────────────
export const tasksApi = {
  list: (params?: Record<string, string | undefined>) =>
    api.get('/tasks', { params }).then((r) => r.data),
  create: (data: any) => api.post('/tasks', data).then((r) => r.data),
  complete: (id: string) => api.patch(`/tasks/${id}/complete`).then((r) => r.data),
  snooze: (id: string, days: number) =>
    api.patch(`/tasks/${id}/snooze`, { days }).then((r) => r.data),
  cancel: (id: string) => api.delete(`/tasks/${id}`),
}

// ─── Anton / Paula / Max ────────────────────────────────────────────────────
export const antonApi = {
  generate: (candidateId: string) =>
    api.post(`/anton/${candidateId}/generate`).then((r) => r.data),
  getPackage: (candidateId: string) =>
    api.get(`/anton/${candidateId}/package`).then((r) => r.data),
  approve: (candidateId: string, taskId?: string) =>
    api.post(`/anton/${candidateId}/approve`, { taskId }).then((r) => r.data),
  nextCheck: (candidateId: string, checkNumber: number, outcome?: string) =>
    api.post(`/anton/${candidateId}/next-check`, { checkNumber, outcome }).then((r) => r.data),
}

// ─── Portal ─────────────────────────────────────────────────────────────────
export const portalApi = {
  getToken: (candidateId: string) =>
    api.get(`/portal/token/${candidateId}`).then((r) => r.data),
}

// ─── AI Updates ─────────────────────────────────────────────────────────────
export const aiApi = {
  queue: () => api.get('/ai/queue').then((r) => r.data),
  update: (candidateId: string, message: string) =>
    api.post(`/ai/candidates/${candidateId}/update`, { message }).then((r) => r.data),
  confirm: (candidateId: string, data: {
    originalMessage: string
    proposedStatus?: string | null
    proposedWaitingFor?: string | null
    noteToAdd?: string | null
    taskTitle?: string | null
    taskDescription?: string | null
    taskDueDays?: number | null
  }) =>
    api.post(`/ai/candidates/${candidateId}/confirm`, data).then((r) => r.data),
}

// ─── Financials ─────────────────────────────────────────────────────────────
export const financialsApi = {
  list: (candidateId?: string) =>
    api.get('/financials', { params: candidateId ? { candidateId } : {} }).then((r) => r.data),
  summary: () => api.get('/financials/summary').then((r) => r.data),
  create: (data: any) => api.post('/financials', data).then((r) => r.data),
  delete: (id: string) => api.delete(`/financials/${id}`),
}
