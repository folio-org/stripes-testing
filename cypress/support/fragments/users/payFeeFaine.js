import { Button, matching, Modal, TextField } from '../../../../interactors';

const rootModal = Modal({ id: 'payment-modal' });

export default {
  waitLoading:() => {
    cy.expect(rootModal.exists());
  },
  checkAmount:(amount) => cy.expect(rootModal.find(TextField({ id:'amount' })).has({ value: amount.toFixed(2) })),
  setPaymentMethod: ({ name: paymentMethodName }) => cy.get('div[class^=modal-] select[name=method]').select(paymentMethodName),
  submit: () => cy.do(rootModal.find(Button({ id:'submit-button' })).click()),
  confirm:() => cy.do(Modal('Confirm fee/fine payment').find(Button({ id: matching('clickable-confirmation-[0-9]+-confirm') })).click())
};

