import {
  Button,
  including,
  RadioButton,
  Link,
  HTML,
  TextField,
  TextArea,
  Callout,
  calloutTypes,
  MultiColumnListRow,
  MultiColumnListCell,
  Modal,
} from '../../../../interactors';

const closeModal = Modal();
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
const DeleteButton = Button('Delete');
const cancelRefresh = Button('Cancel refresh');
const buildQueryButton = Button('Build query');
const closeWithoutSavingButton = Button('Close without saving');
// const keepEditingButton = Button('Keep editing');
const keepEditingButton = closeModal.find(Button('Keep editing'));
const actions = Button('Actions');
const refreshList = Button('Refresh list');
const editList = Button('Edit list');
const exportList = Button('Export list (CSV)');
const testQuery = Button('Test query');
const runQuery = Button('Run query & save');

export default {
  waitLoading: () => {
    cy.expect(HTML(including('Lists')).exists());
  },

  queryBuilderActions() {
    cy.get('#field-option-0').click();
    cy.contains('User active').click();
    cy.get('[data-testid="operator-option-0"]').select('==');
    cy.get('[data-testid="data-input-select-boolType"]').select('True');
    cy.do(testQuery.click());
    cy.wait(3000);
    cy.do(runQuery.click());
    cy.wait(1000);
  },

  actionButton() {
    cy.do(actions.click());
    cy.wait(1000);
  },
  refreshList() {
    cy.do(refreshList.click());
    cy.wait(5000);
  },

  DeleteListModal() {
    cy.do(DeleteButton.click());
    cy.wait(5000);
  },

  cancelRefresh() {
    cy.do(cancelRefresh.click());
    cy.wait(5000);
  },

  saveList() {
    cy.do(saveButton.click());
    cy.wait(5000);
  },

  buildQuery() {
    cy.do(buildQueryButton.click());
    cy.wait(5000);
  },

  editList() {
    cy.do(editList.click());
    cy.wait(5000);
  },

  exportList() {
    cy.do(exportList.click());
  },

  cancelList() {
    cy.do(cancelButton.click());
    cy.wait(5000);
  },
  closeWithoutSaving() {
    cy.do(closeWithoutSavingButton.click());
    cy.wait(5000);
  },

  keepEditing() {
    cy.do(keepEditingButton.click());
    cy.wait(5000);
  },

  openNewListPane() {
    cy.do(Link('New').click());
  },

  expiredPatronLoan() {
    cy.do(Link('Inactive patrons with open loans').click());
  },

  missingItems() {
    cy.do(Link('Missing items').click());
  },

  setName(value) {
    cy.do(TextField({ name: 'listName' }).fillIn(value));
  },

  setDescription(value) {
    cy.do(TextArea({ name: 'description' }).fillIn(value));
  },

  selectRecordType(option) {
    cy.get('select[name=recordType]').select(option);
  },

  selectVisibility(visibility) {
    cy.do(RadioButton(visibility).click());
  },

  selectStatus(status) {
    cy.do(RadioButton(status).click());
  },

  verifySuccessCalloutMessage(message) {
    cy.expect(Callout({ type: calloutTypes.info }).is({ textContent: message }));
  },

  cancelListPopup: () => {
    cy.expect(Modal({ header: 'Are you sure?' }).exists());
    cy.expect(Modal({ message: 'There are unsaved changes' }).exists());
  },

  closeListDetailsPane() {
    cy.get('button[icon=times]').click({ multiple: true });
  },

  verifyListIsNotPresent(listName) {
    return cy.get('*[class^="mclRowContainer"]').contains(listName).should('not.exist');
  },

  findResultRowIndexByContent(content) {
    return cy
      .get('*[class^="mclCell"]')
      .contains(content)
      .parent()
      .parent()
      .invoke('attr', 'data-row-inner');
  },

  checkResultSearch(searchResults, rowIndex = 0) {
    return cy.wrap(Object.values(searchResults)).each((contentToCheck) => {
      cy.expect(
        MultiColumnListRow({ indexRow: `row-${rowIndex}` })
          .find(MultiColumnListCell({ content: including(contentToCheck) }))
          .exists(),
      );
    });
  },

  getViaApi() {
    return cy.okapiRequest({
      method: 'GET',
      path: 'lists',
    });
  },

  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `lists/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
