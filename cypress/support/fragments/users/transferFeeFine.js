import { el } from 'date-fns/locale';
import { Button, Modal, TextField, Select, Pane, MultiSelect } from '../../../../interactors';

const rootModal = Modal({ id: 'transfer-modal' });
const amountTextfield = rootModal.find(TextField({ id: 'amount' }));
const ownerSelect = rootModal.find(Select({ id: 'ownerId' }));
const transferAccountSelect = rootModal.find(Select({ name: 'method' }));
const transferButton = rootModal.find(Button({ id: 'submit-button' }));
const confirmModal = Modal('Confirm fee/fine transfer');
const confirmButton = confirmModal.find(Button('Confirm'));
const transferPane = Pane('Transfer configuration');

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },

  waitLoadingTransferCriteria() {
    cy.expect(transferPane.exists());
  },

  setTransferCriteriaScheduling(frequency, interval, time, weekDays) {
    cy.do(Select({ name: 'scheduling.frequency' }).choose(frequency));

    if (frequency === 'Weeks') {
      cy.do([
        TextField({ name: 'scheduling.time' }).fillIn(time)
      ]);
      cy.do([
        TextField({ name: 'scheduling.interval' }).fillIn(interval)
      ]);
    }
    else if (frequency === 'Days') {
      cy.do([
        Select({ name: 'scheduling.interval' }).choose(interval)
      ]);
    }
    else if (frequency === 'Hours') {
    }
    else return;
  },

  setAggregateByPatron(aggregate) {
    if (!aggregate) {
      cy.get('input[name="aggregate"]').uncheck(
        { force: true }
      );
    }
    // Currently don't have any test cases for aggregate by patron
  },

  runManually() {
    cy.do([
      Button({ text: 'Run manually' }).click(),
    ]);
    cy.get('@alert').should('have.been.calledOnceWith', 'Job has been scheduled')
  },

  typeScheduleTime(time) {
    // time: string like 9:15 AM
    cy.do([
      TextField({ name: 'scheduleTime' }).fillIn(time),
      Button({ icon: 'clock' }).click(),
      Button('Set time').click()
    ]);
  },

  verifyScheduleTime(time) {
    cy.expect(TextField({ name: 'scheduleTime', value: time }).exists());
  },

  setCriteria(criteria) {
    if (!criteria) {
      cy.do(Select({ name: 'criteria.type' }).choose('No criteria (always run)'));
    }
    // Currently don't have any test cases for criteria
  },

  setTransferAccount(feeFineOwner, transferAccount) {
    cy.do([
      Select({ name: 'transferInfo.else.owner' }).choose(feeFineOwner),
      Select({ name: 'transferInfo.else.account' }).choose(transferAccount)
    ]);
  },

  openAllPanes() {
    if (!Button({ text: 'Collapse all' }).exists()) {
      cy.do([
        Button({ text: 'Expand all' }).click()
      ]);
    }
  },

  setAmount: (amount) => cy.do(amountTextfield.fillIn(amount.toFixed(2))),
  setOwner: (owner) => cy.do(ownerSelect.choose(owner)),
  transferAndConfirm: () => {
    cy.do([
      transferButton.click(),
      confirmButton.click(),
    ]);
  },

  transferFeeFineViaApi:(apiBody, feeFineId) => cy.okapiRequest({
    method: 'POST',
    path: `accounts/${feeFineId}/transfer`,
    body: apiBody,
    isDefaultSearchParamsRequired: false
  }),
};
