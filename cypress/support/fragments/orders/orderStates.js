export default {
  orderSavedSuccessfully: 'The Purchase order - (?:\\d+) has been successfully saved',
  orderOpenedSuccessfully: 'The Purchase order - (?:\\d+) has been successfully opened',
  orderDeletedSuccessfully: 'The purchase order (?:\\d+) was successfully deleted',
  orderClosedSuccessfully: 'Order was closed',
  orderUnopenedSuccessfully(orderNumber) {
    return `The Purchase order - ${orderNumber} has been successfully unopened`;
  },
  orderLineCreatedSuccessfully: 'The purchase order line was successfully created',
  orderLineUpdatedSuccessfully: 'The purchase order line (?:\\d+\\-\\d+) was successfully updated',
  orderLineDeletedSuccessfully: 'The purchase order line (?:\\d+\\-\\d+) was successfully deleted',
  orderLineCanceledSuccessfully:
    'The purchase order line (?:\\d+\\-\\d+) was successfully cancelled',
  orderInstanceConnectionUpdatedSuccessfully:
    'Order instance connection has been successfully updated',
  exportJobStartedSuccessfully: 'Export has been started successfully',
  activeBudgetsInMultipleFiscalYearsError:
    'Order line fund distributions have active budgets in multiple fiscal years.',
  notEnoughMoneyInFundError(fundCode) {
    return `One or more fund distributions on this order can not be encumbered, because there is not enough money in [${fundCode}].`;
  },
  encumbranceNotUpdated:
    'The encumbrances were correctly created during the rollover or have already been updated.',
  noCurrentBudgetForFund(fundCode, fiscalYearCode) {
    return `Order cannot be opened because there is no current budget for fund(s) [${fundCode}] for fiscal year ${fiscalYearCode}.`;
  },
  noCurrentFYFoundForLedger: 'Current fiscal year not found for ledger.',

  // warnings
  exchangeRateAmountMustBePositive: 'Amount must be a positive number',
  locationRequired: 'At least one location must be entered',
  percentageAmountShouldBeEqual: 'The percentage or amount(s) should be equal 100% of the total',
  remainingAmountToBeDistributed(remainingAmount) {
    return `Remaining amount to be distributed: $${remainingAmount}`;
  },

  // API errorCodes
  fundCannotBePaid: 'fundCannotBePaid',
  multipleFiscalYears: 'multipleFiscalYears',
  encumbrancesForReEncumberNotFound: 'encumbrancesForReEncumberNotFound',
  currentFiscalYearNotFound: 'currentFYearNotFound',
  budgetNotFoundForFiscalYear: 'budgetNotFoundForFiscalYear',

  // API errorMessages
  fundCannotBePaidDueToRestricrions: 'Fund cannot be paid due to restrictions',
  encumbranceNotUpdatedAPIMessage:
    'The encumbrances were correctly created during the rollover or have already been updated.',
  currentFYearNotFoundAPIMessage: 'Current fiscal year not found for ledger',
  couldNotFindActiveBudgetInCurrentFY:
    'Could not find an active budget for a fund with the current fiscal year of another fund in the fund distribution',
};
