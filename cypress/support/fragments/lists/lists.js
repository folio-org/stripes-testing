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
} from '../../../../interactors';

const saveButton = Button('Save');

export default {
  waitLoading: () => {
    cy.expect(HTML(including('Lists')).exists());
  },

  saveList() {
    cy.do(saveButton.click());
    cy.wait(5000);
  },

  openNewListPane() {
    cy.do(Link('New').click());
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
    cy.expect(Callout({ type: calloutTypes.success }).is({ textContent: message }));
  },

  closeListDetailsPane() {
    cy.get('button[icon=times]').click({ multiple: true });
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
