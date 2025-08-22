import { Platform } from 'react-native';
import { DIAG } from './diagnostics';

let installed = false;

export function installConsoleTap() {
  if (installed) return;
  installed = true;
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    try {
      const msg = String(args[0] ?? '');
      DIAG.push({ level: 'error', code: 'LOG_ERROR', scope: 'console', message: msg, meta: { args } });
    } catch {}
    origError(...args);
  };

  console.warn = (...args: unknown[]) => {
    try {
      const msg = String(args[0] ?? '');
      DIAG.push({ level: 'warn', code: 'LOG_WARN', scope: 'console', message: msg, meta: { args } });
    } catch {}
    origWarn(...args);
  };

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('error', (ev) => {
        DIAG.push({ level: 'error', code: 'UNCAUGHT_ERR', scope: 'global', message: ev.message, meta: { filename: ev.filename, lineno: ev.lineno, colno: ev.colno } });
      });
      window.addEventListener('unhandledrejection', (ev) => {
        DIAG.push({ level: 'error', code: 'UNHANDLED_REJECTION', scope: 'global', message: 'Unhandled promise rejection', meta: { reason: String((ev as PromiseRejectionEvent).reason) } });
      });
    } else {
      const anyGlobal = global as unknown as { ErrorUtils?: { setGlobalHandler?: (fn: (e: unknown, isFatal?: boolean) => void) => void } };
      const handler = (e: unknown, isFatal?: boolean) => {
        DIAG.push({ level: 'error', code: 'UNCAUGHT_ERR', scope: 'global', message: String(e), meta: { isFatal } });
      };
      anyGlobal.ErrorUtils?.setGlobalHandler?.(handler);
    }
  } catch {}
}

installConsoleTap();
