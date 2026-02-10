import {
  Button,
  Checkbox,
  HTML,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  SearchField,
  TextField,
  including,
} from '../../../../../interactors';

const selectOrderLinesModal = Modal('Select order lines');
const closeButton = selectOrderLinesModal.find(Button('Close'));
const saveButton = selectOrderLinesModal.find(Button('Save'));
const searchField = selectOrderLinesModal.find(SearchField({ id: 'input-record-search' }));
const searchButton = selectOrderLinesModal.find(Button('Search'));
const resetButton = selectOrderLinesModal.find(Button({ id: 'reset-find-records-filters' }));

export default {
  verifyModalView() {
    cy.expect([
      selectOrderLinesModal.exists(),
      closeButton.has({ disabled: false, visible: true }),
      saveButton.has({ disabled: true, visible: true }),
    ]);
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
  selectFromSearchResults(index = 0) {
    cy.do(selectOrderLinesModal.find(MultiColumnListRow({ index })).find(Checkbox()).click());
  },
  clickSaveButton() {
    cy.do(saveButton.click());
    cy.wait(2000);
  },
  checkForDifferentVendorWarningAndConfirm() {
    cy.wait(2000);
    cy.get('body').then(($body) => {
      if ($body.text().includes('reference a different vendor')) {
        cy.do(Button('Confirm').click());
        cy.wait(2000);
      }
    });
  },
  closeModal() {
    cy.do(closeButton.click());
    cy.expect(selectOrderLinesModal.absent());
  },
};
