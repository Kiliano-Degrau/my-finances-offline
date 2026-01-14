export interface Currency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export const currencies: Currency[] = [
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$', locale: 'pt-BR' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', locale: 'zh-CN' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', locale: 'es-AR' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', locale: 'de-CH' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', locale: 'es-CL' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', locale: 'es-CO' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', locale: 'da-DK' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', locale: 'zh-HK' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', locale: 'ko-KR' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', locale: 'es-MX' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', locale: 'nb-NO' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', locale: 'es-PE' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', locale: 'en-PH' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', locale: 'pl-PL' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', locale: 'ru-RU' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', locale: 'sv-SE' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', locale: 'th-TH' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', locale: 'tr-TR' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', locale: 'zh-TW' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', locale: 'uk-UA' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U', locale: 'es-UY' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', locale: 'vi-VN' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', locale: 'ar-AE' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', locale: 'ar-SA' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', locale: 'he-IL' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', locale: 'ar-EG' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', locale: 'id-ID' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', locale: 'ms-MY' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', locale: 'cs-CZ' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', locale: 'hu-HU' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', locale: 'ro-RO' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', locale: 'bg-BG' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', locale: 'hr-HR' },
  { code: 'ISK', name: 'Icelandic Krona', symbol: 'kr', locale: 'is-IS' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', locale: 'ur-PK' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', locale: 'bn-BD' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', locale: 'en-NG' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', locale: 'sw-KE' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', locale: 'en-GH' },
];

export function formatCurrency(value: number, currencyCode: string): string {
  const currency = currencies.find(c => c.code === currencyCode);
  const locale = currency?.locale || 'en-US';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency?.symbol || '$'}${value.toFixed(2)}`;
  }
}

export function getCurrencySymbol(currencyCode: string): string {
  const currency = currencies.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}
