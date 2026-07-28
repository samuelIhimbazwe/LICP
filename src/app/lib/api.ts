const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const fallback =
      response.status === 502 || response.status === 503 || response.status === 504
        ? 'Cannot reach the API. Start the server with npm run dev:api.'
        : 'Request failed';
    throw new ApiError(
      data.error ?? fallback,
      response.status,
      data.code,
      data.details
    );
  }

  return data as T;
}

export async function apiRequestSafe<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    return await apiRequest<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof TypeError) {
      throw new ApiError(
        'Cannot reach the API. Start the server with npm run dev:api.',
        0,
        'NETWORK_ERROR'
      );
    }
    throw new ApiError('An unexpected error occurred.', 0, 'UNKNOWN');
  }
}

export async function downloadCsv(path: string, filename: string): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(data.error ?? 'Download failed', response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Authenticated binary download (PDF, etc.) */
export async function downloadAuthenticated(path: string, filename: string): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(data.error ?? 'Download failed', response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export { API_BASE };
