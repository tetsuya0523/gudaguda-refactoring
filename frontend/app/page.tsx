'use client'

import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'

// ---- Types ----

type Tab = 'record' | 'tasks' | 'propose' | 'timeline'
type CharacterState = 'sleeping' | 'normal' | 'happy' | 'angry'

type Task = {
  id: string
  title: string
  category: string
  estimated_minutes: number
  location?: string
  done: boolean
}

type ProposedTask = {
  title: string
  reason?: string
  estimated_minutes?: number
}

type TimelineUser = {
  user_id: string
  display_name: string
  state: CharacterState
  completion_rate: number
  done_count: number
  pending_count: number
}

type Weather = {
  condition: string
  emoji: string
  temperature: number
  is_rainy: boolean
}

// ---- Constants ----

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'メールを返信する',   category: '仕事',   estimated_minutes: 15, done: false },
  { id: '2', title: '企画資料を作成する', category: '仕事',   estimated_minutes: 90, done: false },
  { id: '3', title: 'スーパーで買い物',   category: '買い物', estimated_minutes: 60, location: '駅前', done: false },
  { id: '4', title: '部屋を掃除する',     category: '家事',   estimated_minutes: 45, done: false },
  { id: '5', title: '読みかけの本を読む', category: '学習',   estimated_minutes: 30, done: false },
]

const MOCK_TIMELINE: TimelineUser[] = [
  { user_id: '1',  display_name: 'Aさん',  state: 'happy',   completion_rate: 0.87, done_count: 7, pending_count: 1 },
  { user_id: '2',  display_name: 'Bさん',  state: 'happy',   completion_rate: 0.75, done_count: 6, pending_count: 2 },
  { user_id: 'me', display_name: 'あなた', state: 'normal',  completion_rate: 0.50, done_count: 2, pending_count: 2 },
  { user_id: '3',  display_name: 'Cさん',  state: 'angry',   completion_rate: 0.20, done_count: 1, pending_count: 4 },
  { user_id: '4',  display_name: 'Dさん',  state: 'sleeping', completion_rate: 0.0, done_count: 0, pending_count: 0 },
]

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'record',   label: '入力',        icon: '🎙️' },
  { id: 'tasks',    label: 'タスク',      icon: '📋' },
  { id: 'propose',  label: '提案',        icon: '💡' },
  { id: 'timeline', label: 'タイムライン', icon: '👥' },
]

const CATEGORY_STYLE: Record<string, string> = {
  '仕事':   'text-blue-600 bg-blue-50',
  '買い物': 'text-green-600 bg-green-50',
  '家事':   'text-orange-600 bg-orange-50',
  '学習':   'text-purple-600 bg-purple-50',
  '運動':   'text-teal-600 bg-teal-50',
  '連絡':   'text-pink-600 bg-pink-50',
}

const CHARACTER_META: Record<CharacterState, { label: string; animClass: string; bgFrom: string; bgTo: string }> = {
  sleeping: { label: 'ぐったり中...',       animClass: 'animate-pulse',  bgFrom: 'from-gray-50',   bgTo: 'to-gray-100'  },
  normal:   { label: 'まあまあかな',        animClass: '',               bgFrom: 'from-blue-50',   bgTo: 'to-blue-100'  },
  happy:    { label: '最高の調子！',         animClass: 'animate-bounce', bgFrom: 'from-yellow-50', bgTo: 'to-amber-100' },
  angry:    { label: 'タスクが溜まってる！', animClass: 'animate-shake',  bgFrom: 'from-red-50',    bgTo: 'to-red-100'   },
}

// ---- Helpers ----

function computeCharacterState(tasks: Task[]): CharacterState {
  if (tasks.length === 0) return 'sleeping'
  const done    = tasks.filter((t) => t.done).length
  const pending = tasks.filter((t) => !t.done).length
  const rate    = done / tasks.length
  if (rate >= 0.8) return 'happy'
  if (pending >= 5 || rate < 0.3) return 'angry'
  return 'normal'
}

function getCategoryStyle(cat: string) {
  return CATEGORY_STYLE[cat] ?? 'text-gray-600 bg-gray-100'
}

function formatMinutes(m: number) {
  if (m < 60) return `${m}分`
  const h   = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}時間${rem}分` : `${h}時間`
}

function getTimeLabel() {
  return new Date().toLocaleString('ja-JP', { weekday: 'long', hour: '2-digit', minute: '2-digit' })
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 6)  return '深夜'
  if (h < 12) return '午前'
  if (h < 18) return '午後'
  return '夜'
}

function formatTimer(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function defaultDatetime() {
  const d   = new Date()
  d.setDate(d.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`
}

// ---- CharacterFace (SVG) ----

function CharacterFace({ state, size = 64 }: { state: CharacterState; size?: number }) {
  const faceColor: Record<CharacterState, string> = {
    sleeping: '#E5E7EB',
    normal:   '#DBEAFE',
    happy:    '#FEF3C7',
    angry:    '#FEE2E2',
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Face circle */}
      <circle cx="32" cy="34" r="28" fill={faceColor[state]} />
      {/* Highlight for 3D feel */}
      <circle cx="22" cy="22" r="7" fill="white" opacity="0.22" />

      {state === 'sleeping' && (
        <>
          {/* Closed eyes — upward arcs */}
          <path d="M18 30 Q22 25 26 30" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M38 30 Q42 25 46 30" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Relaxed mouth */}
          <path d="M26 44 Q32 47 38 44" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Z z */}
          <text x="46" y="22" fontSize="8" fill="#D1D5DB" fontFamily="sans-serif" fontWeight="bold">z</text>
          <text x="51" y="14" fontSize="5" fill="#E5E7EB" fontFamily="sans-serif" fontWeight="bold">z</text>
        </>
      )}

      {state === 'normal' && (
        <>
          {/* Dot eyes */}
          <circle cx="22" cy="29" r="3.5" fill="#60A5FA" />
          <circle cx="42" cy="29" r="3.5" fill="#60A5FA" />
          {/* Slight smile */}
          <path d="M25 42 Q32 47 39 42" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      )}

      {state === 'happy' && (
        <>
          {/* Star eyes */}
          <text x="15" y="33" fontSize="13" fill="#F59E0B">★</text>
          <text x="35" y="33" fontSize="13" fill="#F59E0B">★</text>
          {/* Big smile */}
          <path d="M20 40 Q32 52 44 40" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Rosy cheeks */}
          <circle cx="13" cy="40" r="5" fill="#FCA5A5" opacity="0.4" />
          <circle cx="51" cy="40" r="5" fill="#FCA5A5" opacity="0.4" />
        </>
      )}

      {state === 'angry' && (
        <>
          {/* Angry eyebrows — inward V shape */}
          <path d="M14 24 L27 30" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M37 30 L50 24" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          {/* Eyes */}
          <circle cx="22" cy="33" r="3.5" fill="#EF4444" />
          <circle cx="42" cy="33" r="3.5" fill="#EF4444" />
          {/* Frown */}
          <path d="M24 46 Q32 40 40 46" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Sweat drop */}
          <ellipse cx="52" cy="26" rx="2" ry="3.5" fill="#93C5FD" opacity="0.75" />
        </>
      )}
    </svg>
  )
}

// ---- Character (animated wrapper + optional label) ----

function Character({
  state,
  size = 64,
  showLabel = false,
}: {
  state: CharacterState
  size?: number
  showLabel?: boolean
}) {
  const meta = CHARACTER_META[state]
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={meta.animClass} style={{ width: size, height: size, flexShrink: 0 }}>
        <CharacterFace state={state} size={size} />
      </div>
      {showLabel && <p className="text-xs text-gray-500 font-medium">{meta.label}</p>}
    </div>
  )
}

// ---- CalendarModal ----

function CalendarModal({
  taskTitle,
  onConfirm,
  onClose,
}: {
  taskTitle: string
  onConfirm: (taskTitle: string, dateTime: string) => void
  onClose: () => void
}) {
  const [dt, setDt]             = useState(defaultDatetime())
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = () => {
    onConfirm(taskTitle, dt)
    setConfirmed(true)
    setTimeout(onClose, 1600)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-30 flex items-end"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl p-6 w-full max-w-lg mx-auto space-y-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {confirmed ? (
          <div className="text-center py-6">
            <p className="text-4xl">📅</p>
            <p className="text-base font-bold text-green-600 mt-3">Calendarに登録しました！</p>
            <p className="text-sm text-gray-400 mt-1 truncate px-4">「{taskTitle}」</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#2D2D2D]">いつやる？</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3 truncate">📌 {taskTitle}</p>
            <input
              type="datetime-local"
              value={dt}
              onChange={(e) => setDt(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#7B68EE] focus:ring-2 focus:ring-[#7B68EE]/20 transition"
            />
            <button
              onClick={handleConfirm}
              className="w-full py-3.5 bg-[#7B68EE] text-white rounded-2xl font-semibold text-sm hover:bg-[#6A57DD] active:scale-95 transition-all"
            >
              📅 Calendarに追加する
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ---- RecordTab ----

function RecordTab({ onTasksExtracted }: { onTasksExtracted: (tasks: Task[]) => void }) {
  const [isRecording, setIsRecording]           = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [inputText, setInputText]               = useState('')
  const [isLoading, setIsLoading]               = useState(false)
  const [loadingLabel, setLoadingLabel]         = useState('')
  const [result, setResult]                     = useState<Task[]>([])
  const [error, setError]                       = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = async () => {
    setError('')
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setIsLoading(true)
        setLoadingLabel('音声を変換中...')
        try {
          const data = await api.uploadAudio(blob)
          setInputText(data.transcribed_text ?? '')
        } catch {
          setError('音声の変換に失敗しました。テキストで入力してください。')
        } finally {
          setIsLoading(false)
          setLoadingLabel('')
        }
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000)
    } catch {
      setError('マイクへのアクセスが許可されていません')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const handleExtract = async () => {
    if (!inputText.trim()) return
    setIsLoading(true)
    setLoadingLabel('タスクを抽出中...')
    setError('')
    setResult([])
    try {
      const data  = await api.extractTasks(inputText)
      const tasks: Task[] = ((data.tasks ?? []) as Omit<Task, 'id' | 'done'>[]).map((t, i) => ({
        ...t,
        id:   `extracted-${Date.now()}-${i}`,
        done: false,
      }))
      setResult(tasks)
      onTasksExtracted(tasks)
    } catch {
      setError('タスクの抽出に失敗しました。バックエンドが起動しているか確認してください。')
    } finally {
      setIsLoading(false)
      setLoadingLabel('')
    }
  }

  return (
    <div className="space-y-5">
      {/* Mic button */}
      <div className="text-center py-6">
        <p className="text-sm text-gray-500 mb-6">頭の中にあることを、なんでもぜんぶ出してみよう</p>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading && !isRecording}
          className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all shadow-lg ${
            isRecording
              ? 'bg-red-500 shadow-red-200 scale-110 animate-pulse'
              : 'bg-[#7B68EE] shadow-[#7B68EE]/30 hover:scale-105 active:scale-95'
          } disabled:opacity-40`}
        >
          {isRecording ? (
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-1 14.93V20H9v2h6v-2h-2v-2.07A7.001 7.001 0 0 0 19 11h-2a5 5 0 0 1-10 0H5a7.001 7.001 0 0 0 6 6.93z" />
            </svg>
          )}
        </button>

        {isRecording && (
          <p className="text-red-500 font-mono text-lg mt-3 tabular-nums">{formatTimer(recordingSeconds)}</p>
        )}
        {isLoading && (
          <p className="text-[#7B68EE] text-sm mt-3 animate-pulse">{loadingLabel}</p>
        )}
        {!isRecording && !isLoading && (
          <p className="text-xs text-gray-400 mt-3">タップして録音</p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">または テキストで入力</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={'例）買い物行かなきゃ、メール返してない、\n部屋散らかってる、明日の準備もしてない...'}
        className="w-full h-36 p-4 rounded-2xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:border-[#7B68EE] focus:ring-2 focus:ring-[#7B68EE]/20 transition"
      />

      {error && <p className="text-red-500 text-xs px-1">{error}</p>}

      <button
        onClick={handleExtract}
        disabled={isLoading || !inputText.trim()}
        className="w-full py-3.5 bg-[#7B68EE] text-white rounded-2xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#6A57DD] active:scale-95 transition-all"
      >
        {isLoading ? loadingLabel : 'タスクを抽出する →'}
      </button>

      {result.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            抽出されたタスク — {result.length}件
          </h3>
          {result.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#2D2D2D]">{task.title}</p>
                <p className="text-xs text-gray-400 mt-1">約 {formatMinutes(task.estimated_minutes)}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium ${getCategoryStyle(task.category)}`}>
                {task.category}
              </span>
            </div>
          ))}
          <p className="text-xs text-center text-[#7B68EE]">✓ タスクリストに追加しました</p>
        </div>
      )}
    </div>
  )
}

// ---- TasksTab ----

function TasksTab({
  tasks,
  onToggle,
  onCalendarAdd,
}: {
  tasks: Task[]
  onToggle: (id: string) => void
  onCalendarAdd: (title: string) => void
}) {
  const pending    = tasks.filter((t) => !t.done)
  const done       = tasks.filter((t) => t.done)
  const categories = [...new Set(pending.map((t) => t.category))]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{pending.length}件 残っています</p>
        {done.length > 0 && (
          <span className="text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-medium">
            ✓ {done.length}件 完了
          </span>
        )}
      </div>

      {pending.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl">🎉</p>
          <p className="text-base font-semibold text-gray-600 mt-3">全タスク完了！すごい！</p>
          <p className="text-sm text-gray-400 mt-1">今日のあなたは最高です</p>
        </div>
      )}

      {categories.map((category) => (
        <div key={category}>
          <h3 className="flex items-center gap-2 mb-2 px-1">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getCategoryStyle(category)}`}>
              {category}
            </span>
            <span className="text-xs text-gray-400">
              {pending.filter((t) => t.category === category).length}件
            </span>
          </h3>
          <div className="space-y-2">
            {pending
              .filter((t) => t.category === category)
              .map((task) => (
                <div key={task.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onToggle(task.id)}
                      className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0 mt-0.5 hover:border-[#7B68EE] transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2D2D2D]">{task.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">⏱ {formatMinutes(task.estimated_minutes)}</span>
                        {task.location && (
                          <span className="text-xs text-gray-400">📍 {task.location}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onCalendarAdd(task.title)}
                    className="mt-3 ml-8 text-xs text-[#7B68EE] bg-[#7B68EE]/8 px-3 py-1.5 rounded-full hover:bg-[#7B68EE]/15 transition-colors"
                  >
                    📅 Calendarに追加
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}

      {done.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-300 px-1 mb-2">完了済み</h3>
          <div className="space-y-2">
            {done.map((task) => (
              <div
                key={task.id}
                className="bg-gray-50 rounded-2xl p-4 border border-gray-100 opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400 line-through">{task.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- ProposeTab ----

function ProposeTab({
  tasks,
  weather,
  characterState,
  onCalendarAdd,
}: {
  tasks: Task[]
  weather: Weather | null
  characterState: CharacterState
  onCalendarAdd: (title: string) => void
}) {
  const [userMessage, setUserMessage]     = useState('グダグダしてる。何かやることある？')
  const [proposed, setProposed]           = useState<ProposedTask[]>([])
  const [agentMessage, setAgentMessage]   = useState('')
  const [isLoading, setIsLoading]         = useState(false)
  const [error, setError]                 = useState('')

  const handlePropose = async () => {
    if (!userMessage.trim()) return
    setIsLoading(true)
    setError('')
    setProposed([])
    setAgentMessage('')
    try {
      const data = await api.proposeTasks(userMessage)
      setProposed((data.tasks ?? []) as ProposedTask[])
      setAgentMessage(data.response ?? data.message ?? '')
    } catch {
      setError('提案の取得に失敗しました。バックエンドが起動しているか確認してください。')
    } finally {
      setIsLoading(false)
    }
  }

  const pending = tasks.filter((t) => !t.done).length
  const meta    = CHARACTER_META[characterState]

  return (
    <div className="space-y-4">
      {/* Character + state card */}
      <div className={`bg-gradient-to-br ${meta.bgFrom} ${meta.bgTo} rounded-3xl p-5 flex items-center gap-4 border border-white/60 shadow-sm`}>
        <Character state={characterState} size={72} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">今のあなたの状態</p>
          <p className="text-base font-bold text-[#2D2D2D]">{meta.label}</p>
          <p className="text-xs text-gray-400 mt-1.5">
            残タスク <span className="font-semibold text-gray-600">{pending}件</span>
            {weather?.is_rainy && (
              <span className="ml-2 text-blue-400">雨なので外出注意</span>
            )}
          </p>
        </div>
      </div>

      {/* Context cards — time / weather / temperature */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-400">時間帯</p>
          <p className="text-sm font-bold text-[#2D2D2D] mt-0.5">{getTimeOfDay()}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-400">天気</p>
          <p className="text-sm font-bold text-[#2D2D2D] mt-0.5">
            {weather ? `${weather.emoji} ${weather.condition}` : '...'}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-400">気温</p>
          <p className="text-sm font-bold text-[#2D2D2D] mt-0.5">
            {weather ? `${weather.temperature}℃` : '...'}
          </p>
        </div>
      </div>

      {/* Date label */}
      <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
        <p className="text-xs text-gray-400 mb-0.5">現在</p>
        <p className="text-sm font-bold text-[#2D2D2D]">{getTimeLabel()}</p>
      </div>

      {/* Message input + send */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <textarea
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          rows={2}
          placeholder="グダグダしてる。何かやることある？"
          className="w-full px-4 pt-3 pb-1 text-sm resize-none focus:outline-none text-[#2D2D2D] placeholder-gray-300"
        />
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
          <p className="text-xs text-gray-300">エージェントに相談する</p>
          <button
            onClick={handlePropose}
            disabled={isLoading || !userMessage.trim()}
            className="py-2 px-5 bg-[#FF8C69] text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#E87B58] active:scale-95 transition-all shadow-sm shadow-[#FF8C69]/30"
          >
            {isLoading ? '考え中...' : '相談する 💡'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}

      {(agentMessage || proposed.length > 0) && (
        <div className="space-y-3">
          {agentMessage && (
            <div className="bg-[#7B68EE]/8 rounded-2xl p-4 border border-[#7B68EE]/15">
              <p className="text-sm text-[#5A4FBF] leading-relaxed">💬 {agentMessage}</p>
            </div>
          )}
          {proposed.map((task, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FF8C69]/15 text-[#FF8C69] font-bold text-sm shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2D2D2D]">{task.title}</p>
                  {task.estimated_minutes && (
                    <p className="text-xs text-gray-400 mt-0.5">約 {formatMinutes(task.estimated_minutes)}</p>
                  )}
                </div>
              </div>
              {task.reason && (
                <p className="text-xs text-gray-400 mt-2 ml-10 leading-relaxed">{task.reason}</p>
              )}
              <button
                onClick={() => onCalendarAdd(task.title)}
                className="mt-3 ml-10 text-xs text-[#FF8C69] bg-[#FF8C69]/8 px-3 py-1.5 rounded-full hover:bg-[#FF8C69]/15 transition-colors"
              >
                📅 Calendarに追加
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- TimelineTab ----

function TimelineTab({
  tasks,
  myCharacterState,
}: {
  tasks: Task[]
  myCharacterState: CharacterState
}) {
  const completedCount = tasks.filter((t) => t.done).length
  const totalCount     = tasks.length
  const myRate         = totalCount > 0 ? completedCount / totalCount : 0

  // Merge live task data into "me" entry, then sort by completion rate
  const users: TimelineUser[] = MOCK_TIMELINE
    .map((u) =>
      u.user_id === 'me'
        ? {
            ...u,
            state:           myCharacterState,
            completion_rate: myRate,
            done_count:      completedCount,
            pending_count:   tasks.filter((t) => !t.done).length,
          }
        : u
    )
    .sort((a, b) => b.completion_rate - a.completion_rate)

  const rankLabel = (i: number) => (['🥇', '🥈', '🥉'] as const)[i] ?? String(i + 1)

  return (
    <div className="space-y-4">
      {/* Personal summary */}
      <div className="bg-gradient-to-br from-[#7B68EE] to-[#9B8BFF] rounded-2xl p-5 text-white shadow-md shadow-[#7B68EE]/30">
        <div className="flex items-center gap-4">
          <Character state={myCharacterState} size={64} />
          <div className="flex-1">
            <h3 className="text-xs font-semibold opacity-75 mb-2">今週のあなた</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold">{completedCount}</p>
                <p className="text-xs opacity-70 mt-0.5">完了</p>
              </div>
              <div>
                <p className="text-xl font-bold">{Math.round(myRate * 100)}%</p>
                <p className="text-xs opacity-70 mt-0.5">完了率</p>
              </div>
              <div>
                <p className="text-xl font-bold">62</p>
                <p className="text-xs opacity-70 mt-0.5">偏差値</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/20">
          <p className="text-xs opacity-75">東京のユーザー平均完了率: 45%</p>
          <p className="text-sm font-semibold mt-0.5">
            あなたは上位 <span className="text-yellow-300">23%</span> 🎉
          </p>
        </div>
      </div>

      {/* Ranking */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
        みんなのランキング
      </h3>
      <div className="space-y-2">
        {users.map((user, i) => (
          <div
            key={user.user_id}
            className={`bg-white rounded-2xl px-4 py-3 border shadow-sm flex items-center gap-3 transition-all ${
              user.user_id === 'me'
                ? 'border-[#7B68EE]/40 ring-1 ring-[#7B68EE]/20 shadow-[#7B68EE]/10'
                : 'border-gray-100'
            }`}
          >
            {/* Rank */}
            <span className="text-lg leading-none w-8 text-center shrink-0">
              {rankLabel(i)}
            </span>

            {/* Character icon (animated) */}
            <div
              className={CHARACTER_META[user.state].animClass}
              style={{ width: 36, height: 36, flexShrink: 0 }}
            >
              <CharacterFace state={user.state} size={36} />
            </div>

            {/* Name + progress bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-[#2D2D2D] truncate">{user.display_name}</p>
                {user.user_id === 'me' && (
                  <span className="text-xs bg-[#7B68EE]/10 text-[#7B68EE] px-1.5 py-0.5 rounded-full shrink-0">
                    YOU
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#7B68EE] transition-all duration-500"
                  style={{ width: `${Math.round(user.completion_rate * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {user.done_count}件完了 / {user.done_count + user.pending_count}件
              </p>
            </div>

            {/* Rate */}
            <p className="text-sm font-bold text-gray-500 shrink-0 tabular-nums">
              {Math.round(user.completion_rate * 100)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Main Page ----

export default function Home() {
  const [activeTab, setActiveTab]           = useState<Tab>('record')
  const [tasks, setTasks]                   = useState<Task[]>(INITIAL_TASKS)
  const [weather, setWeather]               = useState<Weather | null>(null)
  const [calendarTitle, setCalendarTitle]   = useState<string | null>(null)

  const characterState = computeCharacterState(tasks)
  const pendingCount   = tasks.filter((t) => !t.done).length

  // Fetch weather from Open-Meteo (free, no API key)
  useEffect(() => {
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=35.68&longitude=139.76&current=weather_code,temperature_2m'
    )
      .then((r) => r.json())
      .then((data) => {
        const code = data.current.weather_code as number
        const temp = Math.round(data.current.temperature_2m as number)
        let condition = '晴れ'
        let emoji     = '☀️'
        if      (code >= 95) { condition = '雷雨';     emoji = '⛈️' }
        else if (code >= 80) { condition = 'にわか雨'; emoji = '🌦️' }
        else if (code >= 51) { condition = '雨';       emoji = '🌧️' }
        else if (code >= 45) { condition = '霧';       emoji = '🌫️' }
        else if (code >= 1)  { condition = '曇り';     emoji = '☁️' }
        setWeather({ condition, emoji, temperature: temp, is_rainy: code >= 51 })
      })
      .catch(() => {}) // fail silently
  }, [])

  const handleTasksExtracted = (newTasks: Task[]) => {
    setTasks((prev) => [...prev, ...newTasks])
  }

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    )
  }

  const handleCalendarConfirm = (taskTitle: string, dateTime: string) => {
    // TODO: connect to POST /api/chat with calendar instruction
    console.log('Calendar add:', taskTitle, dateTime)
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 py-3 shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {/* Character + title */}
          <div className="flex items-center gap-3">
            <div className={CHARACTER_META[characterState].animClass} style={{ width: 40, height: 40 }}>
              <CharacterFace state={characterState} size={40} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#2D2D2D] tracking-tight">
                ぐだぐだリファクタリング
              </h1>
              <p className="text-xs text-gray-400">{CHARACTER_META[characterState].label}</p>
            </div>
          </div>

          {/* Right badge */}
          <div className="flex items-center gap-2">
            {weather && (
              <span className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                {weather.emoji} {weather.temperature}℃
              </span>
            )}
            {activeTab === 'tasks' && pendingCount > 0 && (
              <span className="text-xs bg-[#7B68EE]/10 text-[#7B68EE] px-2.5 py-1 rounded-full font-semibold">
                {pendingCount}件残り
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto px-4 py-5">
          {activeTab === 'record' && (
            <RecordTab onTasksExtracted={handleTasksExtracted} />
          )}
          {activeTab === 'tasks' && (
            <TasksTab
              tasks={tasks}
              onToggle={handleToggleTask}
              onCalendarAdd={(title) => setCalendarTitle(title)}
            />
          )}
          {activeTab === 'propose' && (
            <ProposeTab
              tasks={tasks}
              weather={weather}
              characterState={characterState}
              onCalendarAdd={(title) => setCalendarTitle(title)}
            />
          )}
          {activeTab === 'timeline' && (
            <TimelineTab tasks={tasks} myCharacterState={characterState} />
          )}
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-10">
        <div className="max-w-lg mx-auto flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors relative ${
                activeTab === tab.id ? 'text-[#7B68EE]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {activeTab === tab.id && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#7B68EE] rounded-full" />
              )}
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Calendar modal */}
      {calendarTitle !== null && (
        <CalendarModal
          taskTitle={calendarTitle}
          onConfirm={handleCalendarConfirm}
          onClose={() => setCalendarTitle(null)}
        />
      )}
    </div>
  )
}
