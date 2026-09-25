export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    if ((window as any).oreConfig?.apiUrl) {
      return (window as any).oreConfig.apiUrl;
    }
    const saved = localStorage.getItem("ore_api_url");
    if (saved) return saved;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

export interface LogLine {
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR";
  message: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  size: string;
  status: "ready" | "ingesting" | "chunking" | "embedding" | "failed";
  created: string;
  environment: "production" | "preview";
  chunksCount?: number;
  charCount?: number;
  pages?: number;
  logs: LogLine[];
}

export interface Citation {
  sourceName: string;
  pageNumber: number;
  snippet: string;
  score: number;
}

export interface ProviderStatus {
  active_provider: string;
  ready: boolean;
  message: string;
  ollama: {
    available: boolean;
    models: string[];
  };
  gemini: {
    has_key: boolean;
    model?: string;
  };
  openai: {
    has_key: boolean;
    model?: string;
  };
}

export interface HealthResponse {
  status: string;
  documents_count?: number;
  total_chunks?: number;
  provider?: ProviderStatus;
}

export interface AppSettings {
  provider: string;
  ollama_base_url?: string;
  ollama_chat_model?: string;
  ollama_embed_model?: string;
  gemini_api_key?: string;
  gemini_api_key_masked?: string;
  gemini_chat_model?: string;
  gemini_embed_model?: string;
  openai_api_key?: string;
  openai_api_key_masked?: string;
  openai_base_url?: string;
  openai_chat_model?: string;
  openai_embed_model?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  id?: string;
  filename?: string;
  name?: string;
  size?: string;
  pages?: number;
  chunks?: number;
  chunksCount?: number;
  charCount?: number;
  logs?: LogLine[];
}

export interface DocumentsResponse {
  documents: DocumentItem[];
  total_chunks: number;
}

export interface AskResponse {
  answer: string;
  citations?: Citation[];
}

export interface NotesResponse {
  success: boolean;
  notes: string;
}

export interface VivaResponse {
  success: boolean;
  viva: string;
}

export async function checkBackendHealth(): Promise<{ isOnline: boolean; data?: HealthResponse }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/health`, {
      method: "GET",
      mode: "cors",
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return { isOnline: true, data };
    }
    return { isOnline: false };
  } catch {
    return { isOnline: false };
  }
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch(`${getApiBaseUrl()}/settings`, {
    method: "GET",
    mode: "cors",
    headers: { "Accept": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch settings: ${res.statusText}`);
  }
  return res.json();
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; settings: AppSettings; status: ProviderStatus }> {
  const res = await fetch(`${getApiBaseUrl()}/settings`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    throw new Error(`Failed to update settings: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchProviderStatus(): Promise<ProviderStatus> {
  const res = await fetch(`${getApiBaseUrl()}/settings/status`, {
    method: "GET",
    mode: "cors",
    headers: { "Accept": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch provider status: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchDocuments(): Promise<DocumentsResponse> {
  const res = await fetch(`${getApiBaseUrl()}/documents`, {
    method: "GET",
    mode: "cors",
    headers: { "Accept": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch documents: ${res.statusText}`);
  }
  return res.json();
}

export async function uploadPdf(
  file: File,
  options?: { chunkSize?: number; chunkOverlap?: number }
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.chunkSize) {
    formData.append("chunk_size", options.chunkSize.toString());
  }
  if (options?.chunkOverlap) {
    formData.append("chunk_overlap", options.chunkOverlap.toString());
  }

  const res = await fetch(`${getApiBaseUrl()}/upload`, {
    method: "POST",
    mode: "cors",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed (${res.status}): ${errText}`);
  }

  return res.json();
}

export async function deleteDocument(filename: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${getApiBaseUrl()}/documents/${encodeURIComponent(filename)}`, {
    method: "DELETE",
    mode: "cors",
  });
  if (!res.ok) {
    throw new Error(`Delete failed: ${res.statusText}`);
  }
  return res.json();
}

export async function askQuestion(question: string): Promise<AskResponse> {
  const res = await fetch(`${getApiBaseUrl()}/ask`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Query failed (${res.status}): ${errText}`);
  }

  return res.json();
}

export async function generateRevisionNotes(params: { text?: string; filename?: string }): Promise<NotesResponse> {
  const res = await fetch(`${getApiBaseUrl()}/notes`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Notes generation failed (${res.status}): ${errText}`);
  }

  return res.json();
}

export async function generateVivaExam(params: { text?: string; filename?: string }): Promise<VivaResponse> {
  const res = await fetch(`${getApiBaseUrl()}/viva`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Viva generation failed (${res.status}): ${errText}`);
  }

  return res.json();
}
