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
  Pane,
  Checkbox,
} from '../../../../interactors';
import ArrayUtils from '../../utils/arrays';

const closeModal = Modal();
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
const closeWithoutSavingButton = Button('Close without saving');
// const keepEditingButton = Button('Keep editing');
const keepEditingButton = closeModal.find(Button('Keep editing'));
const actions = Button('Actions');
const refreshList = Button('Refresh list');
const filterPane = Pane('Filter');
const statusAccordion = filterPane.find(Accordion('Status'));
const visibilityAccordion = filterPane.find(Accordion('Visibility'));
const recordTypesAccordion = filterPane.find(Accordion('Record types'));
const resetAllButton = filterPane.find(Button('Reset all'));
const clearFilterButton = Button({ icon: 'times-circle-solid' });

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
      recordTypesAccordion.find(Checkbox('Purchase order Lines')).has({ checked: false }),
    ]);
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

  resetAll() {
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
  },

  verifyResetAllButtonEnabled() {
    cy.expect(resetAllButton.has({ disabled: false }));
  },

  verifyResetAllButtonDisabled() {
    cy.expect(resetAllButton.has({ disabled: true }));
  },

  verifyListsFileredByStatus: (filters) => {
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

  verifyListsFileredByRecordType: (filters) => {
    const cells = [];
    cy.get('div[class^="mclRowContainer--"]')
      .find('[data-row-index]')
      .each(($row) => {
        cy.get('[class*="mclCell-"]:nth-child(2)', { withinSubject: $row })
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

  verifyListsFileredByVisiblity: (filters) => {
    const cells = [];
    cy.get('div[class^="mclRowContainer--"]')
      .find('[data-row-index]')
      .each(($row) => {
        cy.get('[class*="mclCell-"]:nth-child(7)', { withinSubject: $row })
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
};
