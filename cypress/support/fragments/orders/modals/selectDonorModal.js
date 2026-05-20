import {
  Button,
  Checkbox,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  Pane,
  SearchField,
  including,
} from '../../../../../interactors';
import { COMMON_BUTTON_LABELS, DEFAULT_WAIT_TIME, LIST_ASSERTION_MODES } from '../../../constants';
import MCLHelper from '../../multiColumnList';

const selectOrganizationModal = Modal(including('Add donors'));
const filtersPane = selectOrganizationModal.find(Pane('Search & filter'));
const searchField = filtersPane.find(SearchField({ id: 'input-record-search' }));
const resetAllButton = filtersPane.find(Button(COMMON_BUTTON_LABELS.RESET_ALL));
const searchButton = filtersPane.find(Button(COMMON_BUTTON_LABELS.SEARCH));
const saveButton = selectOrganizationModal.find(Button(COMMON_BUTTON_LABELS.SAVE));
const closeButton = selectOrganizationModal.find(Button(COMMON_BUTTON_LABELS.CLOSE));
const resultsList = selectOrganizationModal.find(MultiColumnList());

const NAME_COLUMN = 'Name';

export default {
  waitLoading() {
    cy.expect(selectOrganizationModal.exists());
    cy.expect(filtersPane.exists());
    cy.expect(resultsList.exists());
    cy.expect(closeButton.has({ disabled: false }));
    cy.expect(saveButton.has({ disabled: true }));
    this.assertSelectedDonors(0);
  },

  selectDonors(names = []) {
    const sorted = names.toSorted((a, b) => a.localeCompare(b));

    sorted.forEach((name) => {
      cy.do([searchField.fillIn(name), searchButton.click()]);
      MCLHelper.waitLoadingComplete(resultsList);
      cy.wait(DEFAULT_WAIT_TIME);
      cy.do(
        resultsList
          .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
          .find(Checkbox())
          .click(),
      );
    });
    cy.do(resetAllButton.click());
    MCLHelper.sortListBy(resultsList, NAME_COLUMN);
    this.assertSelectedDonors(names.length);
  },

  submitSelectedDonors() {
    cy.do(saveButton.click());
  },

  assertSelectedDonors(count = 0) {
    cy.expect(selectOrganizationModal.has({ footer: including(`Total selected: ${count}`) }));
  },

  assertModalClosed() {
    cy.expect(selectOrganizationModal.absent());
  },

  assertDonorsListIncludes(names = [], options = {}) {
    const { mode = LIST_ASSERTION_MODES.EXISTS } = options;

    names.forEach((name) => {
      const assertion = resultsList.find(
        MultiColumnListCell({ column: NAME_COLUMN, content: including(name) }),
      )[mode];

      cy.expect(assertion());
    });
  },
};
