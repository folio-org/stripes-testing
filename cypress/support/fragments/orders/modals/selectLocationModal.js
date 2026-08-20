import {
  Button,
  Checkbox,
  including,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  SearchField,
  TextField,
} from '../../../../../interactors';
import { COMMON_BUTTON_LABELS, DEFAULT_WAIT_TIME } from '../../../constants';

const selectLocationModal = Modal(including('Select location'));
const resetAllButton = selectLocationModal.find(Button(COMMON_BUTTON_LABELS.RESET_ALL));
const saveButton = selectLocationModal.find(Button(COMMON_BUTTON_LABELS.SAVE));
const searchInput = selectLocationModal.find(TextField({ id: 'input-record-search' }));
const searchButton = selectLocationModal.find(Button(COMMON_BUTTON_LABELS.SEARCH));

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(selectLocationModal.exists());
  },

  verifyModalView() {
    cy.expect(selectLocationModal.exists());
  },

  clearSearchField() {
    cy.do(
      selectLocationModal
        .find(SearchField({ id: 'input-record-search' }))
        .find(TextField())
        .perform(($el) => {
          cy.wrap($el).get('input#input-record-search').clear();
        }),
    );
  },

  searchLocation(locationSearchValue) {
    cy.do([searchInput.fillIn(locationSearchValue), searchButton.click()]);

    cy.expect(resetAllButton.has({ disabled: !locationSearchValue }));
    cy.expect(
      selectLocationModal
        .find(
          MultiColumnListRow({
            indexRow: 'row-0',
            content: including(locationSearchValue),
          }),
        )
        .exists(),
    );
  },

  selectLocation(locationSearchValue, { multiselect = false } = {}) {
    this.searchLocation(locationSearchValue);

    if (multiselect) {
      cy.expect(saveButton.has({ disabled: false, visible: true }));
      cy.do([
        selectLocationModal
          .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
          .find(Checkbox())
          .checkIfNotSelected(),
        saveButton.click(),
      ]);
    } else {
      cy.do(
        selectLocationModal
          .find(MultiColumnListCell({ content: locationSearchValue, row: 0, columnIndex: 0 }))
          .click(),
      );
    }
  },

  selectMultipleLocations(locationSearchValues = []) {
    locationSearchValues.forEach((locationSearchValue) => {
      this.searchLocation(locationSearchValue);

      cy.do(
        selectLocationModal
          .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
          .find(Checkbox())
          .checkIfNotSelected(),
      );
    });
    cy.do(saveButton.click());
  },
};
