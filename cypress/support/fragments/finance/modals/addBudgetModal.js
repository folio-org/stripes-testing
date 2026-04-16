import { Button, Modal, Select, TextField, matching } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import States from '../states';

const addBudgetModal = Modal({ id: 'add-budget-modal' });
const fiscalYearSelect = addBudgetModal.find(Select({ name: 'fiscalYearId' }));
const budgetStatusSelect = addBudgetModal.find(Select({ name: 'budgetStatus' }));
const allowableExpenditureTextField = addBudgetModal.find(
  TextField({ name: 'allowableExpenditure' }),
);
const allowableEncumbranceTextField = addBudgetModal.find(
  TextField({ name: 'allowableEncumbrance' }),
);
const allocatedTextField = addBudgetModal.find(TextField({ name: 'allocated' }));

const cancelButton = addBudgetModal.find(Button('Cancel'));
const saveButton = addBudgetModal.find(Button('Save & close'));

export default {
  verifyModalView(header = 'Current budget') {
    cy.expect([
      addBudgetModal.has({ header }),
      fiscalYearSelect.exists(),
      budgetStatusSelect.exists(),
      allowableExpenditureTextField.exists(),
      allowableEncumbranceTextField.exists(),
      allocatedTextField.exists(),
      cancelButton.has({ disabled: false, visible: true }),
      saveButton.has({ disabled: false, visible: true }),
    ]);
  },
  checkBudgetDetails({ fiscalYear, status, expenditure, encumbrance, allocated } = {}) {
    if (fiscalYear) {
      cy.do(fiscalYearSelect.has({ value: fiscalYear }));
    }
    if (status) {
      cy.do(budgetStatusSelect.has({ value: status }));
    }
    if (expenditure) {
      cy.do(allowableExpenditureTextField.has({ value: expenditure }));
    }
    if (encumbrance) {
      cy.do(allowableEncumbranceTextField.has({ value: encumbrance }));
    }
    if (allocated) {
      cy.do(allocatedTextField.has({ value: allocated }));
    }
  },
  fillBudgetDetails({ fiscalYear, status, expenditure, encumbrance, allocated } = {}) {
    if (fiscalYear) {
      cy.do(fiscalYearSelect.choose(fiscalYear));
    }
    if (status) {
      cy.do(budgetStatusSelect.choose(status));
    }
    if (expenditure) {
      cy.do(allowableExpenditureTextField.fillIn(expenditure));
    }
    if (encumbrance) {
      cy.do(allowableEncumbranceTextField.fillIn(encumbrance));
    }
    if (allocated !== undefined) {
      cy.do(allocatedTextField.fillIn(allocated));
    }
  },
  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(addBudgetModal.absent());
  },
  clickSaveButton({ budgetCreated = true } = {}) {
    cy.do(saveButton.click());
    cy.expect(addBudgetModal.absent());

    if (budgetCreated) {
      InteractorsTools.checkCalloutMessage(matching(new RegExp(States.budgetCreatedSuccessfully)));
    }
  },
  clickSaveButtonWithoutClosing() {
    cy.do(saveButton.click());
    cy.expect(addBudgetModal.exists());
  },
  checkAllocatedFieldError(errorMessage) {
    cy.expect(allocatedTextField.has({ error: errorMessage }));
  },
  fillInAllocated(value) {
    cy.get('[name="allocated"]').type('{selectall}{backspace}', { delay: 50 });
    cy.get('[name="allocated"]').type(value, { delay: 100 });
  },
  fillInExpenditure(value) {
    cy.get('[name="allowableExpenditure"]').type('{selectall}{backspace}', { delay: 50 });
    cy.get('[name="allowableExpenditure"]').type(value, { delay: 100 });
  },
  fillInEncumbrance(value) {
    cy.get('[name="allowableEncumbrance"]').type('{selectall}{backspace}', { delay: 50 });
    cy.get('[name="allowableEncumbrance"]').type(value, { delay: 100 });
  },
  clearEncumbranceField() {
    cy.get('[name="allowableEncumbrance"]').type('{selectall}{backspace}', { delay: 50 });
  },
  checkExpenditureFieldError(errorMessage) {
    cy.expect(allowableExpenditureTextField.has({ error: errorMessage }));
  },
  checkEncumbranceFieldError(errorMessage) {
    cy.expect(allowableEncumbranceTextField.has({ error: errorMessage }));
  },
};
