import {
  Button,
  Checkbox,
  HTML,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  SearchField,
  Section,
  TextField,
  including,
} from '../../../../../interactors';
import { SEARCH_AND_FILTER_PANE_TITLE } from '../../../constants';
import FiltersPane from '../../filtersPane';
import MultiColumnListHelper from '../../multiColumnList';

const selectOrderLinesModal = Modal('Select order lines');
const closeButton = selectOrderLinesModal.find(Button('Close'));
const saveButton = selectOrderLinesModal.find(Button('Save'));
const searchField = selectOrderLinesModal.find(SearchField({ id: 'input-record-search' }));
const searchButton = selectOrderLinesModal.find(Button('Search'));
const resetButton = selectOrderLinesModal.find(Button({ id: 'reset-find-records-filters' }));
const filtersPane = selectOrderLinesModal.find(Section({ title: SEARCH_AND_FILTER_PANE_TITLE }));
const resultsList = selectOrderLinesModal.find(MultiColumnList());

const ACQUISITION_UNIT_FILTER_LABEL = 'Acquisition unit';

export default {
  verifyModalView({ multiselect = true } = {}) {
    cy.expect([
      selectOrderLinesModal.exists(),
      closeButton.has({ disabled: false, visible: true }),
    ]);

    if (multiselect) {
      cy.expect(saveButton.has({ disabled: true, visible: true }));
    }
  },
  selectOrderLine(poNumber) {
    this.searchByName(poNumber);
    this.selectFromSearchResults();
    this.clickSaveButton();
  },
  searchByName(poNumber) {
    cy.do([
      selectOrderLinesModal.find(TextField({ id: 'input-record-search' })).fillIn(poNumber),
      selectOrderLinesModal.find(Button('Search')).click(),
    ]);
    cy.expect(
      selectOrderLinesModal.find(HTML(including('Enter search criteria to start search'))).absent(),
    );
  },
  searchByParameter(searchOption, value) {
    cy.do([searchField.selectIndex(searchOption), searchField.fillIn(value), searchButton.click()]);
    cy.expect(
      selectOrderLinesModal.find(HTML(including('Enter search criteria to start search'))).absent(),
    );
  },
  resetFilters() {
    cy.do(resetButton.click());
    cy.wait(1000);
  },
  checkSearchResults(titleOrPackage) {
    cy.expect(
      selectOrderLinesModal
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: titleOrPackage }),
    );
  },
  assertSearchResults(titles = []) {
    cy.expect(selectOrderLinesModal.exists());
    if (!titles.length) {
      cy.expect(selectOrderLinesModal.find(HTML(including('No results found'))).exists());
      return;
    }
    titles.forEach((title) => {
      cy.expect(resultsList.find(MultiColumnListCell({ content: title })).exists());
    });
    MultiColumnListHelper.assertRowCount(resultsList, titles.length);
  },
  selectFromSearchResults(index = 0) {
    cy.do(selectOrderLinesModal.find(MultiColumnListRow({ index })).find(Checkbox()).click());
  },
  clickSaveButton() {
    cy.do(saveButton.click());
    cy.wait(2000);
  },
  checkForDifferentVendorWarningAndConfirm() {
    cy.wait(2000);
    const confirmationModal = Modal('Confirmation');
    cy.expect([
      confirmationModal.exists(),
      confirmationModal.has({
        message: including(
          'You are adding one or more purchase order lines that reference a different vendor than the one identified on this invoice',
        ),
      }),
      confirmationModal.find(Button('Cancel')).exists(),
      confirmationModal.find(Button('Confirm')).exists(),
    ]);
    cy.do(confirmationModal.find(Button('Confirm')).click());
    cy.wait(2000);
  },
  closeModal() {
    cy.do(closeButton.click());
    cy.expect(selectOrderLinesModal.absent());
  },

  clearAllFilters(options) {
    FiltersPane.clearAllFilters(filtersPane, options);
  },

  filterByMultiSelectOptions(filterLabel, values, options) {
    FiltersPane.filterByMultiSelectOptions(filtersPane, filterLabel, values, options);
  },

  filterBySelection(filterLabel, value, options) {
    FiltersPane.filterBySelection(filtersPane, filterLabel, value, options);
  },

  filterByAcqUnit(value, options) {
    this.filterBySelection(ACQUISITION_UNIT_FILTER_LABEL, value, options);
  },
};
