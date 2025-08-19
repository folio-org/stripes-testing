import {
  Button,
  HTML,
  matching,
  Modal,
  TextField,
  including,
  TextArea,
} from '../../../../interactors';

const rootModal = Modal({ id: 'payment-modal' });
const confirmationModal = Modal(including('Confirm fee/fine'));
const amountTextfield = rootModal.find(TextField({ id: 'amount' }));
const submitButton = rootModal.find(Button({ id: 'submit-button' }));
const confirmButton = confirmationModal.find(Button('Confirm'));

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },
  checkAmount: (amount) => cy.expect(amountTextfield.has({ value: amount.toFixed(2) })),
  setPaymentMethod: ({ name: paymentMethodName }) => {
    cy.get('div[class^=modal-] select[name=method]').select(paymentMethodName);
    cy.wait(500);
  },
  fillInAdditionalInformation: (comment) => {
    cy.do(rootModal.find(TextArea({ name: 'comment' })).fillIn(comment));
  },
  submitAndConfirm: () => {
    cy.do([submitButton.click(), confirmButton.click()]);
    cy.wait(1000);
  },
  checkPartialPayConfirmation: () => cy.expect(confirmationModal.find(HTML(including('will be partially paid'))).exists),
  setAmount(amount) {
    cy.get('input[name="amount"]').clear().wait(500).type(amount.toString());
  },
  back: () => cy.do(
    confirmationModal
      .find(Button({ id: matching('clickable-confirmation-[0-9]+-cancel') }))
      .click(),
  ),
  checkRestOfPay(rest) {
    cy.wait(500);
    cy.expect(rootModal.find(HTML(including(`Remaining amount:\n$${rest.toFixed(2)}`))).exists());
  },
  checkConfirmModalClosed: () => cy.expect(HTML(including('Pay fee/fine')).absent()),
  payFeeFineViaApi: (apiBody, feeFineId) => cy.okapiRequest({
    method: 'POST',
    path: `accounts/${feeFineId}/pay`,
    body: apiBody,
    isDefaultSearchParamsRequired: false,
  }),
  verifySaveIsDisabled: () => {
    cy.expect(rootModal.find(Button({ id: 'submit-button' })).is({ disabled: true }));
  },
};
