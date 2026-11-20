
import { useCallback, useEffect, useState } from 'react';
import {
  apiRequest,
  apiErrorMessage,
  type PageResult,
} from '../services/api';

export function usePaginatedList<T>(
  path: string,
  limit = 20,
) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ativo = true;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      if (!ativo) return;

      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });

        if (q.trim()) {
          params.set('q', q.trim());
        }

        const result = await apiRequest<PageResult<T>>(
          `${path}?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!ativo) return;

        setData(result.data);
        setTotal(result.total);
      } catch (cause) {
        if (!ativo || controller.signal.aborted) return;

        setError(apiErrorMessage(cause));
      } finally {
        if (ativo && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 400);

    return () => {
      ativo = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [path, page, q, limit, reloadKey]);

  const search = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  const goTo = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  const reload = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  const totalPages = Math.max(
    1,
    Math.ceil(total / limit),
  );

  return {
    data,
    total,
    page,
    totalPages,
    q,
    loading,
    error,
    search,
    goTo,
    reload,
  };
}
