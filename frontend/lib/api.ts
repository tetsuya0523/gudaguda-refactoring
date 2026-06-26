const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  extractTasks: (text: string) =>
    post<{ tasks: unknown[]; response: string }>('/api/extract', { text }),

  proposeTasks: (message: string) =>
    post<{ tasks: unknown[]; response: string; message?: string }>('/api/propose', { message }),

  uploadAudio: async (blob: Blob): Promise<{ transcribed_text: string; response: string }> => {
    const form = new FormData()
    form.append('file', blob, 'recording.webm')
    const res = await fetch(`${BASE}/api/audio`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },

  updateTaskStatus: (userId: string, taskId: string, status: 'done' | 'skipped') =>
    post<{ success: boolean }>(`/api/tasks/${userId}/${taskId}`, { status }),

  getCharacterState: (userId = 'demo_user') =>
    fetch(`${BASE}/api/character/${userId}`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<{ state: string; completion_rate: number; pending_count: number; done_count: number }>
    }),
}
