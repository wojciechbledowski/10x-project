import { useEffect, useRef, useCallback, useState } from "react";

interface UsePollingOptions<T> {
  interval: number;
  enabled: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  shouldStopPolling?: (data: T) => boolean;
}

/**
 * Generic polling hook for fetching data at regular intervals
 */
export function usePolling<T>(
  url: string,
  { interval, enabled, onSuccess, onError, shouldStopPolling }: UsePollingOptions<T>
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const poll = useCallback(async () => {
    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: T = await response.json();
      setData(result);
      setError(null);

      if (onSuccess) {
        onSuccess(result);
      }

      // Check if we should stop polling
      if (shouldStopPolling && shouldStopPolling(result)) {
        stopPolling();
      }
    } catch (err) {
      // Only handle non-abort errors
      if (!(err instanceof Error) || err.name !== "AbortError") {
        const error = err instanceof Error ? err : new Error("Polling failed");
        setError(error);
        if (onError) {
          onError(error);
        }
      }
    }
  }, [url, onSuccess, onError, shouldStopPolling, stopPolling]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setIsPolling(true);
    pollingIntervalRef.current = setInterval(poll, interval);
  }, [poll, interval]);

  // Start/stop polling based on enabled flag
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, startPolling, stopPolling]);

  return {
    data,
    error,
    isPolling,
    startPolling,
    stopPolling,
    poll,
  };
}
