export type LogLevel = 'info' | 'warn' | 'error';
const LEVEL_WEIGHT: Record<LogLevel, number> = {
  info: 10,
  warn: 20,
  error: 30,
};

function getThreshold(): LogLevel {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (configured === 'info' || configured === 'warn' || configured === 'error') {
    return configured;
  }
  // Keep tests quiet unless explicitly configured.
  if (process.env.NODE_ENV === 'test') return 'error';
  return 'info';
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

function emit(level: LogLevel, event: string, fields?: Record<string, unknown>, error?: unknown) {
  const threshold = getThreshold();
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[threshold]) return;

  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(fields ?? {}),
  };

  if (error !== undefined) {
    payload.error = serializeError(error);
  }

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logInfo(event: string, fields?: Record<string, unknown>) {
  emit('info', event, fields);
}

export function logWarn(event: string, fields?: Record<string, unknown>) {
  emit('warn', event, fields);
}

export function logError(event: string, fields?: Record<string, unknown>, error?: unknown) {
  emit('error', event, fields, error);
}
