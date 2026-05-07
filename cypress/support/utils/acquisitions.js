import { FUND_DISTRIBUTION_TYPES, INVALID_REFERENCE_MESSAGE } from '../constants';

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

export const getOrderLineExportLocationFieldValue = (
  orderLine,
  locationMap = new Map(),
  holdingMap = new Map(),
  invalidReferenceLabel = INVALID_REFERENCE_MESSAGE,
) => orderLine.locations
  ?.map((l) => {
    const location = l.holdingId
      ? locationMap.get(holdingMap.get(l.holdingId)?.permanentLocationId)
      : locationMap.get(l.locationId);

    const locationCode = location?.code ?? invalidReferenceLabel;

    return `"${locationCode}""${l?.quantityPhysical || 0}""${l?.quantityElectronic || 0}"`;
  })
  .join(' | ');

export const getOrderLineExportFundDistributionFieldValue = (
  orderLine,
  expenseClassMap = new Map(),
  invalidReferenceLabel = INVALID_REFERENCE_MESSAGE,
) => orderLine.fundDistribution
  ?.map((fund) => {
    const expenseClassName = fund?.expenseClassId
      ? (expenseClassMap.get(fund?.expenseClassId)?.name ?? invalidReferenceLabel)
      : '';

    return `"${fund.code || ''}""${expenseClassName}"
      "${fund.value || '0'}${fund.distributionType === FUND_DISTRIBUTION_TYPES.PERCENTAGE ? '%' : ''}"
      "${calculateFundAmount(fund, orderLine.cost?.poLineEstimatedPrice || 0, orderLine.cost?.currency || 0)}"`;
  })
  .join(' | ')
  .replaceAll(/\n\s+/g, '');
