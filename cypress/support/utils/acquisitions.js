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

/**
 * Returns a date relative to today in the tenant's calendar, formatted for a UI date field.
 * The calendar day is resolved in the tenant timezone first; formatting then uses the tenant
 * locale while keeping the calculated day stable regardless of the Cypress machine timezone.
 *
 * @param {{ locale: string, timezone: string }} locale - Tenant locale and IANA timezone.
 * @param {number} [dayOffset=0] - Number of calendar days relative to today.
 * @param {Date} [referenceDate=new Date()] - Instant used as the reference for today.
 * @returns {string} Locale-formatted date with two-digit month and day.
 */
export const getFieldRelativeDateForLocale = (
  locale,
  dayOffset = 0,
  referenceDate = new Date(),
) => {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: locale.timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
    .formatToParts(referenceDate)
    .filter(({ type }) => ['year', 'month', 'day'].includes(type))
    .reduce((parts, part) => ({ ...parts, [part.type]: Number(part.value) }), {});
  const calendarDate = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day));

  calendarDate.setUTCDate(calendarDate.getUTCDate() + dayOffset);

  return new Intl.DateTimeFormat(locale.locale, {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(calendarDate);
};

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

export const getFullName = (user) => {
  const lastName = user?.personal?.lastName ?? '';
  const firstName = user?.personal?.firstName ?? '';
  const middleName = user?.personal?.middleName ?? '';

  return `${lastName}${firstName ? ', ' : ' '}${firstName} ${middleName}`;
};
