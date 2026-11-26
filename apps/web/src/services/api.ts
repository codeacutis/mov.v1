const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const TOKEN_KEY = 'mov.accessToken';

export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
    if (error.status === 403) return 'Você não tem permissão para realizar esta ação.';
    if (error.status === 404) return 'O registro ou recurso solicitado n?o foi encontrado.';
    if (error.status === 409) return error.message;
    if (error.status >= 500) return 'Erro interno do servidor. Tente novamente mais tarde.';
    return error.message;
  }
  if (error instanceof TypeError) return 'Não foi possível acessar a API. Confira se o backend está em execução.';
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function saveAccessToken(token: string, keepConnected: boolean): void {
  clearAccessToken();
  const storage = keepConnected ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload: unknown = response.status === 204
    ? undefined
    : await response.json().catch(() => undefined);

  if (!response.ok) {
    const body = payload as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message)
      ? body.message.join(' ')
      : body?.message || 'Não foi possível concluir a operação.';
    throw new ApiRequestError(message, response.status);
  }
  return payload as T;
}

export async function fetchAllPages<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const limit = 100;
  const fetchPage = (page: number) =>
    apiRequest<PageResult<T>>(`${path}?page=${page}&limit=${limit}`, { signal });
  const first = await fetchPage(1);
  const records = [...first.data];
  const totalPages = Math.ceil(first.total / first.limit);

  for (let page = 2; page <= totalPages; page++) {
    const result = await fetchPage(page);
    records.push(...result.data);
  }

  return records;
}
