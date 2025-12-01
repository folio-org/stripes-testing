import { Pane, Button, Checkbox, HTML, including, Select } from '../../../../../../interactors';
import { INVENTORY_DEFAULT_SORT_OPTIONS, INVENTORY_COLUMN_HEADERS } from '../../../../constants';
import InteractorsTools from '../../../../utils/interactorsTools';

const displaySettingsPane = Pane('Display settings');
const defaultSortSelect = Select('Default sort');
const saveButton = displaySettingsPane.find(Button('Save'));
const successSaveCalloutText = 'Setting was successfully updated.';
const defaultColumnsSectionHeader = HTML('Default columns');
const columnHeaderNames = Object.values(INVENTORY_COLUMN_HEADERS).slice(1);

export default {
  waitloading() {
    cy.expect([
      displaySettingsPane.exists(),
      defaultSortSelect.exists(),
      defaultColumnsSectionHeader.exists(),
      saveButton.is({ disabled: true }),
    ]);
    columnHeaderNames.forEach((header) => {
      cy.expect(displaySettingsPane.find(Checkbox(header)).exists());
    });
  },

  verifySelectedDefaultSortOption(option) {
    cy.expect(defaultSortSelect.has({ checkedOptionText: option }));
  },

  verifyDefaultSortOptions() {
    Object.values(INVENTORY_DEFAULT_SORT_OPTIONS).forEach((option) => {
      cy.expect(defaultSortSelect.has({ content: including(option) }));
    });
  },

  changeDefaultSortOption(option) {
    cy.do(defaultSortSelect.choose(option));
    this.verifySelectedDefaultSortOption(option);
    this.checkSaveButtonEnabled();
    cy.do(saveButton.click());
  },

  checkSaveButtonEnabled(isEnabled = true) {
    cy.expect(saveButton.is({ disabled: !isEnabled }));
  },

  checkSuccessCallout() {
    InteractorsTools.checkCalloutMessage(successSaveCalloutText);
    InteractorsTools.dismissCallout(successSaveCalloutText);
  },

  checkAfterSaveSuccess() {
    this.checkSuccessCallout();
    this.checkSaveButtonEnabled(false);
    cy.wait(1000);
  },

  verifyColumnCheckboxChecked(columnName, isChecked = true) {
    cy.expect(displaySettingsPane.find(Checkbox(columnName)).is({ checked: isChecked }));
  },
};
