import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines Tailwind classes conditionally and resolves conflicts intelligently.
 * Usage: cn("p-2", isActive && "bg-green-500")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
