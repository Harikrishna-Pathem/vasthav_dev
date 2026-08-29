/** Stable envelope used by API clients. Domain types remain close to their owning modules. */
export interface ApiError { code: string; message: string; requestId?: string; }
export interface ApiFailure { success: false; error: ApiError; }
