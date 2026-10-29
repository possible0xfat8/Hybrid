import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const isTsxActive =
  process.execArgv.some((arg) => arg.includes('tsx')) ||
  Boolean(process.env.__TSX_BOOTSTRAPPED);

if (!isTsxActive) {
  process.env.__TSX_BOOTSTRAPPED = '1';
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', fileURLToPath(import.meta.url)],
    {
      stdio: 'inherit',
      env: process.env,
    }
  );

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    }
    process.exit(code ?? 0);
  });
} else {
  import('./server/index');
}
