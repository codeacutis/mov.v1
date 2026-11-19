import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, apiErrorMessage, type PageResult } from '../services/api';

export function usePaginatedList<T>(path: string, limit = 20) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (currentPage: number, currentQ: string) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(currentPage), limit: String(limit) });
        if (currentQ.trim()) params.set('q', currentQ.trim());
        const result = await apiRequest<PageResult<T>>(`${path}?${params}`);
        setData(result.data);
        setTotal(result.total);
      } catch (cause) {
        setError(apiErrorMessage(cause));
      } finally {
        setLoading(false);
      }
    },
    [path, limit],
  );

  useEffect(() => {
    void load(page, q);
  }, [page, q, load]);

  function search(value: string) {
    setQ(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void load(1, value), 400);
  }

  function goTo(p: number) {
    setPage(p);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return { data, total, page, totalPages, q, loading, error, search, goTo, reload: () => void load(page, q) };
}
