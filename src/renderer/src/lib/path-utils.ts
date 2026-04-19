// src/renderer/src/lib/path-utils.ts

/** Get the filename from a path string (works on both Unix and Windows paths) */
export function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}
