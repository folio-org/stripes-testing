export const formatCurrency = (value, { locale, currency }) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
