export default {
  orderSavedSuccessfully: 'The Purchase order - (?:\\d+) has been successfully saved',
  orderOpenedSuccessfully: 'The Purchase order - (?:\\d+) has been successfully opened',
  orderClosedSuccessfully: 'Order was closed',
  orderLineCreatedSuccessfully: 'The purchase order line was successfully created',
  orderLineUpdatedSuccessfully: 'The purchase order line (?:\\d+\\-\\d+) was successfully updated',
  orderLineCanceledSuccessfully:
    'The purchase order line (?:\\d+\\-\\d+) was successfully cancelled',
  orderInstanceConnectionUpdatedSuccessfully:
    'Order instance connection has been successfully updated',
  exportJobStartedSuccessfully: 'Export has been started successfully',

  // warnings
  exchangeRateAmountMustBePositive: 'Amount must be a positive number',
  locationRequired: 'At least one location must be entered',
  percentageAmountShouldBeEqual: 'The percentage or amount(s) should be equal 100% of the total',
  remainingAmountToBeDistributed(remainingAmount) {
    return `Remaining amount to be distributed: $${remainingAmount}`;
  },
};
