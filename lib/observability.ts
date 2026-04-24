import { getRateLimitHealth } from './rate-limit';

export async function getObservabilityHealth() {
  const redis = await getRateLimitHealth();

  return {
    otel: {
      service_name: process.env.OTEL_SERVICE_NAME?.trim() || 'charlie-database',
      exporter_endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() || null,
      verbose: process.env.NEXT_OTEL_VERBOSE === '1',
      enabled: true,
    },
    rate_limit: redis,
  };
}
