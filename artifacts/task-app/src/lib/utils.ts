import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Record<string, unknown>;
  const keys = ["data", "items", "results", "users", "projects", "tasks", "members", "activities"];

  for (const key of keys) {
    if (Array.isArray(candidate[key])) {
      return candidate[key] as T[];
    }
  }

  return [];
}
