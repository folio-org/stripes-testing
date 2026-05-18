import {
  EXPORT_INVOICE_FIELDS,
  EXPORT_INVOICE_LINE_FIELDS,
  FUND_DISTRIBUTION_TYPES,
  INVALID_REFERENCE_MESSAGE,
} from '../constants';
import {
  calculateFundAmount,
  formatDate,
  formatDateTime,
  getExportAddressFieldValue,
  getExportFundDistributionFieldValue,
} from './acquisitions';

const LIST_SEPARATOR = ' | ';

const getInvoiceFundDistributionsValue = (invoice, expenseClassesMap) => {
  return invoice.adjustments
    ?.map((adjustment) => {
      return getExportFundDistributionFieldValue(
        adjustment.fundDistributions,
        invoice.currency,
        calculateFundAmount(adjustment.type, adjustment.value, invoice.subTotal, invoice.currency),
        expenseClassesMap,
      );
    })
    .join(LIST_SEPARATOR);
};

const getExportAdjustmentData = (adjustments) => adjustments
  ?.map(
    (adj) => `"${adj.description || ''}""${adj.value || '0'}${adj.type.toLowerCase() === FUND_DISTRIBUTION_TYPES.PERCENTAGE.toLowerCase() ? '%' : ''}""${adj.prorate || ''}"
    "${adj.relationToTotal || ''}""${Boolean(adj.exportToAccounting)}"`,
  )
  .join(LIST_SEPARATOR)
  .replace(/\n\s+/g, '');

const getExportVendorPrimaryAddress = (vendor = {}) => {
  const primaryAddress = vendor.addresses?.find(({ isPrimary }) => isPrimary);

  return primaryAddress
    ? `"${primaryAddress.addressLine1}""${primaryAddress.addressLine2 || ''}""${primaryAddress.city || ''}""${primaryAddress.state || ''}""${primaryAddress.zipCode || ''}""${primaryAddress.language || ''}"`
    : '';
};

const getInvoiceLineExternalAccountNumbers = (
  line,
  fundsMap,
  expenseClassMap,
  invalidReferenceLabel = INVALID_REFERENCE_MESSAGE,
) => {
  return line.fundDistributions
    ?.map((fund) => {
      const externalAccountNumber = fundsMap.get(fund.fundId)?.externalAccountNo;
      const externalAccountNumberExt = expenseClassMap.get(
        fund.expenseClassId,
      )?.externalAccountNumberExt;

      if (externalAccountNumber && externalAccountNumberExt) {
        return `"${externalAccountNumber}-${externalAccountNumberExt}"`;
      } else if (externalAccountNumber) {
        return `"${externalAccountNumber}"`;
      } else {
        return invalidReferenceLabel;
      }
    })
    .join(LIST_SEPARATOR);
};

const getExportReferenceNumbers = (line) => line.referenceNumbers
  ?.map(({ refNumber, refNumberType }) => `"${refNumber}""${refNumberType}"`)
  .join(LIST_SEPARATOR);

export const buildExportReportRow = ({
  acqUnitMap = new Map(),
  addressesMap = new Map(),
  batchGroupsMap = new Map(),
  expenseClassesMap = new Map(),
  fiscalYearsMap = new Map(),
  fundsMap = new Map(),
  invoice,
  invoiceLines,
  line,
  locale,
  poLinesMap = new Map(),
  usersMap = new Map(),
  vendor,
  voucher,
}) => {
  const totalUnits = invoiceLines?.reduce((total, { quantity }) => total + +quantity, 0) ?? 0;

  return {
    [EXPORT_INVOICE_FIELDS.SUB_TOTAL]: invoice.subTotal,
    [EXPORT_INVOICE_FIELDS.ADJUSTMENTS_TOTAL]: invoice.adjustmentsTotal,
    [EXPORT_INVOICE_FIELDS.TOTAL_AMOUNT]: invoice.total,
    [EXPORT_INVOICE_FIELDS.LOCK_TOTAL]: invoice.lockTotal,
    [EXPORT_INVOICE_FIELDS.INVOICE_FUND_DISTRIBUTIONS]: getInvoiceFundDistributionsValue(
      invoice,
      expenseClassesMap,
    ),
    [EXPORT_INVOICE_FIELDS.INVOICE_ADJUSTMENTS]: getExportAdjustmentData(invoice.adjustments),
    [EXPORT_INVOICE_FIELDS.ACCOUNTING_CODE]: invoice.accountingCode,
    [EXPORT_INVOICE_FIELDS.VENDOR_ADDRESS]: getExportVendorPrimaryAddress(vendor),
    [EXPORT_INVOICE_FIELDS.PAYMENT_METHOD]: invoice.paymentMethod,
    [EXPORT_INVOICE_FIELDS.CHK_SUBSCRIPTION_OVERLAP]: invoice.chkSubscriptionOverlap,
    [EXPORT_INVOICE_FIELDS.EXPORT_TO_ACCOUNTING]: invoice.exportToAccounting,
    [EXPORT_INVOICE_FIELDS.ENCLOSURE_NEEDED]: invoice.enclosureNeeded,
    [EXPORT_INVOICE_FIELDS.CURRENCY]: invoice.currency,
    [EXPORT_INVOICE_FIELDS.EXCHANGE_RATE]: invoice.exchangeRate,
    [EXPORT_INVOICE_FIELDS.INVOICE_TAGS]: invoice.tags?.tagList?.join(LIST_SEPARATOR),
    [EXPORT_INVOICE_FIELDS.FOLIO_INVOICE_NO]: invoice.folioInvoiceNo,
    [EXPORT_INVOICE_FIELDS.VENDOR_INVOICE_NO]: invoice.vendorInvoiceNo,
    [EXPORT_INVOICE_FIELDS.VENDOR_CODE]: vendor.code ?? INVALID_REFERENCE_MESSAGE,
    [EXPORT_INVOICE_FIELDS.VENDOR_NAME]: vendor.name ?? INVALID_REFERENCE_MESSAGE,
    [EXPORT_INVOICE_FIELDS.STATUS]: invoice.status,
    [EXPORT_INVOICE_FIELDS.FISCAL_YEAR]: fiscalYearsMap.get(invoice.fiscalYearId)?.code,
    [EXPORT_INVOICE_FIELDS.INVOICE_DATE]: formatDate(locale, invoice.invoiceDate),
    [EXPORT_INVOICE_FIELDS.PAYMENT_DUE]: formatDate(locale, invoice.paymentDue),
    [EXPORT_INVOICE_FIELDS.APPROVAL_DATE]: formatDate(locale, invoice.approvalDate),
    [EXPORT_INVOICE_FIELDS.APPROVED_BY]: usersMap.get(invoice.approvedBy)?.username,
    [EXPORT_INVOICE_FIELDS.PAYMENT_TERMS]: invoice.paymentTerms,
    [EXPORT_INVOICE_FIELDS.ACQ_UNIT_IDS]: invoice.acqUnitIds
      ?.map((id) => acqUnitMap.get(id)?.name)
      .filter(Boolean)
      .join(LIST_SEPARATOR),
    [EXPORT_INVOICE_FIELDS.NOTE]: invoice.note,
    [EXPORT_INVOICE_FIELDS.BILL_TO]:
      invoice.billTo && getExportAddressFieldValue(invoice.billTo, addressesMap),
    [EXPORT_INVOICE_FIELDS.BATCH_GROUP]:
      batchGroupsMap.get(invoice.batchGroupId)?.name || INVALID_REFERENCE_MESSAGE,
    [EXPORT_INVOICE_FIELDS.PAYMENT_DATE]: formatDate(locale, invoice.paymentDate),
    [EXPORT_INVOICE_FIELDS.TOTAL_UNITS]: totalUnits,
    [EXPORT_INVOICE_FIELDS.CREATED_BY]: usersMap.get(invoice.metadata?.createdByUserId)?.username,
    [EXPORT_INVOICE_FIELDS.DATE_CREATED]: formatDateTime(locale, invoice.metadata?.createdDate),
    [EXPORT_INVOICE_FIELDS.UPDATED_BY]: usersMap.get(invoice.metadata?.updatedByUserId)?.username,
    [EXPORT_INVOICE_FIELDS.DATE_UPDATED]: formatDateTime(locale, invoice.metadata?.updatedDate),

    [EXPORT_INVOICE_LINE_FIELDS.DISBURSEMENT_NUMBER]: voucher?.disbursementNumber,
    [EXPORT_INVOICE_LINE_FIELDS.DISBURSEMENT_DATE]: formatDate(locale, voucher?.disbursementDate),
    [EXPORT_INVOICE_LINE_FIELDS.VOUCHER_NUMBER]: invoice.voucherNumber,
    [EXPORT_INVOICE_LINE_FIELDS.VOUCHER_STATUS]: voucher?.status,
    [EXPORT_INVOICE_LINE_FIELDS.VOUCHER_DATE]: formatDate(locale, voucher?.voucherDate),
    [EXPORT_INVOICE_LINE_FIELDS.INVOICE_LINE_NUMBER]: line.invoiceLineNumber,
    [EXPORT_INVOICE_LINE_FIELDS.DESCRIPTION]: line.description,
    [EXPORT_INVOICE_LINE_FIELDS.PO_LINE_NUMBER]: poLinesMap.get(line.poLineId)?.poLineNumber,
    [EXPORT_INVOICE_LINE_FIELDS.SUBSCRIPTION_INFO]: line.subscriptionInfo,
    [EXPORT_INVOICE_LINE_FIELDS.SUBSCRIPTION_START]: formatDate(locale, line.subscriptionStart),
    [EXPORT_INVOICE_LINE_FIELDS.SUBSCRIPTION_END]: formatDate(locale, line.subscriptionEnd),
    [EXPORT_INVOICE_LINE_FIELDS.COMMENT]: line.comment,
    [EXPORT_INVOICE_LINE_FIELDS.ACCOUNT_NUMBER]: line.accountNumber,
    [EXPORT_INVOICE_LINE_FIELDS.LINE_ACCOUNTING_CODE]: line.accountingCode,
    [EXPORT_INVOICE_LINE_FIELDS.QUANTITY]: line.quantity,
    [EXPORT_INVOICE_LINE_FIELDS.LINE_SUB_TOTAL]: line.subTotal,
    [EXPORT_INVOICE_LINE_FIELDS.LINE_ADJUSTMENTS]: getExportAdjustmentData(line.adjustments),
    [EXPORT_INVOICE_LINE_FIELDS.TOTAL]: line.total,
    [EXPORT_INVOICE_LINE_FIELDS.LINE_FUND_DISTRIBUTIONS]: getExportFundDistributionFieldValue(
      line.fundDistributions,
      invoice.currency,
      line.total,
      expenseClassesMap,
    ),
    [EXPORT_INVOICE_LINE_FIELDS.EXTERNAL_ACCOUNT_NUMBER]: getInvoiceLineExternalAccountNumbers(
      line,
      fundsMap,
      expenseClassesMap,
    ),
    [EXPORT_INVOICE_LINE_FIELDS.REFERENCE_NUMBERS]: getExportReferenceNumbers(line),
    [EXPORT_INVOICE_LINE_FIELDS.LINE_TAGS]: line.tags?.tagList?.join(LIST_SEPARATOR),
    [EXPORT_INVOICE_LINE_FIELDS.INVOICE_LINE_CREATED_BY]: usersMap.get(
      line.metadata?.createdByUserId,
    )?.username,
    [EXPORT_INVOICE_LINE_FIELDS.INVOICE_LINE_DATE_CREATED]: formatDateTime(
      locale,
      line.metadata?.createdDate,
    ),
    [EXPORT_INVOICE_LINE_FIELDS.INVOICE_LINE_UPDATED_BY]: usersMap.get(
      line.metadata?.updatedByUserId,
    )?.username,
    [EXPORT_INVOICE_LINE_FIELDS.INVOICE_LINE_DATE_UPDATED]: formatDateTime(
      locale,
      line.metadata?.updatedDate,
    ),
  };
};
