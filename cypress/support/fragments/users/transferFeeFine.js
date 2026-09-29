import { Button, Modal, TextField, Select, Pane, including, matching } from '../../../../interactors';

const rootModal = Modal({ id: 'transfer-modal' });
const ownerSelect = rootModal.find(Select({ id: 'ownerId' }));
const transferAccountSelect = rootModal.find(Select({ name: 'method' }));
const confirmModal = Modal('Confirm fee/fine transfer');
const transferButton = rootModal.find(Button({ id: 'submit-button' }));
const confirmButton = confirmModal.find(Button('Confirm'));
const transferPane = Pane('Transfer configuration');

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },

  waitLoadingTransferCriteria() {
    cy.expect(transferPane.exists());
  },

  selectTransferCriteriaSchedulePeriod(period = 'Days') {
    cy.do(Select({ name: 'scheduling.frequency' }).choose(period));
  },

  openTimePicker() {
    // Id starts with "timepicker-toggle-button"
    cy.do(Button({ id: matching('^timepicker-toggle-button.*') }).click());
    cy.wait(500);
  },

  typeScheduleTime(hour, minute, period) {
    // hour: string like '9'
    // minute: string like '15'
    // period: string like 'AM' or 'PM'
    cy.do(TextField({ id: including('hour-input') }).fillIn(hour));
    cy.do(TextField({ id: including('minute-input') }).fillIn(minute));
    cy.do(Select({ id: including('period-toggle') }).choose(period));
    cy.wait(500);
    // Id ending with "-set-time"
    cy.do(Button({ id: matching('.*-set-time$') }).click());
    cy.wait(500);
  },

  verifyScheduleTime(time) {
    cy.expect(TextField({ name: 'scheduling.time', value: time }).exists());
  },

  checkAmount: (amount) => cy.expect(rootModal.find(TextField({ name: 'amount' })).has({ value: amount.toFixed(2) })),

  setAmount: (amount) => cy.wait(1000).then(() => {
    cy.get('input[name="amount"]').clear().wait(500).type(amount.toFixed(2));
  }),

  setOwner: (owner) => cy.do(ownerSelect.choose(owner)),
  setTransferAccount: (account) => cy.do(transferAccountSelect.choose(account)),
  transferAndConfirm: () => {
    cy.do([transferButton.click(), confirmButton.click()]);
    cy.wait(1000);
  },

  transferFeeFineViaApi: (apiBody, feeFineId) => cy.okapiRequest({
    method: 'POST',
    path: `accounts/${feeFineId}/transfer`,
    body: apiBody,
    isDefaultSearchParamsRequired: false,
  }),
};
