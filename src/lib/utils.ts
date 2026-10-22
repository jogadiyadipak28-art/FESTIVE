import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Rough token estimate used for chat context budgeting. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
