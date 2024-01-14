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

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },
  checkAmount: (amount) => cy.expect(amountTextfield.has({ value: amount.toFixed(2) })),
  setPaymentMethod: ({ name: paymentMethodName }) => cy.get('div[class^=modal-] select[name=method]').select(paymentMethodName),
  fillInAdditionalInformation: (comment) => {
    cy.do(rootModal.find(TextArea({ name: 'comment' })).fillIn(comment));
  },
  submitAndConfirm: () => {
    cy.do(rootModal.find(Button({ id: 'submit-button' })).click());
    cy.expect(confirmationModal.exists());
    cy.do(
      confirmationModal
        .find(Button({ id: matching('clickable-confirmation-[0-9]+-confirm') }))
        .click(),
    );
  },
  checkPartialPayConfirmation: () => cy.expect(confirmationModal.find(HTML(including('will be partially paid'))).exists),
  setAmount: (amount) => cy.do(amountTextfield.fillIn(amount.toString())),
  back: () => cy.do(
    confirmationModal
      .find(Button({ id: matching('clickable-confirmation-[0-9]+-cancel') }))
      .click(),
  ),
  checkRestOfPay: (rest) => cy.expect(rootModal.find(HTML(including(`Remaining amount:\n${rest.toFixed(2)}`))).exists()),
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
