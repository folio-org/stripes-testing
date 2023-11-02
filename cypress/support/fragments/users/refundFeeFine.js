import { Button, matching, Modal, Select, TextField, including } from '../../../../interactors';

const rootModal = Modal({ id: 'refund-modal' });
const confirmationModal = Modal(including('Confirm fee/fine'));
const amountTextfield = rootModal.find(TextField({ id: 'amount' }));

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },
  setAmount: (amount) => cy.do(amountTextfield.fillIn(amount)),
  selectRefundReason: (refundReason) => cy.do(Select({ name: 'method' }).choose(refundReason)),
  submitAndConfirm: () => {
    cy.do(rootModal.find(Button({ id: 'submit-button' })).click());
    cy.do(
      confirmationModal
        .find(Button({ id: matching('clickable-confirmation-[0-9]+-confirm') }))
        .click(),
    );
  },
  refundFeeFineViaApi: (apiBody, feeFineId) => cy.okapiRequest({
    method: 'POST',
    path: `accounts/${feeFineId}/refund`,
    body: apiBody,
    isDefaultSearchParamsRequired: false,
  }),
};
