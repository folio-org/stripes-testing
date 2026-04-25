import { DEFAULT_WAIT_TIME } from '../../../constants';
import { Button, Checkbox, Section, TextField } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const ledgerEditForm = Section({ id: 'pane-ledger-form' });

const nameField = TextField('Name*');
const codeField = TextField('Code*');
const fiscalYearDropdown = '[name="fiscalYearOneId"]';
const saveAndCloseButton = Button({ id: 'clickable-save-title' });
const encumbranceLimitsCheckbox = Checkbox({ name: 'restrictEncumbrance' });
const expenditureLimitsCheckbox = Checkbox({ name: 'restrictExpenditures' });

const ledgerSuccessfullySavedMessage = 'Ledger has been saved';

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(ledgerEditForm.exists());
    cy.expect(saveAndCloseButton.has({ visible: true, disabled: true }));
  },

  fillInNameField(value) {
    cy.do(nameField.fillIn(value));
  },

  fillInCodeField(value) {
    cy.do(codeField.fillIn(value));
  },

  selectFiscalYear(value) {
    cy.get(fiscalYearDropdown).select(value);
  },

  clickEncumbranceLimitsCheckbox() {
    cy.do(encumbranceLimitsCheckbox.click());
  },

  clickExpenditureLimitsCheckbox() {
    cy.do(expenditureLimitsCheckbox.click());
  },

  clickSaveCloseButton({ isSuccess = true } = {}) {
    cy.do(saveAndCloseButton.click());
    if (isSuccess) {
      cy.expect(ledgerEditForm.absent());
      InteractorsTools.checkCalloutMessage(ledgerSuccessfullySavedMessage);
    }
  },
};
