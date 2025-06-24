import { Button, Modal, Select, Callout, including } from '../../../../interactors';

const rootModal = Modal(including('Refund fee/fine'));
const confirmationModal = Modal(including('Confirm fee/fine refund'));
const submitButton = rootModal.find(Button({ id: 'submit-button' }));
const confirmButton = confirmationModal.find(Button('Confirm'));

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },
  setAmount: (amount) => cy.get('input[name="amount"]').clear().wait(500).type(amount),
  selectRefundReason: (refundReason) => cy.do(Select({ name: 'method' }).choose(refundReason)),
  submitAndConfirm: () => {
    cy.do([submitButton.click(), confirmButton.click()]);
    cy.wait(1000);
  },
  verifyRefundSuccess: (successMsg) => cy.expect(Callout(including(successMsg)).exists()),
  refundFeeFineViaApi: (apiBody, feeFineId) => cy.okapiRequest({
    method: 'POST',
    path: `accounts/${feeFineId}/refund`,
    body: apiBody,
    isDefaultSearchParamsRequired: false,
  }),
};
