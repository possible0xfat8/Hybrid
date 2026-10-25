import { execSync } from 'child_process';

const isBackendOnly =
  process.env.BACKEND_ONLY === 'true' ||
  process.env.RENDER === 'true' ||
  Boolean(process.env.RENDER_SERVICE_ID);

if (isBackendOnly) {
  console.log('[BUILD] Render backend-only deployment detected: skipping Next.js static build.');
  console.log('[BUILD] Backend server will run via "npm run start:server" (tsx server/index.ts).');
  process.exit(0);
}

console.log('[BUILD] Building Next.js application for frontend deployment...');
try {
  execSync('next build', { stdio: 'inherit' });
} catch (err) {
  console.error('[BUILD] Next.js build failed.');
  process.exit(1);
}
