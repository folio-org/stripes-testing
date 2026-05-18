import { FUND_DISTRIBUTION_TYPES, INVALID_REFERENCE_MESSAGE } from '../constants';

export const formatIntlDateTime = (locale, date, config = {}) => {
  if (!date) return '';

  return new Intl.DateTimeFormat(locale.locale, {
    timeZone: locale.timezone,
    ...config,
  }).format(new Date(date));
};

export const formatDateTime = (locale, date) => formatIntlDateTime(locale, date, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});

export const formatDate = (locale, date) => formatIntlDateTime(locale, date, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function getMoneyMultiplier(currency) {
  const numberFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency });
  const maximumFractionDigits = numberFormat.resolvedOptions().maximumFractionDigits;

  return 10 ** maximumFractionDigits;
}

export const calculateFundAmount = (distributionType, distributionValue, totalAmount, currency) => {
  const multiplier = getMoneyMultiplier(currency);

  const amount =
    distributionType.toLowerCase() === FUND_DISTRIBUTION_TYPES.PERCENTAGE.toLowerCase()
      ? Math.round(distributionValue * totalAmount * 100) / 10000
      : distributionValue;

  return Math.round(amount * multiplier) / multiplier;
};

export const chunk = (array, size) => array.reduce((acc, _, i) => (i % size ? acc : [...acc, array.slice(i, i + size)]), []);

export const getExportFundDistributionFieldValue = (
  fundDistribution,
  currency,
  totalAmount = 0,
  expenseClassMap = new Map(),
  invalidReferenceLabel = INVALID_REFERENCE_MESSAGE,
) => {
  return fundDistribution
    ?.map((fund) => {
      const distributionType = fund.distributionType;
      const distributionValue = fund.value;
      const expenseClassName = fund?.expenseClassId
        ? (expenseClassMap.get(fund?.expenseClassId)?.name ?? invalidReferenceLabel)
        : '';

      return `"${fund.code || ''}""${expenseClassName}"
      "${fund.value || '0'}${distributionType.toLowerCase() === FUND_DISTRIBUTION_TYPES.PERCENTAGE.toLowerCase() ? '%' : ''}"
      "${calculateFundAmount(distributionType, distributionValue, totalAmount, currency)}"`;
    })
    .join(' | ')
    .replaceAll(/\n\s+/g, '');
};

export const getExportAddressFieldValue = (
  addressId,
  addressMap,
  invalidReferenceLabel = INVALID_REFERENCE_MESSAGE,
) => {
  return addressMap.get(addressId)
    ? `"${addressMap.get(addressId).name}""${addressMap.get(addressId).address}"`
    : invalidReferenceLabel;
};
