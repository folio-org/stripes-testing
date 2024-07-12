import {
  Accordion,
  Button,
  Callout,
  Checkbox,
  HTML,
  Link,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  RadioButton,
  TextArea,
  TextField,
  calloutTypes,
  including,
} from '../../../../interactors';
import ArrayUtils from '../../utils/arrays';

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
const filterPane = Pane('Filter');
const statusAccordion = filterPane.find(Accordion('Status'));
const visibilityAccordion = filterPane.find(Accordion('Visibility'));
const recordTypesAccordion = filterPane.find(Accordion('Record types'));
const resetAllButton = filterPane.find(Button('Reset all'));
const clearFilterButton = Button({ icon: 'times-circle-solid' });

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

  queryBuilderActions() {
    this.queryBuilderActionsWithParameters('User — Active', '==', 'True');
  },

  queryBuilderActionsWithParameters(parameter, operator, value) {
    cy.get('#field-option-0').click();
    cy.contains(parameter).click();
    cy.get('[data-testid="operator-option-0"]').select(operator);
    cy.get('[data-testid="data-input-select-boolType"]').select(value);
    cy.do(testQuery.click());
    cy.wait(5000);
    cy.do(runQuery.click());
    cy.wait(2000);
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

  selectVisibility(visibility) {
    cy.do(RadioButton(visibility).click());
    this.waitForSpinnerToDisappear();
    cy.wait(500);
  },

  selectStatus(status) {
    cy.do(RadioButton(status).click());
    this.waitForSpinnerToDisappear();
    cy.wait(500);
  },

  verifySuccessCalloutMessage(message) {
    cy.expect(Callout({ type: calloutTypes.info }).is({ textContent: message }));
  },

  verifyCalloutMessage: (message) => {
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

  createViaApi(newList) {
    this.getTypesViaApi().then((response) => {
      newList.entityTypeId = response.body.find(
        (entityType) => entityType.label === newList.recordType,
      ).id;
      delete newList.recordType;
      return cy.okapiRequest({
        method: 'POST',
        path: 'lists',
        body: newList,
        isDefaultSearchParamsRequired: false,
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

  verifyDeleteListButtonIsDisabled() {
    cy.contains('Delete list').should('be.disabled');
  },

  viewUpdatedList() {
    cy.contains('View updated list').click();
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
            cy.log(cellValue);
          });
      })
      .then(() => {
        cy.expect(ArrayUtils.compareArrays(cells, filters)).to.equal(true);
      });
  },

  verifyListsFilteredByRecordType: (filters) => {
    cy.wait(500);
    const cells = [];
    cy.get('div[class^="mclRowContainer--"]')
      .find('[data-row-index]')
      .each(($row) => {
        cy.get('[class*="mclCell-"]:nth-child(2)', { withinSubject: $row })
          .invoke('text')
          .then((cellValue) => {
            cells.push(cellValue);
          });
      })
      .then(() => {
        cy.expect(ArrayUtils.compareArrays(cells, filters)).to.equal(true);
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
        cy.expect(ArrayUtils.compareArrays(cells, filters)).to.equal(true);
      });
  },
};
