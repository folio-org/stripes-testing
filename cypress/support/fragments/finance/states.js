export default {
  fundSavedSuccessfully: 'Fund has been saved',
  budgetCreatedSuccessfully: 'Budget (?:\\S+) successfully created for fund (?:\\S+)',
  budgetHasNotBeenCreated: 'Budget has not been created',
  budgetExportStartedSuccessfully: 'Export of (?:\\S+) data has started',
  budgetExportCompletedSuccessfully: '(?:\\S+) data was successfully exported',
  transferCreatedSuccessfully: '(?:\\S+) was successfully transferred to the budget (?:\\S+)',
  negativeAmountConfirmation:
    'Completing this (?:transfer|allocation) will result in (?:\\S+) having a negative available amount. Are you sure you would like to complete this transaction?',
  amountAllocatedSuccessfully: '(?:\\S+) was successfully allocated to the budget (?:\\S+)',
  rolloverTestStartedSuccessfully: '(?:\\S+) rollover test has started successfully',
  rolloverExportStartedSuccessfully: 'Export of budget results has been started',
  exceedExpenditureLimitError: (amount, firstBudgetName, secondBudgetName) => {
    return `$${Number(amount).toFixed(2)} could not be transferred to the budget ${firstBudgetName} because it exceeds the allowable expenditure limit for ${secondBudgetName} and ledger fund restrictions are active.`;
  },
};
