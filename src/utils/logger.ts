type Level = 'error' | 'warn' | 'info' | 'debug';

const rank: Record<Level, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const configured = rank[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? 2;

function log(level: Level, fn: string, message: string, meta?: unknown): void {
  if (rank[level] > configured) return;
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    fn,
    message,
  };
  if (meta !== undefined) entry['meta'] = meta;
  const out = JSON.stringify(entry);
  level === 'error' ? console.error(out) : console.log(out);
}

export const logger = {
  info: (fn: string, msg: string, meta?: unknown) => log('info', fn, msg, meta),
  debug: (fn: string, msg: string, meta?: unknown) => log('debug', fn, msg, meta),
  warn: (fn: string, msg: string, meta?: unknown) => log('warn', fn, msg, meta),
  error: (fn: string, msg: string, meta?: unknown) => log('error', fn, msg, meta),
};
