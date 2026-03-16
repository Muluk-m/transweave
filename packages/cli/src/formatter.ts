export type OutputMode = 'normal' | 'json' | 'quiet';

let currentMode: OutputMode = 'normal';
let jsonBuffer: Record<string, any> = {};

export function setOutputMode(mode: OutputMode): void {
  currentMode = mode;
  if (mode === 'json') {
    jsonBuffer = {};
  }
}

export function getOutputMode(): OutputMode {
  return currentMode;
}

/** Log informational messages. Suppressed in json and quiet modes. */
export function log(message: string): void {
  if (currentMode === 'normal') {
    console.log(message);
  }
}

/** Log a blank line. Suppressed in json and quiet modes. */
export function blank(): void {
  if (currentMode === 'normal') {
    console.log('');
  }
}

/** Log error messages. Always shown in normal/quiet, wrapped in JSON in json mode. */
export function error(message: string, code?: string): void {
  if (currentMode === 'json') {
    console.log(JSON.stringify({ error: message, code: code || 'ERROR' }));
  } else {
    console.error(`Error: ${message}`);
  }
}

/** Output structured data. In json mode, merges into buffer. In normal mode, renders as table. */
export function data(key: string, value: any): void {
  if (currentMode === 'json') {
    jsonBuffer[key] = value;
  }
}

/** Flush JSON buffer to stdout (call at end of command in json mode). */
export function flush(): void {
  if (currentMode === 'json' && Object.keys(jsonBuffer).length > 0) {
    console.log(JSON.stringify(jsonBuffer, null, 2));
    jsonBuffer = {};
  }
}

/** Render a simple table. Suppressed in json mode. */
export function table(headers: string[], rows: string[][]): void {
  if (currentMode === 'json') return;

  // Calculate column widths
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] || '').length)),
  );

  const separator = widths.map((w) => '─'.repeat(w)).join(' ');
  const headerLine = headers.map((h, i) => h.padEnd(widths[i])).join(' ');

  console.log(headerLine);
  console.log(separator);
  for (const row of rows) {
    console.log(row.map((cell, i) => (cell || '').padEnd(widths[i])).join(' '));
  }
}

/** Render a progress bar string. */
export function progressBar(ratio: number, width = 16): string {
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/** Print a key-value info line. Suppressed in json mode. */
export function info(label: string, value: string): void {
  if (currentMode === 'normal') {
    console.log(`  ${label}: ${value}`);
  }
}

/** Print a success message. In quiet mode, still shown. In json mode, suppressed. */
export function success(message: string): void {
  if (currentMode === 'json') return;
  console.log(message);
}
