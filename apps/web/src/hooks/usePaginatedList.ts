import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, apiErrorMessage, type PageResult } from '../services/api';

export function usePaginatedList<T>(path: string, limit = 20) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(
    async (currentPage: number, currentQ: string) => {
      const id = ++requestId.current;
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(currentPage), limit: String(limit) });
        if (currentQ.trim()) params.set('q', currentQ.trim());
        const result = await apiRequest<PageResult<T>>(`${path}?${params}`);
        if (id !== requestId.current) return;
        const lastPage = Math.max(1, Math.ceil(result.total / limit));
        if (currentPage > lastPage) { setPage(lastPage); return; }
        setData(result.data);
        setTotal(result.total);
      } catch (cause) {
        if (id === requestId.current) { setData([]); setError(apiErrorMessage(cause)); }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [path, limit],
  );

  useEffect(() => {
    const requests = requestId;
    const timer = setTimeout(() => void load(page, q), 300);
    return () => { clearTimeout(timer); requests.current++; };
  }, [page, q, load]);

  function search(value: string) {
    setQ(value);
    setPage(1);

  }

  function goTo(p: number) {
    setPage(Math.max(1, p));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return { data, total, page, totalPages, q, loading, error, search, goTo, reload: () => void load(page, q) };
}
