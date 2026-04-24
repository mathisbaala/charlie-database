type MetricBucket = {
  count: number;
  errors: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  durations: number[];
  statuses: Record<string, number>;
  lastSuccessAt?: string;
  lastErrorAt?: string;
};

const apiMetrics = new Map<string, MetricBucket>();
const upstreamMetrics = new Map<string, MetricBucket>();

function createBucket(): MetricBucket {
  return {
    count: 0,
    errors: 0,
    totalMs: 0,
    minMs: Number.POSITIVE_INFINITY,
    maxMs: 0,
    durations: [],
    statuses: {},
  };
}

function getBucket(map: Map<string, MetricBucket>, key: string): MetricBucket {
  const existing = map.get(key);
  if (existing) return existing;
  const created = createBucket();
  map.set(key, created);
  return created;
}

function addDuration(bucket: MetricBucket, durationMs: number) {
  const rounded = Math.max(0, Math.round(durationMs));
  bucket.durations.push(rounded);
  if (bucket.durations.length > 300) bucket.durations.shift();
}

function record(bucket: MetricBucket, status: number, durationMs: number) {
  bucket.count += 1;
  bucket.totalMs += durationMs;
  bucket.minMs = Math.min(bucket.minMs, durationMs);
  bucket.maxMs = Math.max(bucket.maxMs, durationMs);
  addDuration(bucket, durationMs);

  const statusKey = String(status);
  bucket.statuses[statusKey] = (bucket.statuses[statusKey] || 0) + 1;

  if (status >= 500 || status === 0) {
    bucket.errors += 1;
    bucket.lastErrorAt = new Date().toISOString();
  } else {
    bucket.lastSuccessAt = new Date().toISOString();
  }
}

export function recordApiMetric(route: string, status: number, durationMs: number) {
  const bucket = getBucket(apiMetrics, route);
  record(bucket, status, durationMs);
}

export function recordUpstreamMetric(name: string, status: number, durationMs: number) {
  const bucket = getBucket(upstreamMetrics, name);
  record(bucket, status, durationMs);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function formatBucket(bucket: MetricBucket) {
  const avgMs = bucket.count ? bucket.totalMs / bucket.count : 0;
  const errorRate = bucket.count ? bucket.errors / bucket.count : 0;

  return {
    count: bucket.count,
    errors: bucket.errors,
    error_rate: Number(errorRate.toFixed(4)),
    latency: {
      avg_ms: Number(avgMs.toFixed(2)),
      p50_ms: percentile(bucket.durations, 50),
      p95_ms: percentile(bucket.durations, 95),
      min_ms: Number.isFinite(bucket.minMs) ? Math.round(bucket.minMs) : 0,
      max_ms: Math.round(bucket.maxMs),
    },
    statuses: bucket.statuses,
    last_success_at: bucket.lastSuccessAt,
    last_error_at: bucket.lastErrorAt,
  };
}

function mapToJson(map: Map<string, MetricBucket>) {
  return Object.fromEntries(Array.from(map.entries()).map(([key, bucket]) => [key, formatBucket(bucket)]));
}

export function getMetricsSnapshot() {
  return {
    generated_at: new Date().toISOString(),
    api: mapToJson(apiMetrics),
    upstream: mapToJson(upstreamMetrics),
  };
}
