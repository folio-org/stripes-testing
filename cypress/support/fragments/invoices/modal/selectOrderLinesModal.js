import {
  Button,
  Checkbox,
  HTML,
  Modal,
  MultiColumnListRow,
  TextField,
  including,
} from '../../../../../interactors';

const selectOrderLinesModal = Modal('Select order lines');
const closeButton = selectOrderLinesModal.find(Button('Close'));
const saveButton = selectOrderLinesModal.find(Button('Save'));

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
    cy.expect(selectOrderLinesModal.find(HTML(including('1 record found'))).exists());
  },
  selectFromSearchResults(index = 0) {
    cy.do(selectOrderLinesModal.find(MultiColumnListRow({ index })).find(Checkbox()).click());
  },
  clickSaveButton() {
    cy.do(saveButton.click());
    cy.expect(selectOrderLinesModal.absent());
  },
};
