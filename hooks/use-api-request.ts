'use client';

import { useCallback, useState } from 'react';
import { defaultState, type RequestState } from '@/components/home/request-state';

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class ApiRequestError extends Error {
  requestId?: string;
  status?: number;
  code?: string;

  constructor(message: string, options?: { requestId?: string; status?: number; code?: string }) {
    super(message);
    this.name = 'ApiRequestError';
    this.requestId = options?.requestId;
    this.status = options?.status;
    this.code = options?.code;
  }
}

export function useApiRequest<T>() {
  const [state, setState] = useState<RequestState<T>>(defaultState);

  const execute = useCallback(async (request: () => Promise<T>) => {
    setState({ loading: true, error: null, data: null });
    try {
      const data = await request();
      setState({ loading: false, error: null, data });
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
        data: null,
      });
    }
  }, []);

  return { state, execute };
}

export async function fetchJsonOrThrow<T>(url: string, init?: RequestInit): Promise<T> {
  const requestId = createRequestId();
  const headers = new Headers(init?.headers);
  if (!headers.get('x-request-id')) {
    headers.set('x-request-id', requestId);
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });
  const responseRequestId = res.headers.get('x-request-id') || requestId;
  const json = (await res.json()) as T & { error?: string; code?: string; request_id?: string };
  if (!res.ok || json.error) {
    const finalRequestId = json.request_id || responseRequestId;
    const baseMessage = json.error ?? 'Erreur API';
    const message = finalRequestId ? `${baseMessage} (request_id: ${finalRequestId})` : baseMessage;
    throw new ApiRequestError(message, {
      requestId: finalRequestId,
      status: res.status,
      code: json.code,
    });
  }
  return json;
}
