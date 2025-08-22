export type DiagLevel = 'info' | 'warn' | 'error';

export interface DiagEntry {
  id: string;
  ts: number;
  level: DiagLevel;
  code: string;
  scope: string;
  message: string;
  meta?: Record<string, unknown>;
}

const buffer: DiagEntry[] = [];

export const DIAG = {
  push(entry: Omit<DiagEntry, 'id' | 'ts'>) {
    const id = `${Date.now()}-${Math.random()}`;
    const item: DiagEntry = { id, ts: Date.now(), ...entry };
    buffer.push(item);
    if (buffer.length > 500) buffer.splice(0, buffer.length - 500);
    const tag = `[${entry.level.toUpperCase()}][${entry.scope}][${entry.code}]`;
    console.log(tag, entry.message, entry.meta ?? {});
  },
  snapshot(): DiagEntry[] {
    return [...buffer];
  },
  clear() {
    buffer.length = 0;
  }
};