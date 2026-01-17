const MAX_STRING_LENGTH = 10000;

export function sanitizeString(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, MAX_STRING_LENGTH);
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200);
}
