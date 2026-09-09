import type { CorsOptions } from 'cors';
import { env, parseCorsOrigins } from './env';

// See parseCorsOrigins in config/env.ts for the comma-separated parsing
// (trims whitespace, drops empty entries). A single configured origin
// parses to a one-element array, so the allowlist check below behaves
// exactly like the prior single-string comparison in that case.
const allowedOrigins = parseCorsOrigins(env.CORS_ORIGIN);

export const corsOptions: CorsOptions = {
  // A request with no Origin header (server-to-server calls, curl, the
  // /health check) isn't subject to browser same-origin enforcement in the
  // first place, so it's let through here unconditionally — only an actual
  // cross-origin browser request carries an Origin header, and that is
  // checked against the configured allowlist. An origin not in the list is
  // rejected via callback(null, false) rather than thrown as an error,
  // which correctly omits the CORS headers (browser blocks it) instead of
  // failing the request with a 500.
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
};
