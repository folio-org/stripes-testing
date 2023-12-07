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
  Accordion,
} from '../../../../interactors';

const closeModal = Modal();
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
const closeWithoutSavingButton = Button('Close without saving');
// const keepEditingButton = Button('Keep editing');
const keepEditingButton = closeModal.find(Button('Keep editing'));
const actions = Button('Actions');
const refreshList = Button('Refresh list');

export default {
  waitLoading: () => {
    cy.expect(HTML(including('Lists')).exists());
  },

  actionButton() {
    cy.do(actions.click());
    cy.wait(3000);
  },
  refreshList() {
    cy.do(refreshList.click());
    cy.wait(5000);
  },

  saveList() {
    cy.do(saveButton.click());
    cy.wait(5000);
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
