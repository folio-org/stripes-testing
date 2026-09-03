const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// funds can be listed in any order in the callout, so just check each code is present
function fundsListPattern(fundCodes) {
  return (
    fundCodes
      .map(escapeRegExp)
      .map((code) => `(?=.*${code})`)
      .join('') + '.+'
  );
}

export default {
  orderSavedSuccessfully: 'The Purchase order - (?:\\d+) has been successfully saved',
  orderOpenedSuccessfully: 'The Purchase order - (?:\\d+) has been successfully opened',
  orderClosedSuccessfully: 'Order was closed',
  orderUnopenedSuccessfully(orderNumber) {
    return `The Purchase order - ${orderNumber} has been successfully unopened`;
  },
  orderLineCreatedSuccessfully: 'The purchase order line was successfully created',
  orderLineUpdatedSuccessfully: 'The purchase order line (?:\\d+\\-\\d+) was successfully updated',
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
  budgetExpenseClassNotFoundError(expenseClass, fundCode) {
    return `${expenseClass} expense class not found on ${fundCode} Fund`;
  },
  inactiveExpenseClassError(expenseClass) {
    return `Order can NOT be Opened because expense class ${expenseClass} is inactive.`;
  },
  selectedAccountNumberIsInactive: 'The selected account number is inactive.',
  budgetNotFoundForFiscalYearCancel(fundCodes, fiscalYearCode) {
    return new RegExp(
      `^To cancel the order, the related fund\\(s\\) ${fundsListPattern(fundCodes)} must have an active budget for fiscal year ${escapeRegExp(fiscalYearCode)}\\.$`,
    );
  },
  budgetNotFoundForFiscalYearClose(fundCodes, fiscalYearCode) {
    return new RegExp(
      `^To close the order, the related fund\\(s\\) ${fundsListPattern(fundCodes)} must have an active budget for fiscal year ${escapeRegExp(fiscalYearCode)}\\.$`,
    );
  },
  budgetNotFoundForFiscalYearUnopen(fundCodes, fiscalYearCode) {
    return new RegExp(
      `^To unopen the order, the related fund\\(s\\) ${fundsListPattern(fundCodes)} must have an active budget for fiscal year ${escapeRegExp(fiscalYearCode)}\\.$`,
    );
  },
  budgetNotFoundForFiscalYearUpdateEncumbrances(fundCodes, fiscalYearCode) {
    return new RegExp(
      `^To update encumbrances, the related fund\\(s\\) ${fundsListPattern(fundCodes)} must have an active budget for fiscal year ${escapeRegExp(fiscalYearCode)}\\.$`,
    );
  },

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
  budgetExpenseClassNotFound: 'budgetExpenseClassNotFound',
  inactiveExpenseClass: 'inactiveExpenseClass',

  // API errorMessages
  fundCannotBePaidDueToRestricrions: 'Fund cannot be paid due to restrictions',
  encumbranceNotUpdatedAPIMessage:
    'The encumbrances were correctly created during the rollover or have already been updated.',
  currentFYearNotFoundAPIMessage: 'Current fiscal year not found for ledger',
  couldNotFindActiveBudgetInCurrentFY:
    'Could not find an active budget for a fund with the current fiscal year of another fund in the fund distribution',
  budgetExpenseClassNotFoundAPIMessage: 'Budget expense class not found',
  expenseClassIsInactiveAPIMessage: 'Expense class is Inactive',
};
