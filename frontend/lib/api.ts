const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export interface HealthResponse {
  status: string;
  documents_count?: number;
  total_chunks?: number;
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
    const res = await fetch(`${API_BASE_URL}/health`, {
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

export async function fetchDocuments(): Promise<DocumentsResponse> {
  const res = await fetch(`${API_BASE_URL}/documents`, {
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

  const res = await fetch(`${API_BASE_URL}/upload`, {
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
  const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(filename)}`, {
    method: "DELETE",
    mode: "cors",
  });
  if (!res.ok) {
    throw new Error(`Delete failed: ${res.statusText}`);
  }
  return res.json();
}

export async function askQuestion(question: string): Promise<AskResponse> {
  const res = await fetch(`${API_BASE_URL}/ask`, {
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
  const res = await fetch(`${API_BASE_URL}/notes`, {
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
  const res = await fetch(`${API_BASE_URL}/viva`, {
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
