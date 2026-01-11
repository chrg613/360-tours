import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';

/**
 * WebSocket job update message structure
 */
export interface AIJobUpdate {
  type: 'job_update' | 'notification' | 'heartbeat' | 'connected' | 'error';
  job_id?: string;
  data?: {
    status: string;
    progress: number;
    result?: Record<string, unknown>;
    error_message?: string;
  };
  message?: string;
}

/**
 * WebSocket connection state
 */
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Hook options
 */
interface UseAIJobWebSocketOptions {
  /** Called when a job update is received */
  onUpdate?: (update: AIJobUpdate) => void;
  /** Called when the job completes */
  onComplete?: (result: Record<string, unknown>) => void;
  /** Called when the job fails */
  onError?: (error: string) => void;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in ms (default: 3000) */
  reconnectDelay?: number;
}

/**
 * Hook for real-time AI job progress updates via WebSocket.
 *
 * @param jobId - The AI job ID to subscribe to (null to not connect)
 * @param options - Configuration options
 * @returns Connection state and control functions
 *
 * @example
 * ```tsx
 * const { state, disconnect } = useAIJobWebSocket(jobId, {
 *   onUpdate: (update) => {
 *     setProgress(update.data?.progress ?? 0);
 *   },
 *   onComplete: (result) => {
 *     console.log('Job completed:', result);
 *   },
 *   onError: (error) => {
 *     console.error('Job failed:', error);
 *   },
 * });
 * ```
 */
export function useAIJobWebSocket(
  jobId: string | null,
  options: UseAIJobWebSocketOptions = {}
) {
  const {
    onUpdate,
    onComplete,
    onError,
    autoReconnect = true,
    reconnectDelay = 3000,
  } = options;

  const [state, setState] = useState<WebSocketState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { tokens } = useAuthStore();

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setState('disconnected');
  }, [cleanup]);

  const connect = useCallback(() => {
    if (!jobId || !tokens?.access_token) {
      return;
    }

    cleanup();
    setState('connecting');

    // Build WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiHost = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000';
    const wsUrl = `${wsProtocol}//${apiHost}/ws/jobs/${jobId}?token=${encodeURIComponent(tokens.access_token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setState('connected');

      // Set up ping interval for keep-alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as AIJobUpdate;

        // Handle different message types
        if (data.type === 'job_update' && data.data) {
          onUpdate?.(data);

          if (data.data.status === 'completed' && data.data.result) {
            onComplete?.(data.data.result);
            // Job is done, disconnect
            disconnect();
          } else if (data.data.status === 'failed') {
            onError?.(data.data.error_message || 'Job failed');
            disconnect();
          }
        } else if (data.type === 'error') {
          onError?.(data.message || 'WebSocket error');
        }
      } catch (e) {
        // Handle pong response (plain text)
        if (event.data === 'pong') {
          return;
        }
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = () => {
      setState('error');
    };

    ws.onclose = () => {
      cleanup();
      setState('disconnected');

      // Auto-reconnect if enabled and we have a job ID
      if (autoReconnect && jobId && tokens?.access_token) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectDelay);
      }
    };
  }, [jobId, tokens?.access_token, onUpdate, onComplete, onError, autoReconnect, reconnectDelay, cleanup, disconnect]);

  // Connect when jobId changes
  useEffect(() => {
    if (jobId && tokens?.access_token) {
      connect();
    }

    return () => {
      cleanup();
    };
  }, [jobId, tokens?.access_token, connect, cleanup]);

  return {
    /** Current WebSocket connection state */
    state,
    /** Manually disconnect the WebSocket */
    disconnect,
    /** Manually reconnect the WebSocket */
    reconnect: connect,
    /** Whether the WebSocket is currently connected */
    isConnected: state === 'connected',
  };
}

/**
 * Hook for user-level notifications via WebSocket.
 *
 * @param options - Configuration options
 * @returns Connection state and control functions
 */
export function useUserNotifications(
  options: {
    onNotification?: (notification: Record<string, unknown>) => void;
    autoReconnect?: boolean;
  } = {}
) {
  const { onNotification, autoReconnect = true } = options;

  const [state, setState] = useState<WebSocketState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { tokens, isAuthenticated } = useAuthStore();

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!isAuthenticated || !tokens?.access_token) {
      return;
    }

    cleanup();
    setState('connecting');

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiHost = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000';
    const wsUrl = `${wsProtocol}//${apiHost}/ws/user?token=${encodeURIComponent(tokens.access_token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setState('connected');

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification' && data.data) {
          onNotification?.(data.data);
        }
      } catch (e) {
        if (event.data !== 'pong') {
          console.error('Failed to parse notification:', e);
        }
      }
    };

    ws.onerror = () => {
      setState('error');
    };

    ws.onclose = () => {
      cleanup();
      setState('disconnected');

      if (autoReconnect && isAuthenticated) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };
  }, [isAuthenticated, tokens?.access_token, onNotification, autoReconnect, cleanup]);

  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      connect();
    }

    return cleanup;
  }, [isAuthenticated, tokens?.access_token, connect, cleanup]);

  return {
    state,
    isConnected: state === 'connected',
    reconnect: connect,
    disconnect: cleanup,
  };
}
