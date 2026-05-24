import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript', ext: '.js' },
  { value: 'typescript', label: 'TypeScript', ext: '.ts' },
  { value: 'python', label: 'Python', ext: '.py' },
  { value: 'cpp', label: 'C++', ext: '.cpp' },
  { value: 'java', label: 'Java', ext: '.java' },
  { value: 'html', label: 'HTML', ext: '.html' },
  { value: 'css', label: 'CSS', ext: '.css' },
  { value: 'json', label: 'JSON', ext: '.json' },
  { value: 'markdown', label: 'Markdown', ext: '.md' },
  { value: 'sql', label: 'SQL', ext: '.sql' },
];

export const CURSOR_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'];

export function getCollaboratorColor(index: number): string {
  return CURSOR_COLORS[index % CURSOR_COLORS.length];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
}
