'use client'

import { useState, useRef } from 'react'

// --- Types ---
type Tab = 'record' | 'tasks' | 'propose' | 'timeline'

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
  reason: string
  estimated_minutes?: number
}

type TimelineItem = {
  id: string
  user: string
  action: 'completed' | 'added'
  task: string
  minutes_ago: number
}

// --- Constants ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'メールを返信する', category: '仕事', estimated_minutes: 15, done: false },
  { id: '2', title: '企画資料を作成する', category: '仕事', estimated_minutes: 90, done: false },
  { id: '3', title: 'スーパーで買い物', category: '買い物', estimated_minutes: 60, location: '駅前', done: false },
  { id: '4', title: '部屋を掃除する', category: '家事', estimated_minutes: 45, done: false },
  { id: '5', title: '読みかけの本を読む', category: '自己投資', estimated_minutes: 30, done: false },
]

const MOCK_TIMELINE: TimelineItem[] = [
  { id: '1', user: 'Aさん', action: 'completed', task: '企画書の作成', minutes_ago: 3 },
  { id: '2', user: 'Bさん', action: 'added', task: '買い物（スーパー）', minutes_ago: 15 },
  { id: '3', user: 'Cさん', action: 'completed', task: '朝のランニング', minutes_ago: 60 },
  { id: '4', user: 'Dさん', action: 'completed', task: 'メール返信 ×5', minutes_ago: 120 },
]

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'record', label: '入力', icon: '🎙️' },
  { id: 'tasks', label: 'タスク', icon: '📋' },
  { id: 'propose', label: '提案', icon: '💡' },
  { id: 'timeline', label: 'タイムライン', icon: '👥' },
]

const TAB_TITLES: Record<Tab, string> = {
  record: 'ぐだぐだを入力する',
  tasks: 'タスク一覧',
  propose: '今何する？',
  timeline: 'タイムライン',
}

const CATEGORY_STYLE: Record<string, string> = {
  '仕事': 'text-blue-600 bg-blue-50',
  '買い物': 'text-green-600 bg-green-50',
  '家事': 'text-orange-600 bg-orange-50',
  '自己投資': 'text-purple-600 bg-purple-50',
  '連絡': 'text-pink-600 bg-pink-50',
}

// --- Helpers ---
function getCategoryStyle(cat: string) {
  return CATEGORY_STYLE[cat] ?? 'text-gray-600 bg-gray-100'
}

function formatMinutes(m: number) {
  if (m < 60) return `${m}分`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}時間${rem}分` : `${h}時間`
}

function getTimeLabel() {
  return new Date().toLocaleString('ja-JP', { weekday: 'long', hour: '2-digit', minute: '2-digit' })
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 6) return '深夜'
  if (h < 12) return '午前'
  if (h < 18) return '午後'
  return '夜'
}

function formatTimer(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// --- RecordTab ---
function RecordTab({ onTasksExtracted }: { onTasksExtracted: (tasks: Task[]) => void }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<Task[]>([])
  const [error, setError] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        // TODO: /api/transcribe に音声をPOSTしてテキスト変換
        setInputText('（音声の文字起こし — 実装予定）')
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
    setError('')
    setResult([])
    try {
      const res = await fetch(`${API_URL}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const tasks: Task[] = (data.tasks ?? []).map((t: Omit<Task, 'id' | 'done'>, i: number) => ({
        ...t,
        id: `extracted-${Date.now()}-${i}`,
        done: false,
      }))
      setResult(tasks)
      onTasksExtracted(tasks)
    } catch {
      setError('タスクの抽出に失敗しました。バックエンドが起動しているか確認してください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Mic button */}
      <div className="text-center py-6">
        <p className="text-sm text-gray-500 mb-6">頭の中にあることを、なんでもぜんぶ出してみよう</p>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all shadow-lg ${
            isRecording
              ? 'bg-red-500 shadow-red-200 scale-110 animate-pulse'
              : 'bg-[#7B68EE] shadow-[#7B68EE]/30 hover:scale-105 active:scale-95'
          }`}
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
        {!isRecording && <p className="text-xs text-gray-400 mt-3">タップして録音</p>}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">または テキストで入力</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Text input */}
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
        {isLoading ? 'タスクを抽出中...' : 'タスクを抽出する →'}
      </button>

      {result.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            抽出されたタスク — {result.length}件
          </h3>
          {result.map((task) => (
            <div key={task.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start justify-between gap-3">
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

// --- TasksTab ---
function TasksTab({
  tasks,
  onToggle,
  onCalendarAdd,
}: {
  tasks: Task[]
  onToggle: (id: string) => void
  onCalendarAdd: (task: Task) => void
}) {
  const pending = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)
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
                        {task.location && <span className="text-xs text-gray-400">📍 {task.location}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onCalendarAdd(task)}
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
              <div key={task.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 opacity-50">
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

// --- ProposeTab ---
function ProposeTab({ tasks }: { tasks: Task[] }) {
  const [proposed, setProposed] = useState<ProposedTask[]>([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const mockSteps = 3240

  const handlePropose = async () => {
    setIsLoading(true)
    setError('')
    setProposed([])
    setMessage('')
    try {
      const res = await fetch(`${API_URL}/api/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'ぐだぐだしてる' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProposed(data.tasks ?? [])
      setMessage(data.message ?? '')
    } catch {
      setError('提案の取得に失敗しました。バックエンドが起動しているか確認してください。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCalendarAdd = (task: ProposedTask) => {
    // TODO: POST /api/calendar/add
    alert(`「${task.title}」をCalendarに追加します（実装予定）`)
  }

  return (
    <div className="space-y-4">
      {/* Context cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-400">時間帯</p>
          <p className="text-sm font-bold text-[#2D2D2D] mt-0.5">{getTimeOfDay()}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-400">歩数</p>
          <p className="text-sm font-bold text-[#2D2D2D] mt-0.5">{mockSteps.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-400">残タスク</p>
          <p className="text-sm font-bold text-[#2D2D2D] mt-0.5">{tasks.filter((t) => !t.done).length}件</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <p className="text-xs text-gray-400">現在</p>
        <p className="text-base font-bold text-[#2D2D2D] mt-0.5">{getTimeLabel()}</p>
      </div>

      <button
        onClick={handlePropose}
        disabled={isLoading}
        className="w-full py-4 bg-[#FF8C69] text-white rounded-2xl font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#E87B58] active:scale-95 transition-all shadow-md shadow-[#FF8C69]/30"
      >
        {isLoading ? '考え中...' : '💡 今何をすれば良い？'}
      </button>

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}

      {(message || proposed.length > 0) && (
        <div className="space-y-3">
          {message && (
            <div className="bg-[#7B68EE]/8 rounded-2xl p-4 border border-[#7B68EE]/15">
              <p className="text-sm text-[#5A4FBF] leading-relaxed">💬 {message}</p>
            </div>
          )}
          {proposed.map((task, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FF8C69]/15 text-[#FF8C69] font-bold text-sm shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1">
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
                onClick={() => handleCalendarAdd(task)}
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

// --- TimelineTab ---
function TimelineTab({ tasks }: { tasks: Task[] }) {
  const completedCount = tasks.filter((t) => t.done).length

  return (
    <div className="space-y-4">
      {/* Personal stats */}
      <div className="bg-gradient-to-br from-[#7B68EE] to-[#9B8BFF] rounded-2xl p-5 text-white shadow-md shadow-[#7B68EE]/30">
        <h3 className="text-xs font-semibold opacity-75 mb-3">今週のあなた</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-xs opacity-70 mt-0.5">完了タスク</p>
          </div>
          <div>
            <p className="text-2xl font-bold">6,200</p>
            <p className="text-xs opacity-70 mt-0.5">平均歩数</p>
          </div>
          <div>
            <p className="text-2xl font-bold">62</p>
            <p className="text-xs opacity-70 mt-0.5">偏差値</p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/20">
          <p className="text-xs opacity-75">東京のユーザー平均: 3,100歩</p>
          <p className="text-sm font-semibold mt-0.5">
            あなたは上位 <span className="text-yellow-300">23%</span> 🎉
          </p>
        </div>
      </div>

      {/* Activity feed */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">みんなの活動</h3>
      <div className="space-y-2">
        {MOCK_TIMELINE.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                item.action === 'completed' ? 'bg-green-100' : 'bg-blue-50'
              }`}
            >
              {item.action === 'completed' ? '✅' : '📝'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#2D2D2D] leading-snug">
                <span className="font-semibold">{item.user}</span>
                {' が「'}
                <span className="text-gray-600">{item.task}</span>
                {'」を'}
                <span className={item.action === 'completed' ? 'text-green-600 font-medium' : 'text-blue-600 font-medium'}>
                  {item.action === 'completed' ? '完了' : '予定追加'}
                </span>
              </p>
            </div>
            <p className="text-xs text-gray-300 shrink-0">
              {item.minutes_ago < 60 ? `${item.minutes_ago}分前` : `${Math.floor(item.minutes_ago / 60)}時間前`}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Main Page ---
export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('record')
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)

  const handleTasksExtracted = (newTasks: Task[]) => {
    setTasks((prev) => [...prev, ...newTasks])
  }

  const handleToggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  const handleCalendarAdd = (task: Task) => {
    // TODO: POST /api/calendar/add
    alert(`「${task.title}」をCalendarに追加します（実装予定）`)
  }

  const pendingCount = tasks.filter((t) => !t.done).length

  return (
    <div className="min-h-screen bg-[#F7F6F3] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-[#2D2D2D] tracking-tight">🌀 ぐだぐだリファクタリング</h1>
            <p className="text-xs text-gray-400 mt-0.5">{TAB_TITLES[activeTab]}</p>
          </div>
          {activeTab === 'tasks' && pendingCount > 0 && (
            <span className="text-xs bg-[#7B68EE]/10 text-[#7B68EE] px-2.5 py-1 rounded-full font-semibold">
              {pendingCount}件残り
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto px-4 py-5">
          {activeTab === 'record' && <RecordTab onTasksExtracted={handleTasksExtracted} />}
          {activeTab === 'tasks' && (
            <TasksTab tasks={tasks} onToggle={handleToggleTask} onCalendarAdd={handleCalendarAdd} />
          )}
          {activeTab === 'propose' && <ProposeTab tasks={tasks} />}
          {activeTab === 'timeline' && <TimelineTab tasks={tasks} />}
        </div>
      </main>

      {/* Bottom Nav */}
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
    </div>
  )
}
