import axios from 'axios'
import { applySecurityInterceptor } from './securityInterceptor'

const API_BASE_URL = 'https://api.letchat.in'

// ---------------------------------------------------------------------------
// Axios instance for the customer-facing chat widget.
// ---------------------------------------------------------------------------
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  withCredentials: true, // Send cookies with cross-domain requests
})

// Attach security headers and optional static API key from env (no user login required).
applySecurityInterceptor(apiClient)
apiClient.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_API_KEY as string | undefined
  if (apiKey) {
    config.headers = config.headers ?? {}
    config.headers['Authorization'] = `Bearer ${apiKey}`
  }
  return config
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface QueryRequest {
  query: string
  top_k?: number
}

export interface QueryResponse {
  query: string
  response: string
  sources: string[]
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Document Summary types
// ---------------------------------------------------------------------------
export interface DocumentSummary {
  summary_name: string
  source: string
  content_type: string
  created_at?: string
  updated_at?: string
}

export interface DocumentDetail extends DocumentSummary {
  description: string
  context_block: string
}

/** GET /api/chat-assistants/{id}/documents */
export async function listDocuments(chatAssistantId: string): Promise<DocumentSummary[]> {
  const { data } = await apiClient.get<{ documents: DocumentSummary[] } | DocumentSummary[]>(
    `/api/chat-assistants/${encodeURIComponent(chatAssistantId)}/documents`,
  )
  if (Array.isArray(data)) return data
  if (data && Array.isArray((data as { documents: DocumentSummary[] }).documents)) {
    return (data as { documents: DocumentSummary[] }).documents
  }
  return []
}

/** GET /api/chat-assistants/{id}/documents/{source} */
export async function getDocument(
  chatAssistantId: string,
  source: string,
): Promise<DocumentDetail> {
  const { data } = await apiClient.get<DocumentDetail>(
    `/api/chat-assistants/${encodeURIComponent(chatAssistantId)}/documents/${encodeURIComponent(source)}`,
  )
  return data
}

/** POST /api/query — run a RAG query (HTTP fallback) */
export async function queryRag(slugName: string, payload: QueryRequest): Promise<QueryResponse> {
  const { data } = await apiClient.post<QueryResponse>(`/api/chat-assistants/by-slug/${slugName}/query`, payload)
  return data
}

/** WebSocket URL for the streaming RAG query endpoint */
export function getQueryWsUrl(slugName: string): string {
  const wsOrigin = API_BASE_URL.replace(/^http/, 'ws').replace(/\/+$/, '')
  return `${wsOrigin}/api/ws/chat-assistants/by-slug/${slugName}/query`
}
