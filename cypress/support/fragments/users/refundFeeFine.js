import { Button, Modal, Select, Callout, HTML, Checkbox, including } from '../../../../interactors';

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
  verifyNotifyPatronNotPresent: () => {
    cy.expect(rootModal.find(HTML(including('Notify patron'))).absent());
    cy.expect(rootModal.find(Checkbox({ name: 'notify' })).absent());
  },
  verifyAdditionalInfoNotPresent: () => {
    cy.expect(rootModal.find(HTML(including('Additional information for patron'))).absent());
  },
  refundFeeFineViaApi: (apiBody, feeFineId) => cy.okapiRequest({
    method: 'POST',
    path: `accounts/${feeFineId}/refund`,
    body: apiBody,
    isDefaultSearchParamsRequired: false,
  }),
};
