import { Button, Modal, TextField, Select, Pane } from '../../../../interactors';

const rootModal = Modal({ id: 'transfer-modal' });
const ownerSelect = rootModal.find(Select({ id: 'ownerId' }));
const transferAccountSelect = rootModal.find(Select({ name: 'method' }));
const confirmModal = Modal('Confirm fee/fine transfer');
const transferButton = rootModal.find(Button({ id: 'submit-button' }));
const confirmButton = confirmModal.find(Button('Confirm'));
const transferPane = Pane('Transfer criteria');

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },

  waitLoadingTransferCriteria() {
    cy.expect(transferPane.exists());
  },

  selectTransferCriteriaSchedulePeriod(period = 'Days') {
    cy.do(Select({ name: 'schedulePeriod' }).choose(period));
  },

  typeScheduleTime(time) {
    // time: string like 9:15 AM
    cy.do([
      TextField({ name: 'scheduleTime' }).fillIn(time),
      Button({ icon: 'clock' }).click(),
      Button('Set time').click(),
    ]);
  },

  verifyScheduleTime(time) {
    cy.expect(TextField({ name: 'scheduleTime', value: time }).exists());
  },

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
