export function validateWebOrigin(env: Record<string, unknown>): void {
  if (env.NODE_ENV !== 'production') return;
  const value = env.WEB_ORIGIN;
  if (typeof value !== 'string') throw new Error('WEB_ORIGIN obrigatória em produção');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('WEB_ORIGIN inválida'); }
  if (url.protocol !== 'https:' || url.origin !== value || url.username || url.password) throw new Error('WEB_ORIGIN deve ser uma origem HTTPS exata');
}
