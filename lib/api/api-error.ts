export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Server error shape: {"detail", "code", "fields": {"field": ["msg"]}}. */
  get code(): string | undefined {
    const d = this.data as { code?: unknown } | undefined;
    return typeof d?.code === 'string' ? d.code : undefined;
  }
}

/** One human-readable line for any thrown error. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof TypeError) return 'Could not reach the server. Check your connection.';
  return fallback;
}

/** Field errors from the server, first message per field. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const d = error.data as { fields?: Record<string, unknown> } | undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(d?.fields ?? {})) {
    if (Array.isArray(v) && typeof v[0] === 'string') out[k] = v[0];
    else if (typeof v === 'string') out[k] = v;
  }
  return out;
}

export function isApiCode(error: unknown, code: string): error is ApiError {
  return error instanceof ApiError && error.code === code;
}
