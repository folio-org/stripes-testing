import {
  Accordion,
  Button,
  Callout,
  calloutTypes,
  Checkbox,
  HTML,
  including,
  KeyValue,
  Link,
  ListRow,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  Pane,
  RadioButton,
  TextArea,
  TextField,
} from '../../../../interactors';
import ArrayUtils from '../../utils/arrays';

const listNameTextField = TextField({ name: 'listName' });
const listDescriptionTextArea = TextArea({ name: 'description' });
const closeModal = Modal();
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
const deleteButton = Button('Delete');
const cancelRefresh = Button('Cancel refresh');
const buildQueryButton = Button('Build query');
const closeWithoutSavingButton = Button('Close without saving');
// const keepEditingButton = Button('Keep editing');
const keepEditingButton = closeModal.find(Button('Keep editing'));
const actions = Button('Actions');
const refreshList = Button('Refresh list');
const editList = Button('Edit list');
const duplicateList = Button('Duplicate list');
const deleteList = Button('Delete list');
const exportList = Button('Export all columns (CSV)');
const exportListVisibleColumns = Button('Export visible columns (CSV)');
const testQuery = Button('Test query');
const runQuery = Button('Run query & save');
const filterPane = Pane('Filter');
const newLink = new Link('New');
const statusAccordion = filterPane.find(Accordion('Status'));
const visibilityAccordion = filterPane.find(Accordion('Visibility'));
const recordTypesAccordion = filterPane.find(Accordion('Record types'));
const resetAllButton = filterPane.find(Button('Reset all'));
const clearFilterButton = Button({ icon: 'times-circle-solid' });
const editQueryButton = Button('Edit query');

const activeCheckbox = Checkbox({ id: 'clickable-filter-status-active' });
const inactiveCheckbox = Checkbox({ id: 'clickable-filter-status-inactive' });
const sharedCheckbox = Checkbox({ id: 'clickable-filter-visibility-shared' });
const privateCheckbox = Checkbox({ id: 'clickable-filter-visibility-private' });

export default {
  waitLoading: () => {
    cy.expect(HTML(including('Lists')).exists());
    cy.wait(2000);
  },

  waitForSpinnerToDisappear() {
    cy.get('[class^="spinner"]').should('not.exist');
  },

  waitForCompilingToComplete() {
    cy.wait(1000);
    cy.get('[class^=compilerWrapper]', { timeout: 120000 }).should('not.exist');
    cy.wait(1000);
    cy.get('body').then(($body) => {
      if ($body.find('div[data-test-message-banner]').length > 0) {
        this.viewUpdatedList();
      } else {
        cy.log('"View updated list" didn\'t appear');
      }
    });
  },

  queryBuilderActions() {
    this.queryBuilderActionsWithParameters('Users — User — Active', '==', 'True');
  },

  queryBuilderActionsWithParameters(parameter, operator, value) {
    cy.get('#field-option-0').click();
    cy.contains(parameter).click();
    cy.get('[data-testid="operator-option-0"]').select(operator);
    cy.get('[data-testid="data-input-select-boolType"]').select(value);
    cy.do(testQuery.click());
    cy.wait(1000);
    cy.do(runQuery.click());
    cy.wait(2000);
  },

  openActions() {
    cy.wait(500);
    cy.do(actions.click());
    cy.wait(500);
  },

  verifyActionsButtonDoesNotExist() {
    cy.expect(actions.absent());
  },

  refreshList() {
    cy.do(refreshList.click());
    cy.wait(3000);
  },

  verifyRefreshListButtonIsActive() {
    cy.expect(refreshList.exists());
    cy.expect(refreshList.has({ disabled: false }));
  },

  verifyRefreshListButtonIsDisabled() {
    cy.expect(refreshList.has({ disabled: true }));
  },

  verifyRefreshListButtonDoesNotExist() {
    cy.expect(refreshList.absent());
  },

  editQuery() {
    cy.do(editQueryButton.click());
    cy.wait(1000);
  },

  verifyEditorContainsQuery(query) {
    cy.get('[id^=selected-field-option]').contains(query.field);
    cy.get('[data-testid="operator-option-0"]').contains(query.operator);
    cy.get('[data-testid="data-input-select-boolType"]').contains(query.value);
  },

  confirmDelete() {
    cy.do(deleteButton.click());
    cy.wait(1000);
  },

  cancelRefresh() {
    cy.do(cancelRefresh.click());
    cy.wait(1000);
  },

  saveList() {
    cy.do(saveButton.click());
    cy.wait(1000);
  },

  buildQuery() {
    cy.do(buildQueryButton.click());
    cy.wait(1000);
  },

  editList() {
    cy.do(editList.click());
    cy.wait(2000);
  },

  duplicateList() {
    cy.do(duplicateList.click());
    cy.wait(1000);
  },

  verifyDuplicateListButtonIsActive() {
    cy.expect(duplicateList.exists());
    cy.expect(duplicateList.has({ disabled: false }));
  },

  verifyDuplicateListButtonIsDisabled() {
    cy.expect(duplicateList.has({ disabled: true }));
  },

  verifyDuplicateListButtonDoesNotExist() {
    cy.expect(duplicateList.absent());
  },

  deleteList() {
    cy.do(deleteList.click());
    cy.wait(1000);
  },

  verifyDeleteListButtonIsActive() {
    cy.expect(deleteList.exists());
    cy.expect(deleteList.has({ disabled: false }));
  },

  verifyDeleteListButtonIsDisabled() {
    cy.expect(deleteList.has({ disabled: true }));
  },

  verifyDeleteListButtonDoesNotExist() {
    cy.expect(deleteList.absent());
  },

  verifyEditListButtonIsDisabled() {
    cy.expect(editList.has({ disabled: true }));
  },

  verifyEditListButtonDoesNotExist() {
    cy.expect(editList.absent());
  },

  verifyEditListButtonIsActive() {
    cy.expect(editList.exists());
    cy.expect(editList.has({ disabled: false }));
  },

  exportList() {
    cy.do(exportList.click());
    cy.wait(1000);
  },

  exportListVisibleColumns() {
    cy.do(exportListVisibleColumns.click());
    cy.wait(1000);
  },

  verifyExportListButtonIsDisabled() {
    cy.expect(exportList.has({ disabled: true }));
  },

  verifyExportListButtonDoesNotExist() {
    cy.expect(exportList.absent());
  },

  verifyExportListButtonIsActive() {
    cy.expect(exportList.exists());
    cy.expect(exportList.has({ disabled: false }));
  },

  cancelList() {
    cy.do(cancelButton.click());
    cy.wait(3000);
  },

  closeWithoutSaving() {
    cy.do(closeWithoutSavingButton.click());
    cy.wait(3000);
  },

  keepEditing() {
    cy.do(keepEditingButton.click());
    cy.wait(3000);
  },

  openNewListPane() {
    cy.do(newLink.click());
  },

  verifyNewButtonIsEnabled() {
    cy.expect(newLink.exists());
  },

  verifyNewButtonIsDisabled() {
    cy.expect(newLink.has({ disabled: true }));
  },

  verifyNewButtonDoesNotExist() {
    cy.expect(newLink.absent());
  },

  expiredPatronLoan() {
    cy.do(Link('Inactive patrons with open loans').click());
  },

  missingItems() {
    cy.do(Link('Missing items').click());
  },

  setName(value) {
    cy.do(listNameTextField.fillIn(value));
  },

  verifyListName(value) {
    cy.expect(listNameTextField.has({ value }));
  },

  setDescription(value) {
    cy.do(listDescriptionTextArea.fillIn(value));
  },

  verifyListDescription(value) {
    cy.expect(listDescriptionTextArea.has({ value }));
  },

  selectRecordTypeOld(option) {
    cy.get('select[name=recordType]').select(option);
  },

  selectRecordType(option) {
    cy.get('button[name=recordType]')
      .click()
      .then(() => {
        cy.wait(500);
        cy.get('li[role=option]').contains(option).click();
        cy.wait(500);
      });
  },

  checkKeyValue(label, value) {
    cy.expect(KeyValue(label, { value }).exists());
  },

  verifyRecordType(recordType) {
    this.checkKeyValue('Record type', recordType);
  },

  selectVisibility(visibility) {
    cy.do(RadioButton(visibility).click());
    this.waitForSpinnerToDisappear();
    cy.wait(500);
  },

  verifyVisibility(visibility, selected) {
    cy.expect(RadioButton(visibility).has({ checked: selected }));
  },

  selectStatus(status) {
    cy.do(RadioButton(status).click());
    this.waitForSpinnerToDisappear();
    cy.wait(500);
  },

  verifyStatus(status, selected) {
    cy.expect(RadioButton(status).has({ checked: selected }));
  },

  verifySuccessCalloutMessage(message) {
    cy.expect(Callout({ type: calloutTypes.success }).is({ textContent: message }));
  },

  verifyCalloutMessage(message) {
    cy.expect(Callout(including(message)).exists());
  },

  cancelListPopup: () => {
    cy.expect(Modal({ header: 'Are you sure?' }).exists());
    cy.expect(Modal({ message: 'There are unsaved changes' }).exists());
  },

  closeListDetailsPane() {
    cy.get('button[icon=times]').click({ multiple: true });
  },

  verifyListIsNotPresent(listName) {
    cy.get('#OverlayContainer').contains(listName).should('not.exist');
  },

  verifyListIsPresent(listName) {
    return cy.get('*[class^="mclRowContainer"]').contains(listName).should('be.visible');
  },

  openList(listName) {
    cy.do(
      ListRow(including(listName))
        .find(MultiColumnListCell({ content: including(listName) }))
        .find(Button(listName))
        .click(),
    );
    cy.wait(1000);
    this.waitForCompilingToComplete();
  },

  verifyListsPaneIsEmpty() {
    cy.expect(HTML('The list contains no items').exists());
  },

  findResultRowIndexByContent(content) {
    return cy
      .get('*[class^="mclCell"]')
      .contains(content)
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

  clickOnAccordionInFilter(accordionName) {
    cy.do(filterPane.find(Accordion(accordionName)).clickHeader());
  },

  verifyAccordionExpandedInFilter(accordionName) {
    cy.expect(filterPane.find(Accordion(accordionName)).has({ open: true }));
  },

  verifyAccordionCollapsedInFilter(accordionName) {
    cy.expect(filterPane.find(Accordion(accordionName)).has({ open: false }));
  },

  verifyStatusAccordionDefaultContent() {
    cy.expect([
      statusAccordion.find(Checkbox('Active')).has({ checked: true }),
      statusAccordion.find(Checkbox('Inactive')).has({ checked: false }),
      statusAccordion.find(clearFilterButton).exists(),
    ]);
  },

  verifyVisibilityAccordionDefaultContent() {
    cy.expect([
      visibilityAccordion.find(Checkbox('Shared')).has({ checked: false }),
      visibilityAccordion.find(Checkbox('Private')).has({ checked: false }),
    ]);
  },

  verifyRecordTypesAccordionDefaultContent() {
    cy.expect([
      recordTypesAccordion.find(Checkbox('Items')).has({ checked: false }),
      recordTypesAccordion.find(Checkbox('Loans')).has({ checked: false }),
      recordTypesAccordion.find(Checkbox('Users')).has({ checked: false }),
      recordTypesAccordion.find(Checkbox('Purchase order lines')).has({ checked: false }),
    ]);
  },

  selectActiveLists() {
    cy.do(activeCheckbox.checkIfNotSelected());
    this.waitForSpinnerToDisappear();
    cy.wait(500);
  },

  selectInactiveLists() {
    cy.do(inactiveCheckbox.checkIfNotSelected());
    this.waitForSpinnerToDisappear();
    cy.wait(500);
  },

  selectSharedLists() {
    cy.do(sharedCheckbox.checkIfNotSelected());
    this.waitForSpinnerToDisappear();
    cy.wait(500);
  },

  selectPrivateLists() {
    cy.do(privateCheckbox.checkIfNotSelected());
    this.waitForSpinnerToDisappear();
    cy.wait(500);
  },

  clickOnCheckbox(name) {
    cy.do(filterPane.find(Checkbox(name)).click());
  },

  selectRecordTypeFilter(type) {
    cy.do(MultiSelect().choose(type));
    cy.wait(1000);
  },

  verifyCheckboxChecked(name) {
    cy.expect(filterPane.find(Checkbox(name)).has({ checked: true }));
  },

  verifyCheckboxUnchecked(name) {
    cy.expect(filterPane.find(Checkbox(name)).has({ checked: false }));
  },

  clickOnClearFilterButton(accordionName) {
    cy.do(
      filterPane
        .find(Accordion(accordionName))
        .find(Button({ icon: 'times-circle-solid' }))
        .click(),
    );
  },

  verifyClearFilterButton(accordionName) {
    cy.wait(200);
    cy.expect(
      filterPane
        .find(Accordion(accordionName))
        .find(Button({ icon: 'times-circle-solid' }))
        .exists(),
    );
  },

  verifyClearFilterButtonAbsent(accordionName) {
    cy.expect(
      filterPane
        .find(Accordion(accordionName))
        .find(Button({ icon: 'times-circle-solid' }))
        .absent(),
    );
  },

  resetAllFilters() {
    cy.wait(1000);
    cy.get('button[id="clickable-reset-all"]').then((element) => {
      const disabled = element.attr('disabled');
      if (!disabled) {
        cy.do(resetAllButton.click());
      }
    });
    cy.expect([
      resetAllButton.has({ disabled: true }),
      statusAccordion.find(Checkbox('Active')).has({ checked: true }),
      statusAccordion.find(clearFilterButton).exists(),
    ]);
    cy.wait(2000);
  },

  verifyResetAllButtonEnabled() {
    cy.expect(resetAllButton.has({ disabled: false }));
  },

  verifyResetAllButtonDisabled() {
    cy.expect(resetAllButton.has({ disabled: true }));
  },

  selectList(listName) {
    cy.contains(listName).click();
  },

  verifyListIsSaved(listName) {
    cy.contains(`List ${listName} saved.`);
  },

  viewUpdatedList() {
    cy.wait(1000);
    cy.contains('View updated list', { timeout: 30000 }).click();
    cy.wait(1000);
  },

  verifyListsFilteredByStatus: (filters) => {
    const cells = [];
    cy.get('div[class^="mclRowContainer--"]')
      .find('[data-row-index]')
      .each(($row) => {
        cy.get('[class*="mclCell-"]:nth-child(4)', { withinSubject: $row })
          .invoke('text')
          .then((cellValue) => {
            cells.push(cellValue);
          });
      })
      .then(() => {
        cy.expect(ArrayUtils.compareArrays(cells, filters)).to.equal(true);
      });
  },

  verifyListsFilteredByRecordType: (filter) => {
    cy.wait(500);
    cy.get('div[class^="mclRowContainer--"]')
      .find('[data-row-index]')
      .each(($row) => {
        cy.get('[class*="mclCell-"]:nth-child(2)', { withinSubject: $row })
          .invoke('text')
          .then((cellValue) => {
            cy.expect(cellValue).to.equal(filter);
          });
      });
  },

  verifyListsFilteredByVisibility: (filters) => {
    const cells = [];
    cy.get('div[class^="mclRowContainer--"]')
      .find('[data-row-index]')
      .each(($row) => {
        cy.get('[class*="mclCell-"]:nth-child(7)', { withinSubject: $row })
          .invoke('text')
          .then((cellValue) => {
            cells.push(cellValue);
          });
      })
      .then(() => {
        cells.forEach((cell) => {
          cy.expect(cell).to.be.oneOf(filters);
        });
      });
  },

  checkDownloadedFile(fileName, header = '"Fee/fine owner","Fee/fine type"') {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}.csv`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      expect(fileRows[0].trim()).to.equal(header);
    });
  },

  deleteDownloadedFile(fileName) {
    const filePath = `cypress\\downloads\\${fileName}.csv`;
    cy.exec(`del "${filePath}"`, { failOnNonZeroExit: false });
  },

  buildQueryOnActiveUsers() {
    return this.getTypesViaApi().then((response) => {
      const filteredEntityTypeId = response.body.entityTypes.find(
        (entityType) => entityType.label === 'Users',
      ).id;
      return {
        query: {
          entityTypeId: filteredEntityTypeId,
          fqlQuery: '{"users.active":{"$eq":"true"},"_version":"3"}',
        },
        fields: ['users.active', 'user.id'],
      };
    });
  },

  buildQueryOnActiveUsersWithUsernames() {
    return this.getTypesViaApi().then((response) => {
      const filteredEntityTypeId = response.body.entityTypes.find(
        (entityType) => entityType.label === 'Users',
      ).id;
      return {
        query: {
          entityTypeId: filteredEntityTypeId,
          fqlQuery:
            '{"$and":[{"users.active":{"$eq":"true"}},{"users.username":{"$empty":false}}],"_version":"3"}',
        },
        fields: ['users.active', 'users.id', 'users.username'],
      };
    });
  },

  createQueryViaApi(query) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'query',
        body: query,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return {
          queryId: response.body.queryId,
          fqlQuery: query.fqlQuery,
        };
      });
  },

  createViaApi(list) {
    const newList = JSON.parse(JSON.stringify(list));
    return this.getTypesViaApi().then((response) => {
      newList.entityTypeId = response.body.entityTypes.find(
        (entityType) => entityType.label === newList.recordType,
      ).id;
      delete newList.recordType;
      cy.okapiRequest({
        method: 'POST',
        path: 'lists',
        body: newList,
        isDefaultSearchParamsRequired: false,
      }).then((newListResponse) => {
        return newListResponse.body;
      });
    });
  },

  getViaApi() {
    return cy.okapiRequest({
      method: 'GET',
      path: 'lists',
    });
  },

  getTypesViaApi() {
    return cy.okapiRequest({
      method: 'GET',
      path: 'entity-types',
    });
  },

  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `lists/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  // Use only with USER token, not ADMIN token!!! Admin doesn't have access to lists of other users
  deleteListByNameViaApi(listName) {
    this.getViaApi().then((response) => {
      const filteredItem = response.body.content.find((item) => item.name === listName);
      this.deleteViaApi(filteredItem.id);
    });
  },
};
