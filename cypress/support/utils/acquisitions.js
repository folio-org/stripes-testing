import { FUND_DISTRIBUTION_TYPES } from '../constants';

export const formatDateTime = (locale, date) => {
  if (!date) return '';

  return new Intl.DateTimeFormat(locale.locale, {
    timeZone: locale.timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(date));
};

export function getMoneyMultiplier(currency) {
  const numberFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency });
  const maximumFractionDigits = numberFormat.resolvedOptions().maximumFractionDigits;

  return 10 ** maximumFractionDigits;
}

export const calculateFundAmount = (fundDistr, totalAmount, currency) => {
  const fundDistributionValue = Number(fundDistr?.value || 0);
  const fundDistributionType = fundDistr?.distributionType || FUND_DISTRIBUTION_TYPES.PERCENTAGE;
  const multiplier = getMoneyMultiplier(currency);

  const amount =
    fundDistributionType === FUND_DISTRIBUTION_TYPES.PERCENTAGE
      ? Math.round(fundDistributionValue * totalAmount * 100) / 10000
      : fundDistributionValue;

  return Math.round(amount * multiplier) / multiplier;
};

export const chunk = (array, size) => array.reduce((acc, _, i) => (i % size ? acc : [...acc, array.slice(i, i + size)]), []);
