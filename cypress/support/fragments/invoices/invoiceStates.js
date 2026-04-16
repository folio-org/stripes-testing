export default {
  // save messages
  invoiceCreatedMessage: 'Invoice has been saved',
  invoiceLineCreatedMessage: 'Invoice line has been saved',
  invoiceApprovedMessage: 'Invoice has been approved successfully',
  invoiceApprovedAndPaidMessage: 'Invoice has been approved and paid successfully',
  invoicePaidMessage: 'Invoice has been paid successfully',
  invoiceCancelledMessage: 'Invoice has been cancelled successfully',
  invoiceDeletedMessage: 'Invoice has been deleted',
  budgetNotFoundByFund(fundCode) {
    return `This operation could not be completed successfully. There is either no budget for ${fundCode} for the targeted fiscal year or the budget is not Active.`;
  },
  // warnings
  invoiceCanNotBeApprovedPendingOrder:
    'Invoice can not be approved. One or more of the related orders has a workflow status of "Pending". If desired, please open the related orders before approving this invoice.',
  invoiceCanNotBeApprovedInactiveOrganization:
    'Vendor is inactive. Invoice cannot be approved or paid.',
  POLineFullyPaid: 'Purchase order line status is Fully Paid',
  // api response
  activeBudgetNotFoundMessage: 'Active budget not found by fund id and fiscal year id',
  budgetNotFoundCode: 'budgetNotFoundByFundIdAndFiscalYearId',
};
