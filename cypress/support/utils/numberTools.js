export const formatCurrency = (value, { locale, currency }) => new Intl.NumberFormat(locale, { style: 'currency', currency, currencySign: 'accounting' }).format(
  value,
);
export const formatNumber = (value, { locale = 'en-US' } = {}) => new Intl.NumberFormat(locale).format(value);

export function isFloat(val) {
  if (typeof val === 'string' && val.trim() === '') return false;

  const num = Number(val);

  return Number.isFinite(num) && num % 1 !== 0;
}
