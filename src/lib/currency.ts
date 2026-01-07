// Currency configuration for South African market
// This centralizes all currency-related formatting and settings

export interface CurrencyConfig {
  code: string
  symbol: string
  locale: string
  name: string
}

// South African Rand configuration
export const CURRENCY_CONFIG: CurrencyConfig = {
  code: 'ZAR',
  symbol: 'R',
  locale: 'en-ZA',
  name: 'South African Rand',
}

/**
 * Format a number as currency using the configured currency settings
 * @param amount - The amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "R 1,234.56")
 */
export function formatCurrency(
  amount: number,
  options?: {
    showDecimals?: boolean
    compact?: boolean
  }
): string {
  const { showDecimals = true, compact = false } = options || {}

  if (compact && amount >= 1000) {
    const formatted = new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(amount)
    return `${CURRENCY_CONFIG.symbol} ${formatted}`
  }

  const formatted = amount.toLocaleString(CURRENCY_CONFIG.locale, {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })

  return `${CURRENCY_CONFIG.symbol} ${formatted}`
}

/**
 * Parse a currency string back to a number
 * @param value - The currency string to parse
 * @returns The numeric value
 */
export function parseCurrency(value: string): number {
  // Remove currency symbol, spaces, and thousand separators
  const cleanValue = value
    .replace(CURRENCY_CONFIG.symbol, '')
    .replace(/\s/g, '')
    .replace(/,/g, '')
  return parseFloat(cleanValue) || 0
}

/**
 * Format a date using South African locale
 * @param date - The date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  return dateObj.toLocaleDateString(CURRENCY_CONFIG.locale, options || defaultOptions)
}

/**
 * Get VAT amount (15% for South Africa)
 * @param amount - The base amount
 * @returns The VAT amount
 */
export function getVATAmount(amount: number): number {
  return amount * 0.15
}

/**
 * Get amount including VAT (15% for South Africa)
 * @param amount - The base amount (excluding VAT)
 * @returns The total amount including VAT
 */
export function getAmountWithVAT(amount: number): number {
  return amount * 1.15
}

/**
 * Get amount excluding VAT from a VAT-inclusive amount
 * @param amountWithVAT - The amount including VAT
 * @returns The base amount excluding VAT
 */
export function getAmountExcludingVAT(amountWithVAT: number): number {
  return amountWithVAT / 1.15
}

// VAT rate for South Africa
export const VAT_RATE = 0.15
export const VAT_PERCENTAGE = 15
