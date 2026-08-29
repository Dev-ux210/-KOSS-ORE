"use client"

import * as React from "react"
import {
  Send,
  FileText,
  Database,
  Activity,
  ChevronRight,
  Trash2,
  Cpu,
  Sparkles,
  BookOpen,
  CheckCircle,
  Search,
  Settings as SettingsIcon,
  Terminal as TerminalIcon,
  BarChart3,
  Layers,
  Plus,
  RefreshCw,
  GraduationCap,
  FileQuestion,
  Copy,
  Check,
  AlertCircle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  checkBackendHealth,
  fetchDocuments,
  uploadPdf,
  deleteDocument as apiDeleteDocument,
  askQuestion,
  generateRevisionNotes,
  generateVivaExam,
  DocumentItem,
  Citation,
  LogLine
} from "@/lib/api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  citations?: Citation[]
}

const SAMPLE_QUESTIONS = [
  "What is the main objective or thesis of this document?",
  "Summarize the key methodologies and frameworks mentioned.",
  "What are the major conclusions or practical takeaways?",
  "Explain the core technical mechanisms described in the text."
]

function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export default function ShadcnDashboard() {
  const [activeTab, setActiveTab] = React.useState<"overview" | "documents" | "notes" | "viva" | "analytics" | "settings">("overview")
  const [documents, setDocuments] = React.useState<DocumentItem[]>([])
  const [totalDbChunks, setTotalDbChunks] = React.useState<number>(0)
  const [isUploading, setIsUploading] = React.useState<boolean>(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Welcome to ORE (Kaju Academic RAG). Upload scientific papers and lecture notes to chunk and index them into ChromaDB, then query them with natural language or generate comprehensive study materials.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputVal, setInputVal] = React.useState("")
  const [isTyping, setIsTyping] = React.useState(false)
  const [backendStatus, setBackendStatus] = React.useState<"checking" | "online" | "offline">("checking")
  const [activeCitation, setActiveCitation] = React.useState<Citation | null>(null)
  
  // Performance metrics
  const [lastLatency, setLastLatency] = React.useState<number>(85)
  const [latencyHistory, setLatencyHistory] = React.useState<number[]>([75, 82, 69, 90, 85, 78, 92, 85])

  // Notes state
  const [selectedNotesDoc, setSelectedNotesDoc] = React.useState<string>("")
  const [generatedNotes, setGeneratedNotes] = React.useState<string>("")
  const [isGeneratingNotes, setIsGeneratingNotes] = React.useState<boolean>(false)
  const [copiedNotes, setCopiedNotes] = React.useState<boolean>(false)

  // Viva state
  const [selectedVivaDoc, setSelectedVivaDoc] = React.useState<string>("")
  const [generatedViva, setGeneratedViva] = React.useState<string>("")
  const [isGeneratingViva, setIsGeneratingViva] = React.useState<boolean>(false)
  const [copiedViva, setCopiedViva] = React.useState<boolean>(false)

  // Settings controls
  const [chunkSize, setChunkSize] = React.useState(500)
  const [chunkOverlap, setChunkOverlap] = React.useState(50)
  const [embedModel, setEmbedModel] = React.useState("nomic-embed-text")

  // Logs terminal drawer state
  const [viewingLogsDoc, setViewingLogsDoc] = React.useState<DocumentItem | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const chatEndRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll chat to bottom
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // Load documents from backend
  const loadDocuments = React.useCallback(async () => {
    try {
      const res = await fetchDocuments()
      setDocuments(res.documents || [])
      setTotalDbChunks(res.total_chunks || 0)
      if (res.documents && res.documents.length > 0) {
        if (!selectedNotesDoc) setSelectedNotesDoc(res.documents[0].name)
        if (!selectedVivaDoc) setSelectedVivaDoc(res.documents[0].name)
      }
    } catch {
      // Backend might be starting or offline
    }
  }, [selectedNotesDoc, selectedVivaDoc])

  // Check backend server status
  const checkHealth = React.useCallback(async () => {
    const { isOnline, data } = await checkBackendHealth()
    if (isOnline) {
      setBackendStatus("online")
      if (data?.total_chunks !== undefined) {
        setTotalDbChunks(data.total_chunks)
      }
    } else {
      setBackendStatus("offline")
    }
  }, [])

  React.useEffect(() => {
    checkHealth()
    loadDocuments()
    const timer = setInterval(() => {
      checkHealth()
    }, 8000)
    return () => clearInterval(timer)
  }, [checkHealth, loadDocuments])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0])
    }
    // Reset file input so same file can be re-uploaded if desired
    e.target.value = ""
  }

  const handleUploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are supported.")
      return
    }

    setIsUploading(true)
    setUploadError(null)

    const tempId = `temp-${Date.now()}`
    const initialLogs: LogLine[] = [
      { timestamp: new Date().toLocaleTimeString([], { hour12: false }), level: "INFO", message: `Connecting to backend for ${file.name}...` },
      { timestamp: new Date().toLocaleTimeString([], { hour12: false }), level: "INFO", message: `Sending PDF payload with chunk_size=${chunkSize}, chunk_overlap=${chunkOverlap}` }
    ]

    const placeholderDoc: DocumentItem = {
      id: tempId,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      status: "ingesting",
      created: "Just now",
      environment: "production",
      logs: initialLogs
    }

    setDocuments((prev) => [placeholderDoc, ...prev.filter(d => d.name !== file.name)])
    setActiveTab("documents")

    try {
      const response = await uploadPdf(file, { chunkSize, chunkOverlap })
      
      if (response.success) {
        // Refresh document list from backend
        await loadDocuments()
        setIsUploading(false)
      } else {
        throw new Error(response.message || "Upload returned false")
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed"
      setUploadError(errorMsg)
      setIsUploading(false)
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id === tempId) {
            const errLogs = [
              ...d.logs,
              { timestamp: new Date().toLocaleTimeString([], { hour12: false }), level: "ERROR" as const, message: errorMsg }
            ]
            return { ...d, status: "failed", logs: errLogs }
          }
          return d
        })
      )
    }
  }

  const handleDeleteDocument = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Are you sure you want to delete "${name}" from the repository and ChromaDB?`)) {
      return
    }

    try {
      await apiDeleteDocument(name)
      setDocuments((prev) => prev.filter((d) => d.name !== name))
      if (viewingLogsDoc?.name === name) {
        setViewingLogsDoc(null)
      }
      await loadDocuments()
    } catch (err) {
      alert(`Failed to delete document: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() || isTyping) return

    const userMessage: Message = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages((prev) => [...prev, userMessage])
    setInputVal("")
    setIsTyping(true)

    const startTime = performance.now()

    try {
      const result = await askQuestion(queryText)
      const elapsed = Math.round(performance.now() - startTime)
      setLastLatency(elapsed)
      setLatencyHistory((prev) => [...prev.slice(-19), elapsed])

      const assistantMessage: Message = {
        id: `msg-assistant-${Date.now()}`,
        role: "assistant",
        content: result.answer || "No response received from the model.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: result.citations || []
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Query request failed."
      const assistantMessage: Message = {
        id: `msg-assistant-err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Query error: ${errMsg}\n\nPlease verify that the FastAPI backend is running and Ollama is active with 'llama3' and 'nomic-embed-text' pulled.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleGenerateNotes = async () => {
    if (!selectedNotesDoc) return
    setIsGeneratingNotes(true)
    setGeneratedNotes("")
    try {
      const res = await generateRevisionNotes({ filename: selectedNotesDoc })
      setGeneratedNotes(res.notes)
    } catch (err) {
      setGeneratedNotes(`Failed to generate notes: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingNotes(false)
    }
  }

  const handleGenerateViva = async () => {
    if (!selectedVivaDoc) return
    setIsGeneratingViva(true)
    setGeneratedViva("")
    try {
      const res = await generateVivaExam({ filename: selectedVivaDoc })
      setGeneratedViva(res.viva)
    } catch (err) {
      setGeneratedViva(`Failed to generate viva questions: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingViva(false)
    }
  }

  const copyToClipboard = (text: string, type: "notes" | "viva") => {
    navigator.clipboard.writeText(text)
    if (type === "notes") {
      setCopiedNotes(true)
      setTimeout(() => setCopiedNotes(false), 2000)
    } else {
      setCopiedViva(true)
      setTimeout(() => setCopiedViva(false), 2000)
    }
  }

  const totalIndexedChars = documents.reduce((acc, d) => acc + (d.charCount || 0), 0)
  const totalChunks = totalDbChunks || documents.reduce((acc, d) => acc + (d.chunksCount || 0), 0)
  const activeDocument = documents.find((d) => d.status === "ready")

  return (
    <div 
      className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col selection:bg-zinc-800 selection:text-white relative overflow-x-hidden"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 0%, rgba(30, 30, 45, 0.45), rgba(0, 0, 0, 1) 70%), url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h1v30H0V0zm0 0h30v1H0V0z' fill='rgba(255,255,255,0.015)'/%3E%3C/svg%3E")`
      }}
    >
      {/* Offline warning banner if backend is down */}
      {backendStatus === "offline" && (
        <div className="bg-amber-950/90 border-b border-amber-800/80 px-4 py-2 text-xs text-amber-200 flex items-center justify-between z-50">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Backend Offline:</strong> FastAPI is not reachable at <code className="bg-amber-900/50 px-1 py-0.5 rounded font-mono">http://localhost:8000</code>. Start it with <code className="bg-black/60 px-1.5 py-0.5 rounded font-mono text-white">cd backend/App && uvicorn main:app --reload</code>
            </span>
          </div>
          <button onClick={checkHealth} className="hover:underline flex items-center gap-1 shrink-0 font-bold cursor-pointer">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}
      
      {/* 🖤 Premium shadcn Header */}
      <header className="border-b border-zinc-800/80 bg-black/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 select-none tracking-tight shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold">ORE</span>
            </div>
            <span className="hidden sm:inline text-zinc-800 font-light shrink-0">/</span>
            <div className="hidden md:flex items-center gap-1.5 hover:bg-zinc-900/60 px-2.5 py-1 rounded-md transition-colors cursor-pointer border border-transparent hover:border-zinc-800/40 shrink-0">
              <div className="w-4 h-4 rounded-md bg-zinc-850 border border-zinc-750 text-[10px] font-bold flex items-center justify-center text-zinc-300">K</div>
              <span className="text-sm font-semibold text-zinc-350">kaju-open-source</span>
            </div>
            <span className="hidden md:inline text-zinc-800 font-light shrink-0">/</span>
            <div className="flex items-center gap-1 hover:bg-zinc-900/60 px-2 md:px-2.5 py-1 rounded-md transition-colors cursor-pointer border border-transparent hover:border-zinc-800/40 min-w-0">
              <span className="text-sm font-bold text-white tracking-wide truncate">academic-rag</span>
              <span className="text-[10px] border border-zinc-800 bg-zinc-900 text-zinc-400 px-1.5 py-0.2 rounded font-mono shrink-0">v1.0.0</span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3.5 shrink-0">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm">
              {backendStatus === "online" ? (
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-400 font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  API Live
                </div>
              ) : backendStatus === "checking" ? (
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-400 font-bold">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Connecting
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-red-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  API Offline
                </div>
              )}
            </div>

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="sm"
              className="bg-zinc-100 hover:bg-zinc-300 text-black text-sm font-bold px-2.5 sm:px-3 py-1.5 rounded-md cursor-pointer transition-all border border-transparent hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] shrink-0"
            >
              {isUploading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span className="hidden sm:inline">{isUploading ? "Processing..." : "Upload PDF"}</span>
              <span className="sm:hidden">{isUploading ? "..." : "Upload"}</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-4 md:gap-6 text-xs md:text-sm tracking-wide uppercase font-semibold overflow-x-auto scrollbar-none whitespace-nowrap">
            {[
              { id: "overview", label: "Overview", icon: Layers },
              { id: "documents", label: `Ingestions (${documents.length})`, icon: FileText },
              { id: "notes", label: "Revision Notes", icon: GraduationCap },
              { id: "viva", label: "Viva Exam Prep", icon: FileQuestion },
              { id: "analytics", label: "Analytics", icon: BarChart3 },
              { id: "settings", label: "Settings", icon: SettingsIcon }
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`py-3.5 border-b-2 flex items-center gap-1.5 font-bold transition-all relative cursor-pointer shrink-0 ${
                    isActive
                      ? "border-zinc-200 text-zinc-100"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 stroke-[1.8]" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* 📦 Main Page Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 md:py-8 z-10">

        {/* Upload error banner if any */}
        {uploadError && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span><strong>Ingestion Error:</strong> {uploadError}</span>
            </div>
            <button onClick={() => setUploadError(null)} className="text-xs text-red-400 hover:underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* ==================== ⚡ OVERVIEW TAB ==================== */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-350">
            
            {/* Top Metric Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "ChromaDB Chunks", value: totalChunks, sub: "Indexed semantic vectors", icon: Database },
                { title: "Indexed Characters", value: formatNumber(totalIndexedChars), sub: "Total text characters", icon: FileText },
                { title: "Embedding Model", value: embedModel, sub: "Ollama vectorizer (768-dim)", icon: Cpu },
                { title: "Query Latency", value: `${lastLatency} ms`, sub: "RAG Retrieval + LLM Generation", icon: Activity }
              ].map((metric, idx) => {
                const Icon = metric.icon
                return (
                  <div key={idx} className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md flex flex-col justify-between hover:border-zinc-700/60 transition-all group">
                    <div className="flex items-center justify-between text-sm text-zinc-450 font-bold uppercase tracking-wider">
                      <span>{metric.title}</span>
                      <div className="p-1 rounded bg-zinc-900 border border-zinc-850 group-hover:border-zinc-800/60 transition-all text-zinc-450">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-3.5">
                      <div className="text-3xl font-bold tracking-tight text-white font-mono">{metric.value}</div>
                      <div className="text-xs text-zinc-500 mt-1.5">{metric.sub}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Split Panel: Chat Console (Left) and Active State Detail (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Chat Console Box */}
              <div className="lg:col-span-2 border border-zinc-800/80 rounded-xl bg-zinc-950/40 backdrop-blur-md flex flex-col min-h-[450px] h-[550px] md:h-[620px] overflow-hidden shadow-xl">
                {/* Chat Header */}
                <div className="px-4 md:px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/20 backdrop-blur-sm shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Academic Semantic Query</span>
                  </div>
                  <div className="text-[10px] md:text-xs border border-zinc-800 bg-zinc-900/60 text-zinc-400 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
                    {documents.length} Docs Indexed
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 md:space-y-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-3 md:gap-4">
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-md border text-[10px] font-bold flex items-center justify-center shrink-0 tracking-wider shadow-sm ${
                        msg.role === "user" 
                          ? "bg-zinc-900 border-zinc-800 text-zinc-400" 
                          : "bg-white border-zinc-900 text-black font-extrabold"
                      }`}>
                        {msg.role === "user" ? "USR" : "AI"}
                      </div>

                      {/* Content */}
                      <div className="space-y-2.5 max-w-[90%] md:max-w-[85%]">
                        <div className={`p-3 md:p-4 rounded-xl text-sm md:text-[15px] leading-relaxed tracking-wide whitespace-pre-wrap border ${
                          msg.role === "user" 
                            ? "bg-zinc-900/50 text-zinc-100 border-zinc-850" 
                            : "bg-zinc-950/80 text-zinc-200 border-zinc-850"
                        }`}>
                          {msg.content}
                        </div>

                        {/* Citation tag badges */}
                        {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1.5">
                            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1 mr-1">
                              <BookOpen className="w-3.5 h-3.5 text-zinc-400" /> Citations:
                            </span>
                            {msg.citations.map((citation, index) => (
                              <button
                                key={index}
                                onClick={() => setActiveCitation(citation)}
                                className="text-xs bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 text-zinc-300 px-2 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer font-mono"
                              >
                                <span className="truncate max-w-[120px]">{citation.sourceName}</span>
                                <span className="text-zinc-500">[p. {citation.pageNumber}]</span>
                                <span className="text-emerald-400 font-semibold">{Math.round(citation.score * 100)}%</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex items-start gap-4 animate-pulse">
                      <div className="w-8 h-8 rounded-md bg-white border border-zinc-900 text-black flex items-center justify-center shrink-0 font-bold text-[10px]">
                        AI
                      </div>
                      <div className="bg-black/40 border border-zinc-850 rounded-xl p-4 text-zinc-400 text-sm font-mono flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                        Querying ChromaDB vectors & generating LLM completion...
                      </div>
                    </div>
                  )}

                  {/* Show suggested queries on welcome screen */}
                  {messages.length === 1 && !isTyping && (
                    <div className="py-4 space-y-4">
                      <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Suggested queries</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {SAMPLE_QUESTIONS.map((question, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuery(question)}
                            className="p-3 md:p-3.5 text-left text-xs md:text-sm bg-zinc-950/40 hover:bg-zinc-900/40 border border-zinc-850 hover:border-zinc-750 rounded-lg text-zinc-300 hover:text-white transition-all cursor-pointer group flex items-start gap-2.5 shadow-sm"
                          >
                            <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{question}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input Footer */}
                <div className="p-3 md:p-4 border-t border-zinc-800/80 bg-zinc-950/40 backdrop-blur-sm shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleQuery(inputVal)
                    }}
                    className="relative flex items-center max-w-4xl mx-auto"
                  >
                    <Input
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      placeholder={
                        documents.length > 0
                          ? "Ask questions about your uploaded documents..."
                          : "Upload a PDF document first..."
                      }
                      disabled={isTyping}
                      className="pr-12 py-5 bg-black/60 border-zinc-800 focus-visible:ring-zinc-800/40 text-zinc-100 placeholder:text-zinc-600 rounded-lg text-sm"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!inputVal.trim() || isTyping}
                      className="absolute right-2 text-black bg-zinc-100 hover:bg-zinc-300 disabled:bg-zinc-900 disabled:text-zinc-600 rounded w-7 h-7 cursor-pointer border border-transparent shadow"
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                  </form>
                  <div className="flex items-center justify-between text-xs text-zinc-500 mt-2 px-1 font-mono">
                    <span>Press Enter to query</span>
                    <span>Backend: FastAPI + ChromaDB + Ollama</span>
                  </div>
                </div>
              </div>

              {/* Right Column: RAG Ingest Pipeline Diagram and Metadata */}
              <div className="space-y-6">
                {/* Active Ingest Context card */}
                <div className="border border-zinc-800/80 rounded-xl bg-zinc-950/40 backdrop-blur-md p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between text-sm text-white font-bold border-b border-zinc-800 pb-2.5">
                    <span>Active Context</span>
                    <button 
                      onClick={loadDocuments} 
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> sync
                    </button>
                  </div>

                  {!activeDocument ? (
                    <div className="py-4 text-center">
                      <p className="text-sm text-zinc-500 mb-3">No documents indexed in vector storage.</p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        size="sm"
                        className="bg-zinc-850 hover:bg-zinc-750 text-xs text-white"
                      >
                        Upload PDF to begin
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-sm text-white truncate font-medium">{activeDocument.name}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-zinc-900/40 p-2.5 rounded border border-zinc-850">
                          <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Chunks</div>
                          <div className="text-base font-bold text-white font-mono mt-1">{activeDocument.chunksCount || "--"}</div>
                        </div>
                        <div className="bg-zinc-900/40 p-2.5 rounded border border-zinc-850">
                          <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">File Size</div>
                          <div className="text-base font-bold text-white font-mono mt-1">{activeDocument.size}</div>
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedNotesDoc(activeDocument.name)
                            setActiveTab("notes")
                          }}
                          className="flex-1 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded font-semibold text-zinc-300 hover:text-white transition-colors"
                        >
                          Generate Notes
                        </button>
                        <button
                          onClick={() => {
                            setSelectedVivaDoc(activeDocument.name)
                            setActiveTab("viva")
                          }}
                          className="flex-1 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded font-semibold text-zinc-300 hover:text-white transition-colors"
                        >
                          Viva Prep
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pipeline Flow Diagram */}
                <div className="border border-zinc-800/80 rounded-xl bg-zinc-950/40 backdrop-blur-md p-5 space-y-4 shadow-lg">
                  <div className="text-sm text-white font-bold">RAG Ingestion Pipeline</div>
                  <div className="space-y-4 relative pl-4 border-l border-zinc-800 text-xs text-zinc-400">
                    {[
                      { step: "1. Raw Document Ingestion", tool: "PyMuPDF parsing & page extraction", active: true },
                      { step: "2. Document Chunking", tool: `LangChain Splitter (size=${chunkSize}, overlap=${chunkOverlap})`, active: true },
                      { step: "3. Vector Representation", tool: `Ollama Embeddings (${embedModel})`, active: true },
                      { step: "4. Semantic Persistence", tool: "ChromaDB vector store collection", active: true }
                    ].map((step, idx) => (
                      <div key={idx} className="relative group">
                        <span className="absolute -left-[20px] top-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-black z-10" />
                        <div className="font-semibold text-zinc-200">{step.step}</div>
                        <div className="text-[11px] text-zinc-500">{step.tool}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ⚡ DOCUMENTS TAB ==================== */}
        {activeTab === "documents" && (
          <div className="space-y-6 animate-in fade-in duration-350">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Ingested Documents</h3>
                <p className="text-sm text-zinc-400">Documents parsed, chunked, and indexed in ChromaDB vector repository.</p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                size="sm"
                className="bg-zinc-100 hover:bg-zinc-300 text-black text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Upload PDF
              </Button>
            </div>

            {/* Document deployments table (Desktop) */}
            <div className="hidden md:block border border-zinc-800/80 rounded-xl bg-zinc-950/40 backdrop-blur-md overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-500 font-bold uppercase tracking-wider text-xs">
                    <th className="p-4">Document</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Created</th>
                    <th className="p-4">Size</th>
                    <th className="p-4">Total Chunks</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/60">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-zinc-500 font-medium">
                        No documents indexed yet. Click &quot;Upload PDF&quot; above to add papers or notes.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-zinc-900/20 transition-colors">
                        <td className="p-4 font-semibold text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="truncate max-w-[240px]" title={doc.name}>{doc.name}</span>
                        </td>
                        <td className="p-4">
                          {doc.status === "ready" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" /> Ready
                            </span>
                          )}
                          {doc.status === "failed" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" /> Failed
                            </span>
                          )}
                          {doc.status !== "ready" && doc.status !== "failed" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" /> {doc.status}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-zinc-400 font-medium">{doc.created}</td>
                        <td className="p-4 font-mono text-zinc-300">{doc.size}</td>
                        <td className="p-4 font-mono text-zinc-300">{doc.chunksCount ?? "--"}</td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                          {doc.logs && doc.logs.length > 0 && (
                            <button
                              onClick={() => setViewingLogsDoc(doc)}
                              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 font-bold cursor-pointer hover:text-white"
                            >
                              <TerminalIcon className="w-3 h-3 text-zinc-400" /> Logs
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDeleteDocument(doc.name, e)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer"
                            title="Remove document & vectors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Document deployments cards (Mobile) */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {documents.length === 0 ? (
                <div className="p-8 text-center border border-zinc-800/80 rounded-xl bg-zinc-950/40 text-zinc-500 font-medium">
                  No documents found. Upload a PDF to start.
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="border border-zinc-800/80 rounded-xl bg-zinc-950/40 backdrop-blur-md p-4 space-y-4 shadow-md hover:border-zinc-700/60 transition-all">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="font-semibold text-white text-sm truncate" title={doc.name}>{doc.name}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteDocument(doc.name, e)}
                        className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer shrink-0"
                        title="Remove document index"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500 block font-bold uppercase tracking-wider text-[10px]">Status</span>
                        <div className="mt-1">
                          {doc.status === "ready" && (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold uppercase tracking-wide">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Ready
                            </span>
                          )}
                          {doc.status === "failed" && (
                            <span className="inline-flex items-center gap-1 text-red-500 font-bold uppercase tracking-wide">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Failed
                            </span>
                          )}
                          {doc.status !== "ready" && doc.status !== "failed" && (
                            <span className="inline-flex items-center gap-1 text-amber-500 font-bold uppercase tracking-wide animate-pulse">
                              {doc.status}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-zinc-500 block font-bold uppercase tracking-wider text-[10px]">Chunks</span>
                        <span className="font-mono text-zinc-300 block mt-1">{doc.chunksCount ?? "--"}</span>
                      </div>

                      <div>
                        <span className="text-zinc-500 block font-bold uppercase tracking-wider text-[10px]">Size</span>
                        <span className="text-zinc-350 block mt-1 font-mono">{doc.size}</span>
                      </div>

                      <div>
                        <span className="text-zinc-500 block font-bold uppercase tracking-wider text-[10px]">Created</span>
                        <span className="text-zinc-350 block mt-1">{doc.created}</span>
                      </div>
                    </div>

                    {doc.logs && doc.logs.length > 0 && (
                      <div className="pt-3 border-t border-zinc-850/60">
                        <button
                          onClick={() => setViewingLogsDoc(doc)}
                          className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 font-bold cursor-pointer hover:text-white"
                        >
                          <TerminalIcon className="w-3.5 h-3.5 text-zinc-400" /> View Pipeline Logs
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Ingestion logs modal drawer if clicked */}
            {viewingLogsDoc && (
              <div className="border border-zinc-800/80 rounded-xl bg-zinc-950/60 backdrop-blur-md overflow-hidden flex flex-col h-80 animate-in slide-in-from-bottom duration-350 shadow-2xl">
                <div className="px-4 py-3 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <TerminalIcon className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                    <span className="text-xs md:text-sm text-white font-bold font-mono truncate">Pipeline Log: {viewingLogsDoc.name}</span>
                  </div>
                  <button
                    onClick={() => setViewingLogsDoc(null)}
                    className="text-zinc-500 hover:text-zinc-300 text-xs md:text-sm font-bold font-mono cursor-pointer shrink-0"
                  >
                    Close
                  </button>
                </div>
                <div className="flex-1 bg-black p-3.5 md:p-4 overflow-y-auto font-mono text-[13px] md:text-[14px] text-zinc-300 space-y-2 scrollbar-thin tracking-tight leading-relaxed">
                  {viewingLogsDoc.logs.map((log, index) => (
                    <div key={index} className="flex gap-3 md:gap-4">
                      <span className="text-zinc-500 shrink-0 select-none">[{log.timestamp}]</span>
                      <span className={`shrink-0 font-bold select-none ${
                        log.level === "ERROR" ? "text-red-500" : log.level === "WARNING" ? "text-amber-500" : "text-emerald-400"
                      }`}>
                        {log.level === "INFO" ? "SUCCESS" : log.level}
                      </span>
                      <span className="text-zinc-200">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== ⚡ REVISION NOTES TAB ==================== */}
        {activeTab === "notes" && (
          <div className="space-y-6 animate-in fade-in duration-350">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-400" />
                  AI Revision Notes Generator
                </h3>
                <p className="text-sm text-zinc-400">Generate structured, high-yield revision notes from any indexed PDF document.</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedNotesDoc}
                  onChange={(e) => setSelectedNotesDoc(e.target.value)}
                  className="p-2 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-200 font-medium cursor-pointer"
                >
                  <option value="" disabled>Select document...</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
                <Button
                  onClick={handleGenerateNotes}
                  disabled={!selectedNotesDoc || isGeneratingNotes}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4"
                >
                  {isGeneratingNotes ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                  {isGeneratingNotes ? "Generating Notes..." : "Generate Notes"}
                </Button>
              </div>
            </div>

            <div className="border border-zinc-800/80 rounded-xl bg-zinc-950/40 backdrop-blur-md p-6 min-h-[400px]">
              {isGeneratingNotes ? (
                <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                  <p className="text-sm text-zinc-300 font-medium">Synthesizing comprehensive revision notes with Ollama...</p>
                  <p className="text-xs text-zinc-500 font-mono">Organizing headings, key principles, and conceptual summaries</p>
                </div>
              ) : generatedNotes ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <span className="text-xs uppercase font-mono text-zinc-400 font-bold">
                      Document: {selectedNotesDoc}
                    </span>
                    <Button
                      onClick={() => copyToClipboard(generatedNotes, "notes")}
                      size="sm"
                      variant="outline"
                      className="text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white flex items-center gap-1.5"
                    >
                      {copiedNotes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedNotes ? "Copied!" : "Copy Notes"}
                    </Button>
                  </div>
                  <div className="prose prose-invert max-w-none text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed">
                    {generatedNotes}
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center space-y-3">
                  <GraduationCap className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h4 className="text-sm font-semibold text-zinc-400">No notes generated yet</h4>
                  <p className="text-xs text-zinc-600 max-w-md mx-auto">
                    Select a document from the dropdown above and click &quot;Generate Notes&quot; to create structured study notes.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== ⚡ VIVA EXAM PREP TAB ==================== */}
        {activeTab === "viva" && (
          <div className="space-y-6 animate-in fade-in duration-350">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileQuestion className="w-5 h-5 text-emerald-400" />
                  Oral Viva / Exam Question Generator
                </h3>
                <p className="text-sm text-zinc-400">Generate 15–20 conceptual, MCQ, and subjective viva questions with model answers.</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedVivaDoc}
                  onChange={(e) => setSelectedVivaDoc(e.target.value)}
                  className="p-2 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-200 font-medium cursor-pointer"
                >
                  <option value="" disabled>Select document...</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
                <Button
                  onClick={handleGenerateViva}
                  disabled={!selectedVivaDoc || isGeneratingViva}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4"
                >
                  {isGeneratingViva ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                  {isGeneratingViva ? "Generating Viva..." : "Generate Viva Questions"}
                </Button>
              </div>
            </div>

            <div className="border border-zinc-800/80 rounded-xl bg-zinc-950/40 backdrop-blur-md p-6 min-h-[400px]">
              {isGeneratingViva ? (
                <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-sm text-zinc-300 font-medium">Generating examiner viva questions and comprehensive solutions...</p>
                  <p className="text-xs text-zinc-500 font-mono">Formulating MCQs, True/False, and conceptual defense questions</p>
                </div>
              ) : generatedViva ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <span className="text-xs uppercase font-mono text-zinc-400 font-bold">
                      Document: {selectedVivaDoc}
                    </span>
                    <Button
                      onClick={() => copyToClipboard(generatedViva, "viva")}
                      size="sm"
                      variant="outline"
                      className="text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white flex items-center gap-1.5"
                    >
                      {copiedViva ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedViva ? "Copied!" : "Copy Questions"}
                    </Button>
                  </div>
                  <div className="prose prose-invert max-w-none text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed">
                    {generatedViva}
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center space-y-3">
                  <FileQuestion className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h4 className="text-sm font-semibold text-zinc-400">No viva exam generated yet</h4>
                  <p className="text-xs text-zinc-600 max-w-md mx-auto">
                    Select a document from the dropdown above and click &quot;Generate Viva Questions&quot; to test comprehension.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== ⚡ ANALYTICS TAB ==================== */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-in fade-in duration-350">
            <div>
              <h3 className="text-lg font-bold text-white">Search & Vector Analytics</h3>
              <p className="text-sm text-zinc-400">Live metrics across ChromaDB persistent store and query latency.</p>
            </div>

            {/* Analytics Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Avg Query Latency Card */}
              <div className="border border-zinc-800/80 rounded-xl bg-zinc-950/40 backdrop-blur-md p-5 space-y-4 shadow-lg hover:border-zinc-700/60 transition-all">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  <span>Last Query Latency</span>
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div className="text-4xl font-bold text-white font-mono">{lastLatency} ms</div>
                <div className="w-full bg-zinc-950/45 h-10 rounded overflow-hidden flex items-end gap-1 border border-zinc-850 p-1">
                  {latencyHistory.map((lat, i) => {
                    const normalizedHeight = Math.min(100, Math.max(15, (lat / 300) * 100))
                    return (
                      <div 
                        key={i} 
                        className="flex-1 bg-zinc-300 hover:bg-white transition-colors rounded-t-[1px]" 
                        style={{ height: `${normalizedHeight}%` }} 
                        title={`Latency: ${lat}ms`} 
                      />
                    )
                  })}
                </div>
                <p className="text-xs text-zinc-500">Live response time measured from actual backend queries.</p>
              </div>

              {/* Ingested Documents Card */}
              <div className="border border-zinc-800/80 rounded-xl bg-zinc-950/40 backdrop-blur-md p-5 space-y-4 shadow-lg hover:border-zinc-700/60 transition-all">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  <span>Active Documents</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-4xl font-bold text-white font-mono">{documents.length}</div>
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-zinc-500 font-medium">
                    <span>Repository Status</span>
                    <span className="text-emerald-400 font-bold">Synchronized</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Total PDF files currently indexed in storage.</p>
              </div>

              {/* Chunk Density Card */}
              <div className="border border-zinc-800/80 rounded-xl bg-zinc-950/40 backdrop-blur-md p-5 space-y-4 shadow-lg hover:border-zinc-700/60 transition-all">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  <span>ChromaDB Vector Count</span>
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div className="text-4xl font-bold text-white font-mono">
                  {totalChunks} Chunks
                </div>
                <div className="space-y-2 pt-1.5 text-xs text-zinc-400">
                  <div className="flex justify-between border-b border-zinc-850/60 py-1">
                    <span className="text-zinc-500">Index Collection</span>
                    <span className="font-mono text-zinc-300">pdf_chunked</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Vector Dimension</span>
                    <span className="font-mono text-zinc-300">768-dim ({embedModel})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ⚡ SETTINGS TAB ==================== */}
        {activeTab === "settings" && (
          <div className="space-y-8 animate-in fade-in duration-350">
            <div>
              <h3 className="text-xl font-bold text-white">Repository Settings</h3>
              <p className="text-sm text-zinc-400">Configure chunk parameters and local embedding model options.</p>
            </div>

            {/* Settings Card: Chunk Boundaries */}
            <div className="border border-zinc-800/80 rounded-xl bg-zinc-950/40 backdrop-blur-md overflow-hidden shadow-lg">
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-base font-semibold text-white">Text Splitter Parameters</h4>
                  <p className="text-sm text-zinc-500 mt-1">Configure chunk sizes and overlapping ranges used by the LangChain splitter during upload.</p>
                </div>

                <div className="space-y-5 max-w-xl">
                  {/* Chunk Size */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-zinc-300 font-medium">
                      <span>Chunk Size (characters)</span>
                      <span className="font-mono text-white font-bold">{chunkSize} chars</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="1500"
                      step="50"
                      value={chunkSize}
                      onChange={(e) => setChunkSize(Number(e.target.value))}
                      className="w-full accent-white cursor-pointer bg-zinc-900 rounded-lg appearance-none h-1"
                    />
                  </div>

                  {/* Chunk Overlap */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-zinc-300 font-medium">
                      <span>Chunk Overlap (characters)</span>
                      <span className="font-mono text-white font-bold">{chunkOverlap} chars</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="10"
                      value={chunkOverlap}
                      onChange={(e) => setChunkOverlap(Number(e.target.value))}
                      className="w-full accent-white cursor-pointer bg-zinc-900 rounded-lg appearance-none h-1"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-3.5 bg-zinc-900/30 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 font-mono">
                <span>Applied automatically on the next PDF ingestion</span>
                <span className="text-emerald-400 font-bold">Live Synced</span>
              </div>
            </div>

            {/* Settings Card: Embedding Model Config */}
            <div className="border border-zinc-800/80 rounded-xl bg-zinc-950/40 backdrop-blur-md overflow-hidden shadow-lg">
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-base font-semibold text-white">Ollama Embedding Model</h4>
                  <p className="text-sm text-zinc-500 mt-1">Select the semantic embedding model utilized by Ollama.</p>
                </div>

                <div className="max-w-md">
                  <select
                    value={embedModel}
                    onChange={(e) => setEmbedModel(e.target.value)}
                    className="w-full p-2.5 bg-black border border-zinc-800 rounded-lg text-sm text-zinc-300 outline-none focus:border-zinc-500 cursor-pointer font-medium"
                  >
                    <option value="nomic-embed-text">nomic-embed-text (768-dim, Default)</option>
                    <option value="bge-large-en-v1.5">bge-large-en-v1.5 (1024-dim, High Precision)</option>
                    <option value="all-minilm">all-minilm (384-dim, Fast)</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-3.5 bg-zinc-900/30 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 font-mono">
                <span>Ensure the model is pulled locally (<code className="text-zinc-300">ollama pull {embedModel}</code>)</span>
                <span className="text-zinc-400">Ready</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 📑 Sidebar Drawer Overlay: Selected Citation Context Viewer */}
      {activeCitation && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-zinc-950 border-l border-zinc-800 shadow-2xl p-6 z-50 flex flex-col text-zinc-100 transition-all duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-850">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-zinc-400" />
              <h3 className="font-semibold text-sm text-white uppercase tracking-wider">Source Citation Excerpt</h3>
            </div>
            <button
              onClick={() => setActiveCitation(null)}
              className="text-zinc-500 hover:text-white text-sm font-bold font-mono hover:bg-zinc-900 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Source Document</label>
              <div className="text-sm text-zinc-200 bg-zinc-900/40 p-3 rounded border border-zinc-850 truncate font-semibold">
                {activeCitation.sourceName}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900/40 p-3 rounded border border-zinc-850">
                <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Page Reference</span>
                <p className="text-sm font-bold text-zinc-100 font-mono mt-1">Page {activeCitation.pageNumber}</p>
              </div>
              <div className="bg-zinc-900/40 p-3 rounded border border-zinc-850">
                <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Similarity Score</span>
                <p className="text-sm font-bold text-emerald-400 font-mono mt-1">{Math.round(activeCitation.score * 100)}% Match</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Retrieved Text Segment</label>
              <div className="text-sm leading-relaxed text-zinc-300 bg-zinc-900/40 p-4 rounded border border-zinc-850 italic font-mono">
                &quot;{activeCitation.snippet}&quot;
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-850 text-center">
            <p className="text-xs text-zinc-500 flex items-center justify-center gap-1 font-mono">
              <span>ChromaDB Cosine Proximity</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
