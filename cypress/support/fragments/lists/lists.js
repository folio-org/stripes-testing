import { recurse } from 'cypress-recurse';
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
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiSelect,
  not,
  Pane,
  RadioButton,
  TextArea,
  TextField,
} from '../../../../interactors';
import ArrayUtils from '../../utils/arrays';

const listInformationAccording = Accordion('List information');
const queryAccordion = Accordion({ id: 'results-viewer-accordion' });
const listNameTextField = TextField({ name: 'listName' });
const listDescriptionTextArea = TextArea({ name: 'description' });
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
const deleteButton = Button('Delete');
const cancelRefresh = Button('Cancel refresh');
const buildQueryButton = Button('Build query');
const closeWithoutSavingButton = Button('Close without saving');
const keepEditingButton = Button('Keep editing');
const actions = Button('Actions');
const refreshList = Button('Refresh list');
const cancelRefreshList = Button('Cancel refresh');
const editList = Button('Edit list');
const duplicateList = Button('Duplicate list');
const deleteList = Button('Delete list');
const exportList = Button('Export all columns (CSV)');
const exportListVisibleColumns = Button('Export selected columns (CSV)');
const testQuery = Button('Test query');
const runQueryAndSave = Button('Run query & save');
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

const deleteConfirmationModal = Modal('Delete list');
const cancelConfirmationModal = Modal('Are you sure?');
const buildQueryModal = Modal('Build query');

const cancelQueryButton = buildQueryModal.find(Button('Cancel'));

const constants = {
  cannedListInactivePatronsWithOpenLoans: 'Inactive patrons with open loans',
};

const UI = {
  waitLoading: () => {
    cy.expect(HTML(including('Lists')).exists());
    cy.wait(2000);
  },

  filtersWaitLoading: () => {
    cy.expect(activeCheckbox.exists());
    cy.expect(inactiveCheckbox.exists());
    cy.expect(sharedCheckbox.exists());
    cy.expect(privateCheckbox.exists());
  },

  waitForSpinnerToDisappear() {
    cy.get('[class^="spinner"]').should('not.exist');
  },

  waitForCompilingToComplete(delay = 1500) {
    cy.wait(delay);
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

  clickOnListInformationAccordion() {
    cy.do(listInformationAccording.click());
    cy.wait(500);
  },

  expandListInformationAccordion() {
    cy.do(listInformationAccording.open());
    cy.wait(1000);
  },

  clickOnQueryAccordion() {
    cy.do(queryAccordion.click());
    cy.wait(500);
  },

  expandQueryAccordion() {
    cy.do(queryAccordion.open());
    cy.wait(500);
  },

  collapseQueryAccordion() {
    cy.do(queryAccordion.close());
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
    cy.wait(2000);
  },

  cancelRefreshList() {
    cy.do(cancelRefreshList.click());
    cy.wait(1000);
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

  closeQueryEditor() {
    cy.wait(500);
    cy.do(cancelQueryButton.click());
    cy.wait(1000);
  },

  cancelRefresh() {
    cy.do(cancelRefresh.click());
    cy.wait(1000);
  },

  saveList() {
    cy.do(saveButton.click());
    cy.wait(1500);
  },

  buildQuery() {
    cy.do(buildQueryButton.click());
    cy.wait(1000);
  },

  verifyBuildQueryButtonIsDisabled() {
    cy.expect(buildQueryButton.has({ disabled: true }));
  },

  editList() {
    cy.do(editList.click());
    cy.wait(2000);
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

  confirmDelete() {
    cy.wait(1000);
    cy.do(deleteConfirmationModal.find(deleteButton).click());
    cy.wait(2000);
  },

  cancelDelete() {
    cy.wait(1000);
    cy.do(deleteConfirmationModal.find(cancelButton).click());
    cy.wait(1000);
  },

  exportList() {
    cy.do(exportList.click());
    cy.wait(1000);
  },

  exportListVisibleColumns() {
    cy.do(exportListVisibleColumns.click());
    cy.wait(1000);
  },

  verifyExportListVisibleColumnsButtonIsActive() {
    cy.expect(exportListVisibleColumns.exists());
    cy.expect(exportListVisibleColumns.has({ disabled: false }));
  },

  verifyExportListVisibleColumnsButtonIsDisabled() {
    cy.expect(exportListVisibleColumns.has({ disabled: true }));
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
    cy.wait(500);
    cy.do(cancelButton.click());
    cy.wait(500);
  },

  verifyCancelButtonIsActive() {
    cy.expect(cancelButton.exists());
    cy.expect(cancelButton.has({ disabled: false }));
  },

  verifySaveButtonIsActive() {
    cy.expect(saveButton.exists());
    cy.expect(saveButton.has({ disabled: false }));
  },

  verifySaveButtonIsDisabled() {
    cy.expect(saveButton.has({ disabled: true }));
  },

  verifyCancellationModal() {
    cy.expect(cancelConfirmationModal.exists());
    cy.expect(cancelConfirmationModal.find(HTML('There are unsaved changes')).exists());
    cy.expect(cancelConfirmationModal.find(Button('Close without saving')).exists());
    cy.expect(cancelConfirmationModal.find(Button('Keep editing')).exists());
  },

  closeWithoutSaving() {
    cy.wait(500);
    cy.do(cancelConfirmationModal.find(closeWithoutSavingButton).click());
    cy.wait(1000);
  },

  keepEditing() {
    cy.wait(500);
    cy.do(cancelConfirmationModal.find(keepEditingButton).click());
    cy.wait(1000);
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

  openExpiredPatronLoanList() {
    cy.do(Link(constants.cannedListInactivePatronsWithOpenLoans).click());
  },

  openMissingItemsList() {
    cy.do(Link('Missing items').click());
  },

  setName(value) {
    cy.do(listNameTextField.fillIn(value));
    cy.wait(500);
  },

  clearName() {
    cy.do(listNameTextField.clear());
    cy.wait(500);
  },

  verifyListName(value) {
    cy.expect(listNameTextField.has({ value }));
  },

  verifyEmptyListNameErrorMessage() {
    cy.contains('Please fill this in to continue').should('be.visible');
  },

  setDescription(value) {
    cy.do(listDescriptionTextArea.fillIn(value));
    cy.wait(500);
  },

  verifyListDescription(value) {
    cy.expect(listDescriptionTextArea.has({ value }));
  },

  selectRecordTypeOld(option) {
    cy.get('select[name=recordType]').select(option);
    cy.wait(500);
  },

  verifyRecordTypes(options) {
    const optionsFromUI = [];
    cy.get('button[name=recordType]')
      .click()
      .then(() => {
        cy.wait(500);
        cy.get('li[role=option]')
          .each((element) => {
            optionsFromUI.push(element.text());
          })
          .then(() => {
            cy.expect(ArrayUtils.arrayContainsArray(optionsFromUI, options)).to.equal(true);
          });
      });
    cy.get('button[name=recordType]').click();
    cy.wait(500);
  },

  selectRecordType(option) {
    cy.get('button[name=recordType]')
      .click()
      .then(() => {
        cy.wait(500);
        cy.get('li[role=option]').contains(option).click();
        cy.wait(500);
      });
    cy.wait(500);
  },

  checkKeyValue(label, value) {
    cy.expect(KeyValue(label, { value }).exists());
  },

  verifyListNameLabel(value) {
    this.checkKeyValue('List name', value);
  },

  verifyListDescriptionLabel(value) {
    this.checkKeyValue('Description', value);
  },

  verifyVisibilityLabel(value) {
    this.checkKeyValue('Visibility', value);
  },

  verifyRecordType(recordType) {
    this.checkKeyValue('Record type', recordType);
  },

  verifyStatusLabel(value) {
    this.checkKeyValue('Status', value);
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
    cy.wait(500);
    cy.expect(Callout({ type: calloutTypes.success }).is({ textContent: message }));
  },

  verifyCalloutMessage(message) {
    cy.expect(Callout(including(message)).exists());
  },

  closeListDetailsPane() {
    cy.wait(500);
    cy.get('div[class^=paneMenu] > button[icon=times]').click();
    cy.wait(1000);
  },

  verifyListIsNotPresent(listName) {
    cy.get('#OverlayContainer').contains(listName).should('not.exist');
  },

  verifyListIsPresent(listName) {
    return cy.get('*[class^="mclRowContainer"]').contains(listName).should('be.visible');
  },

  verifyRecordsNumber(number) {
    cy.get('[class^=paneHeader-]').contains(`${number} records found`).should('be.visible');
    cy.get('#results-viewer-accordion').contains(`${number} records found`).should('be.visible');
  },

  verifyQuery(query) {
    cy.get('#results-viewer-accordion').contains(`Query: (${query})`).should('be.visible');
  },

  openList(listName) {
    cy.do(
      ListRow(including(listName))
        .find(MultiColumnListCell({ content: listName }))
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
    cy.wrap(true)
      .then(() => {
        if (searchResults.description) {
          delete searchResults.description;
        }
      })
      .then(() => {
        cy.wrap(Object.values(searchResults)).each((contentToCheck) => {
          cy.expect(
            MultiColumnListRow({ indexRow: `row-${rowIndex}` })
              .find(MultiColumnListCell({ content: including(contentToCheck) }))
              .exists(),
          );
        });
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

  collapseFilterPane() {
    cy.get('button[icon=caret-left]').click();
    cy.wait(1000);
  },

  expandFilterPane() {
    cy.get('button[icon=caret-right]').click();
    cy.wait(1000);
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
    cy.wait(500);
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
    cy.wait(1000);
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

  verifyYouDoNotHavePermissionsToViewThisListIsShown() {
    cy.wait(1000);
    cy.contains('You do not have permission to view this list', { timeout: 15000 }).should(
      'be.visible',
    );
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

      expect(fileRows[0].trim()).to.contain(header);
    });
  },

  deleteDownloadedFile(fileName) {
    const filePath = `cypress\\downloads\\${fileName}.csv`;
    cy.exec(`del "${filePath}"`, { failOnNonZeroExit: false });
  },
};

const QueryBuilder = {
  queryBuilderActions() {
    this.queryBuilderActionsWithParameters('User — Active', '==', 'True');
  },

  queryBuilderActionsWithParameters(parameter, operator, value) {
    cy.get('#field-option-0').click();
    cy.contains(parameter).click();
    cy.get('[data-testid="operator-option-0"]').select(operator);
    cy.get('[data-testid="data-input-select-boolType"]').select(value);
    cy.do(testQuery.click());
    cy.wait(2000);
    cy.do(runQueryAndSave.click());
    cy.wait(2000);
  },

  testQuery() {
    cy.do(testQuery.click());
    cy.wait(1000);
  },

  runQueryAndSave() {
    cy.do(runQueryAndSave.click());
    cy.wait(2000);
  },

  changeQueryBoolValue(value) {
    let valueToSet = 'False';
    if (value) {
      valueToSet = 'True';
    }
    cy.get('[data-testid="data-input-select-boolType"]').select(valueToSet);
  },

  verifyQueryHeader(header) {
    cy.get('[class^="mclContainer"] [class^="mclScrollable"]').scrollTo('right', {
      ensureScrollable: false,
    });
    // cy.xpath(`//div[contains(@id, 'list-column-pol') and contains(., '${header}')]`).scrollIntoView();
    cy.expect(MultiColumnListHeader(header).exists());
  },

  verifyQueryValue(value, condition, locator) {
    let columnNumber = 0;
    cy.wrap(true)
      .then(() => {
        if (locator) {
          cy.log(`Locator is: ${locator}`);
          cy.xpath(`count(//div[@id="${locator}"]/preceding-sibling::div)`).then(($index) => {
            columnNumber = $index;
          });
          cy.log(`Column number is: ${columnNumber}`);
        }
      })
      .then(() => {
        cy.get('div[class^="mclRowContainer--"]')
          .find('[data-row-index]')
          .each(($el, index) => {
            switch (condition) {
              case 'equals':
                if (locator) {
                  cy.log(`Index is: ${index}, column number is: ${columnNumber}`);
                  cy.expect(
                    MultiColumnListCell({
                      row: index,
                      columnIndex: columnNumber,
                      content: value,
                    }).exists(),
                  );
                } else {
                  cy.expect(MultiColumnListCell({ row: index, content: value }).exists());
                }
                break;
              case 'contains':
                if (locator) {
                  cy.expect(
                    MultiColumnListCell({
                      row: index,
                      columnIndex: columnNumber,
                      content: including(value),
                    }).exists(),
                  );
                } else {
                  cy.expect(
                    MultiColumnListCell({ row: index, content: including(value) }).exists(),
                  );
                }
                break;
              case 'not in':
                if (locator) {
                  cy.expect(
                    MultiColumnListCell({
                      row: index,
                      columnIndex: columnNumber,
                      content: not(including(value)),
                    }).exists(),
                  );
                } else {
                  cy.expect(
                    MultiColumnListCell({ row: index, content: not(including(value)) }).exists(),
                  );
                }
                break;
              case 'is null/empty':
                if (locator) {
                  cy.expect(
                    MultiColumnListCell({
                      row: index,
                      columnIndex: columnNumber,
                      content: '',
                    }).exists(),
                  );
                } else {
                  cy.expect(MultiColumnListCell({ row: index, content: '' }).exists());
                }
                break;
              default:
                // cy.log('not implemented yet');
                break;
            }
          });
      });
  },

  verifyPreviewOfRecordsMatched() {
    cy.xpath('.//h3[starts-with(., "Query would return")]').then(($element) => {
      const text = $element.text();
      const [totalRecords, previewRecords] = text.match(/\d+/g).map(Number);
      const previewLabel = `Preview of first ${Math.min(previewRecords, 100)} records.`;
      expect(text.startsWith(`Query returns ${totalRecords} records.`)).to.equal(true);
      expect(previewLabel).to.equal(`Preview of first ${Math.min(previewRecords, 100)} records.`);
    });
  },

  getNumberOfRows() {
    const searchTerm = 'Query returns ';
    cy.contains(searchTerm).should('be.visible');
    return cy.xpath(`.//h3[starts-with(., "${searchTerm}")]`).then(($element) => {
      cy.wrap(true).then(() => {
        const text = $element.text().replace(`${searchTerm}`, '').replace(' records', '');
        const parsedText = text.replace(text.substr(text.indexOf('.')), '');
        return parsedText;
      });
    });
  },
};

const API = {
  buildQueryOnActiveUsers() {
    return this.getTypesViaApi().then((response) => {
      const filteredEntityTypeId = response.body.entityTypes.find(
        (entityType) => entityType.label === 'Users',
      ).id;
      return {
        query: {
          entityTypeId: filteredEntityTypeId,
          fqlQuery: '{"users.active":{"$eq":"true"}}',
        },
        fields: ['users.active', 'user.id'],
        uiQuery: 'users.active == True',
      };
    });
  },

  buildQueryOnActiveUsersWithZeroRecords() {
    return this.getTypesViaApi().then((response) => {
      const filteredEntityTypeId = response.body.entityTypes.find(
        (entityType) => entityType.label === 'Users',
      ).id;
      return {
        query: {
          entityTypeId: filteredEntityTypeId,
          fqlQuery: '{"users.id":{"$eq":"1234567890"}}',
        },
        fields: ['users.active', 'user.id'],
        uiQuery: 'users.id == 1234567890',
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
            '{"$and":[{"users.active":{"$eq":"true"}},{"users.username":{"$empty":false}}]}',
        },
        fields: ['users.active', 'users.id', 'users.username'],
      };
    });
  },

  // supposed to contain big amount of data (on cypress env it approximately contains 6000+ records)
  buildQueryOnAllInstances() {
    return this.getTypesViaApi().then((response) => {
      const filteredEntityTypeId = response.body.entityTypes.find(
        (entityType) => entityType.label === 'Instances',
      ).id;
      return {
        query: {
          entityTypeId: filteredEntityTypeId,
          fqlQuery: '{"instance.source":{"$ne":"LINKED_DATA"}}',
        },
        fields: [
          'instance.hrid',
          'instance.title',
          'instance.instance_type_name',
          'instance.source',
        ],
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

  getQueryViaApi(queryId, searchParameters) {
    return cy.okapiRequest({
      method: 'GET',
      path: `query/${queryId}`,
      isDefaultSearchParamsRequired: false,
      searchParams: searchParameters,
      customTimeout: 5000,
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

  getListByIdViaApi(listId) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `lists/${listId}`,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  waitForListToCompleteRefreshViaApi(listId) {
    cy.wait(1000);
    return recurse(
      () => this.getListByIdViaApi(listId),
      (body) => {
        if (body.inProgressRefresh) {
          return false;
        } else if (!body.successRefresh || body.successRefresh.status === 'SUCCESS') {
          return true;
        } else {
          throw new Error('Unknown status of list refresh!');
        }
      },
      {
        limit: 6,
        timeout: 30 * 1000,
        delay: 5000,
      },
    );
  },

  getVersionApi() {
    if (!Cypress.env('LISTS_VERSION_API')) {
      return cy
        .okapiRequest({
          method: 'GET',
          path: 'fqm/version',
          isDefaultSearchParamsRequired: false,
        })
        .then((response) => {
          Cypress.env('LISTS_VERSION_API', response.body);
          return response.body;
        });
    } else {
      return cy.wrap(Cypress.env('LISTS_VERSION_API'));
    }
  },

  getTypesViaApi() {
    return cy.okapiRequest({
      method: 'GET',
      path: 'entity-types',
    });
  },

  getTypeIdByNameViaApi(type) {
    return this.getTypesViaApi().then((response) => {
      return response.body.entityTypes.find((entityType) => entityType.label === type).id;
    });
  },

  getTypeByIdViaApi(id) {
    return cy.okapiRequest({
      method: 'GET',
      path: `entity-types/${id}`,
    });
  },

  getEntityTypeColumnsViaApi(id, labelName) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `entity-types/${id}/columns/${labelName}/values`,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  deleteRecursivelyViaApi(id) {
    recurse(
      () => this.deleteViaApi(id),
      (response) => response.status === 204 || response.body.code === 'delete-list.not.found',
      {
        limit: 3,
        timeout: 30 * 1000,
        delay: 10000,
      },
    );
  },

  editViaApi(id, list) {
    return cy
      .okapiRequest({
        method: 'PUT',
        path: `lists/${id}`,
        body: list,
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: false,
      })
      .then((response) => {
        return response;
      });
  },

  refreshViaApi(id) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: `lists/${id}/refresh`,
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: false,
      })
      .then((response) => {
        return response;
      });
  },

  cancelRefreshViaApi(id) {
    return cy
      .okapiRequest({
        method: 'DELETE',
        path: `lists/${id}/refresh`,
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: false,
      })
      .then((response) => {
        return response;
      });
  },

  // input parameter 'fields' should be an array of field names to export
  // e.g. ['users.active', 'users.id', 'users.username']
  postExportViaApi(id, fields) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: `lists/${id}/exports`,
        body: fields,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response;
      });
  },

  getExportStatusViaApi(listId, exportId) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `lists/${listId}/exports/${exportId}`,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response;
      });
  },

  downloadViaApi(listId, exportId) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `lists/${listId}/exports/${exportId}/download`,
        failOnStatusCode: false,
        isDefaultSearchParamsRequired: false,
        contentTypeHeader: 'application/octet-stream',
        encoding: 'binary',
      })
      .then((getDownloadResponse) => {
        return getDownloadResponse;
      });
  },

  // input parameter 'fields' should be an array of field names to export
  // e.g. ['users.active', 'users.id', 'users.username']
  exportViaApiFullFlow(id, fields) {
    return this.postExportViaApi(id, fields).then((postExportResponse) => {
      recurse(
        () => this.getExportStatusViaApi(id, postExportResponse.body.exportId),
        (response) => response.body.status === 'SUCCESS',
        {
          limit: 10,
          timeout: 10 * 1000,
          delay: 1000,
        },
      );
      return this.getExportStatusViaApi(id, postExportResponse.body.exportId).then(
        (getExportResponse) => {
          return this.downloadViaApi(id, getExportResponse.body.exportId);
        },
      );
    });
  },

  deleteViaApi(id) {
    return cy
      .okapiRequest({
        method: 'DELETE',
        path: `lists/${id}`,
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: false,
      })
      .then((response) => {
        return response;
      });
  },

  // Use only with USER token, not ADMIN token!!! Admin doesn't have access to private lists of other users
  deleteListByNameViaApi(listName, recursively = false) {
    this.getViaApi().then((response) => {
      const filteredItem = response.body.content.find((item) => item.name === listName);
      if (filteredItem) {
        if (recursively) {
          this.deleteRecursivelyViaApi(filteredItem.id);
        } else {
          this.deleteViaApi(filteredItem.id);
        }
      }
    });
  },

  getListIdByNameViaApi(listName) {
    return this.getViaApi().then((response) => {
      return response.body.content.find((item) => item.name === listName).id;
    });
  },
};

export const Lists = {
  ...constants,
  ...QueryBuilder,
  ...UI,
  ...API,
};
