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
      cy.do([
        Select({ name: 'scheduling.weekDays' }).choose(weekDays)
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

  // All three of our acceptance tests use no criteria for the Criteria field
  setCriteria(criteria) {
    if (!criteria) {
      cy.do(Select({ name: 'criteria.type' }).choose('No criteria (always run)'));
    }
  },
  
  // sectionName: string like 'Header', 'Account Data', 'Footer'
  // dataFormat will be a list of options we config
  setDataFormatSection(sectionName, dataFormat) {

  },

  setAmount: (amount) => cy.do(amountTextfield.fillIn(amount.toFixed(2))),
  setOwner: (owner) => cy.do(ownerSelect.choose(owner)),
  setTransferAccount: (account) => cy.do(transferAccountSelect.choose(account)),
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
