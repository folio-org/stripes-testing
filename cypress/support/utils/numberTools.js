export const formatCurrency = (value, { locale, currency }) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
export const formatNumber = (value, { locale = 'en-US' } = {}) => new Intl.NumberFormat(locale).format(value);
