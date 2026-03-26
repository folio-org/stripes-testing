import { Button, Pane, Select } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const cardsDropdown = Select('Cards to display per page on Version history');
const settingsPane = Pane('Version history');
const saveButton = settingsPane.find(Button('Save'));
const dropdownOptions = ['10', '25', '50', '75', '100'];
const defaultCardsPerPage = '10';
const successSaveCalloutText = 'Setting was successfully updated.';

export default {
  waitLoading() {
    cy.expect(settingsPane.exists());
  },

  verifySaveButtonEnabled(isEnabled = true) {
    cy.expect(saveButton.has({ disabled: !isEnabled }));
  },

  verifyCardsPerPageValue(value) {
    cy.expect(cardsDropdown.has({ value: `${value}` }));
  },

  verifyDefaultCardsPerPage() {
    this.verifyCardsPerPageValue(defaultCardsPerPage);
  },

  verifyDropdownOptions() {
    cy.expect(cardsDropdown.has({ optionsText: dropdownOptions }));
  },

  selectCardsPerPageAndSave(value) {
    cy.do(cardsDropdown.choose(`${value}`));
    this.verifySaveButtonEnabled(true);
    cy.do(saveButton.click());
    InteractorsTools.checkCalloutMessage(successSaveCalloutText);
    this.verifyCardsPerPageValue(value);
  },
};
