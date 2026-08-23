/**
 * firebase-node-shim.ts
 *
 * Patches `import.meta.env` for tsx/Node test execution.
 * Import this as the VERY FIRST import in any test script that uses firebase.ts.
 *
 * Usage: import './firebase-node-shim.js'   (before any firebase import)
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local into process.env
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.substring(0, eq).trim();
    const value = line.substring(eq + 1).trim().replace(/^["']|["']$/g, ''); // strip quotes
    process.env[key] = value;
  }
} catch {
  // .env.local missing — rely on shell env vars already being set
}

// Install import.meta.env shim so firebase.ts can read VITE_ variables
// This must be done before firebase.ts is imported.
const metaEnv: Record<string, string | undefined> = {};
for (const [k, v] of Object.entries(process.env)) {
  metaEnv[k] = v;
}

// @ts-ignore — injecting into globalThis for the Node ESM shim
globalThis.__vite_meta_env__ = metaEnv;

// Override import.meta for modules that reference import.meta.env
// tsx resolves import.meta at module load time, so we patch via
// a global that firebase.ts can reference.
// However, since firebase.ts uses import.meta.env directly, the
// safest approach is to set the Node equivalent that tsx intercepts.
// tsx >= 4.x supports --env-file natively, but we patch here as backup.
Object.defineProperty(globalThis, 'importMeta', {
  value: { env: metaEnv },
  writable: true,
  configurable: true,
});
