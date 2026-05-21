import {
  INVALID_REFERENCE_MESSAGE,
  ORDER_EXPORT_CSV_FIELDS,
  ORDER_LINE_EXPORT_CSV_FIELDS,
} from '../constants';
import {
  formatDateTime,
  getExportAddressFieldValue,
  getExportFundDistributionFieldValue,
} from './acquisitions';
import { getFullName } from './users';

const LIST_SEPARATOR = ' | ';
const joinList = (list = []) => list.join(LIST_SEPARATOR);

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
  .join(LIST_SEPARATOR);

export const getOrderLineExportOrganizationTypesValue = (orgTypeIds, orgTypeMap) => orgTypeIds
  ?.map((orgTypeId) => (orgTypeMap.get(orgTypeId)?.name ? `"${orgTypeMap.get(orgTypeId)?.name}"` : null))
  ?.filter(Boolean)
  ?.join(LIST_SEPARATOR);

export const getOrderLineExportReferenceNumbersValue = (line) => line.vendorDetail?.referenceNumbers
  ?.map(({ refNumber, refNumberType }) => `"${refNumber}""${refNumberType}"`)
  .join(LIST_SEPARATOR);

export const getOrderLineExportProductIdsValue = (
  line,
  identifierTypeMap,
  invalidReferenceLabel = INVALID_REFERENCE_MESSAGE,
) => line.details?.productIds
  ?.map((i) => {
    const productTypeName =
        identifierTypeMap.get(i?.productIdType)?.name ?? invalidReferenceLabel;

    return `"${i?.productId}""${i?.qualifier || ''}""${productTypeName}"`;
  })
  .join(LIST_SEPARATOR);

export const getOrderLineExportContributorsValue = (
  line,
  contributorNameTypeMap,
  invalidReferenceLabel = INVALID_REFERENCE_MESSAGE,
) => line.contributors
  ?.map(
    ({ contributor, contributorNameTypeId }) => `"${contributor}""${contributorNameTypeMap.get(contributorNameTypeId)?.name ?? invalidReferenceLabel}"`,
  )
  .join(LIST_SEPARATOR);

export const buildExportReportRow = ({
  order,
  line,
  acquisitionMethodsMap,
  acquisitionUnitsMap,
  addressesMap,
  admin,
  contributorTypesMap,
  expenseClassesMap,
  fiscalYear,
  holdingsMap,
  identifierTypesMap,
  locale,
  locationsMap,
  materialTypesMap,
  organization,
  organizationTypesMap,
  orderLinesMap,
}) => {
  return {
    [ORDER_EXPORT_CSV_FIELDS.ACQUISITIONS_UNITS]: joinList(
      order.acqUnitIds.map((id) => acquisitionUnitsMap.get(id)?.name),
    ),
    [ORDER_EXPORT_CSV_FIELDS.APPROVAL_DATE]: formatDateTime(locale, order.approvalDate),
    [ORDER_EXPORT_CSV_FIELDS.APPROVED]: order.approved,
    [ORDER_EXPORT_CSV_FIELDS.APPROVED_BY]: getFullName(admin),
    [ORDER_EXPORT_CSV_FIELDS.ASSIGNED_TO]: admin.username,
    [ORDER_EXPORT_CSV_FIELDS.BILL_TO]: getExportAddressFieldValue(order.billTo, addressesMap),
    [ORDER_EXPORT_CSV_FIELDS.SHIP_TO]: getExportAddressFieldValue(order.shipTo, addressesMap),
    [ORDER_EXPORT_CSV_FIELDS.CREATED_BY]: admin.username,
    [ORDER_EXPORT_CSV_FIELDS.DATE_CREATED]: formatDateTime(locale, order.metadata?.createdDate),
    [ORDER_EXPORT_CSV_FIELDS.DATE_ORDERED]: formatDateTime(locale, order.dateOrdered),
    [ORDER_EXPORT_CSV_FIELDS.DATE_UPDATED]: formatDateTime(locale, order.metadata?.updatedDate),
    [ORDER_EXPORT_CSV_FIELDS.INTERVAL]: order.ongoing?.interval,
    [ORDER_EXPORT_CSV_FIELDS.IS_SUBSCRIPTION]: order.ongoing?.isSubscription,
    [ORDER_EXPORT_CSV_FIELDS.MANUAL_RENEWAL]: order.ongoing?.manualRenewal,
    [ORDER_EXPORT_CSV_FIELDS.ONGOING_NOTES]: order.ongoing?.notes,
    [ORDER_EXPORT_CSV_FIELDS.OPENED_BY]: getFullName(admin),
    [ORDER_EXPORT_CSV_FIELDS.ORGANIZATION_TYPE]: getOrderLineExportOrganizationTypesValue(
      organization.organizationTypes,
      organizationTypesMap,
    ),
    [ORDER_EXPORT_CSV_FIELDS.PO_NUMBER]: Number(order.poNumber),
    [ORDER_EXPORT_CSV_FIELDS.PO_NUMBER_PREFIX]: order.poNumberPrefix,
    [ORDER_EXPORT_CSV_FIELDS.REVIEW_PERIOD]: order.ongoing?.reviewPeriod,
    [ORDER_EXPORT_CSV_FIELDS.RENEWAL_DATE]: formatDateTime(locale, order.ongoing?.renewalDate),
    [ORDER_EXPORT_CSV_FIELDS.REVIEW_DATE]: formatDateTime(locale, order.ongoing?.reviewDate),
    [ORDER_EXPORT_CSV_FIELDS.PO_TAGS]: joinList(order.tags?.tagList),
    [ORDER_EXPORT_CSV_FIELDS.YEAR_OPENED]: `${fiscalYear.name} (${fiscalYear.code})`,
    [ORDER_EXPORT_CSV_FIELDS.UPDATED_BY]: admin.username,
    [ORDER_EXPORT_CSV_FIELDS.VENDOR]: organization.code,
    [ORDER_EXPORT_CSV_FIELDS.WORKFLOW_STATUS]: order.workflowStatus,

    [ORDER_LINE_EXPORT_CSV_FIELDS.ORDER_FORMAT]: line.orderFormat,
    [ORDER_LINE_EXPORT_CSV_FIELDS.PAYMENT_STATUS]: line.paymentStatus,
    [ORDER_LINE_EXPORT_CSV_FIELDS.TITLE_OR_PACKAGE]: line.titleOrPackage,
    [ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_NUMBER]: line.poLineNumber,
    [ORDER_LINE_EXPORT_CSV_FIELDS.ACQUISITION_METHOD]: acquisitionMethodsMap.get(
      line.acquisitionMethod,
    )?.value,
    [ORDER_LINE_EXPORT_CSV_FIELDS.FUND_DISTRIBUTION]: getExportFundDistributionFieldValue(
      line.fundDistribution,
      line.cost?.currency,
      line.cost?.poLineEstimatedPrice,
      expenseClassesMap,
    ),
    [ORDER_LINE_EXPORT_CSV_FIELDS.LOCATION]: getOrderLineExportLocationFieldValue(
      line,
      locationsMap,
      holdingsMap,
    ),
    [ORDER_LINE_EXPORT_CSV_FIELDS.RUSH]: line.rush,
    [ORDER_LINE_EXPORT_CSV_FIELDS.INSTANCE_ID]: line.instanceId,
    [ORDER_LINE_EXPORT_CSV_FIELDS.REF_NUMBER]: getOrderLineExportReferenceNumbersValue(line),
    [ORDER_LINE_EXPORT_CSV_FIELDS.DISCOUNT]: `"${line.cost.discount || ''}""${line.cost.discountType || ''}"`,
    [ORDER_LINE_EXPORT_CSV_FIELDS.VOLUMES]: joinList(line.physical?.volumes),
    [ORDER_LINE_EXPORT_CSV_FIELDS.MATERIAL_TYPE]: materialTypesMap.get(line.physical?.materialType)
      ?.name,
    [ORDER_LINE_EXPORT_CSV_FIELDS.MATERIAL_TYPE_E]: materialTypesMap.get(
      line.eresource?.materialType,
    )?.name,
    [ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_TAGS]: joinList(line.tags?.tagList),
    [ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_CREATED_BY]: admin.username,
    [ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_DATE_CREATED]: formatDateTime(
      locale,
      line.metadata?.createdDate,
    ),
    [ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_DATE_UPDATED]: formatDateTime(
      locale,
      line.metadata?.updatedDate,
    ),
    [ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_UPDATED_BY]: admin.username,
    [ORDER_LINE_EXPORT_CSV_FIELDS.SUBSCRIPTION_FROM]: formatDateTime(
      locale,
      line.details?.subscriptionFrom,
    ),
    [ORDER_LINE_EXPORT_CSV_FIELDS.SUBSCRIPTION_TO]: formatDateTime(
      locale,
      line.details?.subscriptionTo,
    ),
    [ORDER_LINE_EXPORT_CSV_FIELDS.SUBSCRIPTION_INTERVAL]: line.details?.subscriptionInterval,
    [ORDER_LINE_EXPORT_CSV_FIELDS.RECEIVING_NOTE]: line.details?.receivingNote,
    [ORDER_LINE_EXPORT_CSV_FIELDS.PUBLISHER]: line.publisher,
    [ORDER_LINE_EXPORT_CSV_FIELDS.EDITION]: line.edition,
    [ORDER_LINE_EXPORT_CSV_FIELDS.PACKAGE_PO_LINE_ID]:
      orderLinesMap.get(line.packagePoLineId) || line.packagePoLineId,
    [ORDER_LINE_EXPORT_CSV_FIELDS.CONTRIBUTOR]: getOrderLineExportContributorsValue(
      line,
      contributorTypesMap,
    ),
    [ORDER_LINE_EXPORT_CSV_FIELDS.PRODUCT_IDENTIFIER]: getOrderLineExportProductIdsValue(
      line,
      identifierTypesMap,
    ),
    [ORDER_LINE_EXPORT_CSV_FIELDS.RENEWAL_NOTE]: line.renewalNote,
    [ORDER_LINE_EXPORT_CSV_FIELDS.DESCRIPTION]: line.description,
    [ORDER_LINE_EXPORT_CSV_FIELDS.RECEIPT_DATE]: formatDateTime(locale, line.receiptDate),
    [ORDER_LINE_EXPORT_CSV_FIELDS.RECEIPT_STATUS]: line.receiptStatus,
    [ORDER_LINE_EXPORT_CSV_FIELDS.SOURCE]: line.source,
    [ORDER_LINE_EXPORT_CSV_FIELDS.DONOR]: line.donor,
    [ORDER_LINE_EXPORT_CSV_FIELDS.SELECTOR]: line.selector,
    [ORDER_LINE_EXPORT_CSV_FIELDS.REQUESTER]: line.requester,
    [ORDER_LINE_EXPORT_CSV_FIELDS.CANCELLATION_RESTRICTION]: line.cancellationRestriction,
    [ORDER_LINE_EXPORT_CSV_FIELDS.CANCELLATION_RESTRICTION_NOTE]: line.cancellationRestrictionNote,
    [ORDER_LINE_EXPORT_CSV_FIELDS.COLLECTION]: line.collection,
    [ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_DESCRIPTION]: line.poLineDescription,
    [ORDER_LINE_EXPORT_CSV_FIELDS.INSTRUCTIONS]: line.vendorDetail?.instructions,
    [ORDER_LINE_EXPORT_CSV_FIELDS.VENDOR_ACCOUNT]: line.vendorDetail?.vendorAccount,
    [ORDER_LINE_EXPORT_CSV_FIELDS.EXCHANGE_RATE]: line.cost?.exchangeRate,
    [ORDER_LINE_EXPORT_CSV_FIELDS.LIST_UNIT_PRICE]: line.cost?.listUnitPrice,
    [ORDER_LINE_EXPORT_CSV_FIELDS.QUANTITY_PHYSICAL]: line.cost?.quantityPhysical,
    [ORDER_LINE_EXPORT_CSV_FIELDS.LIST_UNIT_PRICE_ELECTRONIC]: line.cost?.listUnitPriceElectronic,
    [ORDER_LINE_EXPORT_CSV_FIELDS.QUANTITY_ELECTRONIC]: line.cost?.quantityElectronic,
    [ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_ESTIMATED_PRICE]: line.cost?.poLineEstimatedPrice,
    [ORDER_LINE_EXPORT_CSV_FIELDS.CURRENCY]: line.cost?.currency,
    [ORDER_LINE_EXPORT_CSV_FIELDS.MATERIAL_SUPPLIER]:
      line.physical?.materialSupplier && organization.code,
    [ORDER_LINE_EXPORT_CSV_FIELDS.ACCESS_PROVIDER]:
      line.eresource?.accessProvider && organization.code,
    [ORDER_LINE_EXPORT_CSV_FIELDS.RECEIPT_DUE]: formatDateTime(locale, line.physical?.receiptDue),
    [ORDER_LINE_EXPORT_CSV_FIELDS.EXPECTED_RECEIPT_DATE]: formatDateTime(
      locale,
      line.physical?.expectedReceiptDate,
    ),
    [ORDER_LINE_EXPORT_CSV_FIELDS.CREATE_INVENTORY]: line.physical?.createInventory,
    [ORDER_LINE_EXPORT_CSV_FIELDS.ACTIVATED]: line.eresource?.activated,
    [ORDER_LINE_EXPORT_CSV_FIELDS.TRIAL]: line.eresource?.trial,
    [ORDER_LINE_EXPORT_CSV_FIELDS.EXPECTED_ACTIVATION]: formatDateTime(
      locale,
      line.eresource?.expectedActivation,
    ),
    [ORDER_LINE_EXPORT_CSV_FIELDS.USER_LIMIT]: line.eresource?.userLimit,
    [ORDER_LINE_EXPORT_CSV_FIELDS.RESOURCE_URL]: line.eresource?.resourceUrl,
  };
};
