import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function makeId(): string {
  return Math.random().toString(36).slice(2, 9)
}

export function stockPercent(currentStockL: number, capacityL: number): number {
  return Math.round((currentStockL / capacityL) * 100)
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}
