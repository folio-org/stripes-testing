import {
  including,
  Button,
  Modal,
  KeyValue,
  TextArea,
  Callout,
  calloutTypes,
} from '../../../../interactors';

const rootModal = Modal({ id: 'actualCost' });
const cancelButton = Button({ id: 'cancelActualCost' });
const continueButton = Button({ id: 'continueActualCost' });
const closeButton = Button({ id: 'actualCost-close-button' });
const confirmButton = Button({ id: 'confirmActualCost' });
const keepEditingButton = Button({ id: 'keepEditingActualCost' });

export default {
  waitLoading: () => cy.expect(rootModal.exists()),
  confirm: () => cy.do(confirmButton.click()),
  cancel: () => cy.do(cancelButton.click()),
  continue: () => {
    cy.do(continueButton.click());
    cy.expect(Modal(including('Confirm no bill to be created for')).exists());
  },
  closeModal: () => cy.do(closeButton.click()),
  keepEditing: () => cy.do(keepEditingButton.click()),
  checkModalInfo: (user, owner) => {
    cy.expect([
      Modal(including(`Do not bill ${user.username}, ${user.firstName}`)).exists(),
      KeyValue('Fee/fine owner').has({ value: owner.owner }),
      KeyValue('Fee/fine type').has({ value: 'Lost item fee (actual cost)' }),
      KeyValue('Actual cost to bill patron').has({ value: '0.00' }),
      TextArea({ id: including('textarea-input') }).has({ value: '' }),
      cancelButton.exists(),
      continueButton.exists(),
    ]);
  },
  checkConfirmModalInfo: (user) => {
    cy.expect([
      Modal(
        including(`Confirm no bill to be created for ${user.username}, ${user.firstName}`),
      ).exists(),
      KeyValue('Additional information for staff').has({ value: including('-') }),
      confirmButton.exists(),
      keepEditingButton.exists(),
    ]);
  },
  verifyCalloutMessage(user) {
    cy.expect(
      Callout({ type: calloutTypes.success }).is({
        textContent: `A lost item fee will not be charged to ${user.username}, ${user.firstName} testMiddleName`,
      }),
    );
  },
};
