import { including, Button, Modal, TextField } from '../../../../interactors';

const rootModal = Modal({ id: 'actualCost' });
const continueButton = Button({ id: 'continueActualCost' });
const closeButton = Button({ id: 'actualCost-close-button' });
const actualCostToBillTextField = TextField({ id: including('text-input') });

export default {
  waitLoading: () => cy.expect(rootModal.exists()),
  closeModal: () => cy.do(closeButton.click()),
  checkActualCostFieldValidation(value) {
    cy.expect([
      actualCostToBillTextField.has({ value }),
      actualCostToBillTextField.has({
        error: 'Actual cost to bill patron must be greater than 0.00 and less than 9999.99',
      }),
      continueButton.has({ disabled: true }),
    ]);
  },
  fillActualCost(value) {
    cy.do([actualCostToBillTextField.fillIn(value), actualCostToBillTextField.blur()]);
  },
};
