import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';
import {
  Button,
  Accordion,
  TextField,
  Section,
  KeyValue,
  Modal,
  MultiColumnList,
  MultiColumnListRow,
  MultiColumnListCell,
  Pane,
  PaneHeader,
  Checkbox,
  MultiColumnListHeader,
  SelectionOption,
  Link,
  SearchField,
  including,
  matching,
  or,
  HTML,
} from '../../../../../interactors';
import GroupDetails from './groupDetails';
import FinanceDetails from '../financeDetails';

const newButton = Button('New');
const nameField = TextField('Name*');
const codeField = TextField('Code*');
const fundModal = Modal('Select funds');
const prevPageButton = Button({ dataTestID: 'prev-page-button', disabled: or(true, false) });
const nextPageButton = Button({ dataTestID: 'next-page-button', disabled: or(true, false) });
const resetButton = Button({ id: 'reset-groups-filters' });
const searchField = SearchField({ id: 'input-record-search' });
const searchButton = Button('Search');
const summarySection = Section({ id: 'financial-summary' });
const fundResultsList = MultiColumnList({ id: 'list-plugin-find-records' });
const fundResultsSelectAllCheckbox = fundResultsList
  .find(MultiColumnListHeader({ id: 'list-column-ischecked' }))
  .find(Checkbox());
const ledgerAccordionToggle = Button({ id: 'accordion-toggle-button-ledgerId' });
const ledgerSelection = Button({ id: 'ledgerId-selection' });
const statusAccordionToggle = Button({ id: 'accordion-toggle-button-fundStatus' });
const fundSection = Section({ id: 'fund' });

export default {
  defaultUiGroup: {
    name: `autotest_group_1_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    status: 'Active',
  },
  getDefaultGroup() {
    return {
      id: uuid(),
      name: `autotest_group_${getRandomPostfix()}`,
      code: getRandomPostfix(),
      status: 'Active',
    };
  },
  createViaApi: (groupProperties) => {
    return cy
      .okapiRequest({
        path: 'finance/groups',
        body: groupProperties,
        method: 'POST',
      })
      .then((response) => {
        return response.body;
      });
  },

  createDefaultGroup(defaultGroup) {
    cy.wait(2000);
    cy.do([
      Button('Actions').click(),
      newButton.click(),
      nameField.fillIn(defaultGroup.name),
      codeField.fillIn(defaultGroup.code),
      Button('Save & close').click(),
    ]);
    this.waitForGroupDetailsLoading();
  },

  createDefaultGroupAndCaptureId(defaultGroup) {
    cy.intercept('POST', '**/finance/groups*').as('createGroupRequest');

    this.createDefaultGroup(defaultGroup);

    return cy.wait('@createGroupRequest').then((interception) => {
      defaultGroup.id = interception.response.body.id;
      return defaultGroup;
    });
  },

  waitForGroupDetailsLoading: () => {
    cy.do(Section({ id: 'pane-group-details' }).visible);
  },

  deleteGroupViaActions() {
    cy.do([
      Section({ id: 'pane-group-details' }).find(Button('Actions')).click(),
      Button('Delete').click(),
      Button('Delete', { id: 'clickable-group-remove-confirmation-confirm' }).click(),
    ]);
  },

  openSelectFundsModal() {
    cy.do(fundSection.find(Button('Add to group')).click());
    cy.expect(fundModal.exists());
    cy.wait(2000);
  },

  addLedgerToGroup: (ledgerName) => {
    cy.do([
      Section({ id: 'fund' }).find(Button('Add to group')).click(),
      fundModal.find(Button({ id: 'accordion-toggle-button-ledgerId' })).click(),
      fundModal.find(Button({ id: 'ledgerId-selection' })).click(),
      SelectionOption(ledgerName).click(),
    ]);
    cy.wait(4000);
    cy.do([
      MultiColumnList({ id: 'list-plugin-find-records' })
        .find(MultiColumnListHeader({ id: 'list-column-ischecked' }))
        .find(Checkbox())
        .click(),
      fundModal.find(Button('Save')).click(),
    ]);
  },

  addFundToGroup: (fundName) => {
    cy.wait(4000);
    cy.do([
      Section({ id: 'fund' }).find(Button('Add to group')).click(),
      fundModal.find(SearchField({ id: 'input-record-search' })).fillIn(fundName),
      fundModal.find(Button({ type: 'submit' })).click(),
    ]);
    cy.wait(4000);
    cy.do([
      MultiColumnList({ id: 'list-plugin-find-records' })
        .find(MultiColumnListHeader({ id: 'list-column-ischecked' }))
        .find(Checkbox())
        .click(),
      fundModal.find(Button('Save')).click(),
    ]);
  },

  checkAddingMultiplyFunds: (secondFundName, firstFundName) => {
    cy.expect([
      Accordion({ id: 'fund' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: secondFundName }),
      Accordion({ id: 'fund' })
        .find(MultiColumnListRow({ index: 1 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: firstFundName }),
    ]);
  },

  removeFundFromGroup: (fundName) => {
    cy.do(
      Accordion({ id: 'fund' })
        .find(MultiColumnListRow({ content: including(fundName), isContainer: true }))
        .find(Button({ id: 'remove-item-button' }))
        .click(),
    );
  },

  verifyFundsCount: (count) => {
    cy.expect(Accordion({ id: 'fund' }).find(MultiColumnList()).has({ rowCount: count }));
  },

  waitLoading: () => {
    cy.expect(Pane({ id: 'group-results-pane' }).exists());
  },

  tryToCreateGroupWithoutMandatoryFields(groupName) {
    cy.do([
      Button('Actions').click(),
      newButton.click(),
      nameField.fillIn(groupName),
      Button('Save & close').click(),
    ]);
    cy.expect(codeField.has({ error: 'Required!' }));
    cy.do([
      // try to navigate without saving
      Button('Agreements').click(),
      Button('Keep editing').click(),
      Button('Cancel').click(),
      Button('Close without saving').click(),
    ]);
  },

  checkSearchResults: (groupName) => {
    cy.expect(
      MultiColumnList({ id: 'groups-list' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: groupName }),
    );
  },

  resetFilters: () => {
    cy.do(resetButton.click());
    cy.expect(resetButton.is({ disabled: true }));
  },

  openAcquisitionAccordion() {
    cy.do(Button({ id: 'accordion-toggle-button-acqUnitIds' }).click());
  },

  selectNoAcquisitionUnit() {
    cy.do([
      Button({ id: 'acqUnitIds-selection' }).click(),
      SelectionOption('No acquisition unit').click(),
    ]);
  },

  selectActiveStatus() {
    cy.do([Button({ text: 'Status' }).click(), Checkbox({ name: 'Active' }).click()]);
  },

  checkCreatedGroup: (defaultGroup) => {
    cy.expect(
      Accordion({ id: 'information' })
        .find(KeyValue({ value: defaultGroup.name }))
        .exists(),
    );
  },

  checkFYInGroup: (fiscalYear) => {
    cy.expect(
      Accordion({ id: 'information' })
        .find(KeyValue({ value: fiscalYear }))
        .exists(),
    );
  },

  deleteGroupViaApi: (groupId) => cy.okapiRequest({
    method: 'DELETE',
    path: `finance/groups/${groupId}`,
    isDefaultSearchParamsRequired: false,
  }),

  selectGroup: (GroupName) => {
    cy.wait(4000);
    cy.do(Section({ id: 'group-results-pane' }).find(Link(GroupName)).click());
  },

  checkCreatedInList: (GroupName) => {
    cy.expect(Section({ id: 'group-results-pane' }).find(Link(GroupName)).exists());
  },

  searchByName: (name) => {
    cy.do([searchField.selectIndex('Name'), searchField.fillIn(name), searchButton.click()]);
  },

  selectGroupByName: (GroupName) => {
    cy.do(Section({ id: 'group-results-pane' }).find(Link(GroupName)).click());
    GroupDetails.waitLoading();

    return GroupDetails;
  },
  checkFinancialSummary({ summary = [], information = [], balance = {} } = {}) {
    summary.forEach(({ key, value }) => {
      cy.expect(
        summarySection
          .find(MultiColumnListRow({ isContainer: true, content: including(key) }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(value) }),
      );
    });
    if (information.length) {
      FinanceDetails.checkInformation(information);
    }

    if (balance.cash) {
      this.checkBalance({ name: 'Cash', value: balance.cash });
    }
    if (balance.available) {
      this.checkBalance({ name: 'Available', value: balance.available });
    }
  },
  checkBalance({ name, value }) {
    cy.expect(summarySection.find(HTML(including(`${name} balance: ${value}`))).exists());
  },

  checkZeroSearchResultsHeader() {
    cy.xpath('//*[@id="paneHeadergroup-results-pane-subtitle"]/span').should(
      'have.text',
      '0 records found',
    );
  },

  createGroupWithAcquisitionUnit(group, acquisitionUnitName) {
    cy.wait(2000);
    cy.do([
      Button('Actions').click(),
      Button('New').click(),
      nameField.fillIn(group.name),
      codeField.fillIn(group.code),
    ]);
    cy.wait(2000);
    cy.get('[id*="downshift"][id*="toggle-button"]').click();
    cy.wait(500);
    cy.contains('[id*="downshift"][id*="item"]', acquisitionUnitName).click();
    cy.wait(1000);
    cy.do(Button('Save & close').click());
    cy.wait(2000);
    this.waitForGroupDetailsLoading();
  },

  createGroupWithAcquisitionUnitAndCaptureId(group, acquisitionUnitName) {
    cy.intercept('POST', '**/finance/groups*').as('createGroupRequest');

    this.createGroupWithAcquisitionUnit(group, acquisitionUnitName);

    return cy.wait('@createGroupRequest').then((interception) => {
      group.id = interception.response.body.id;
      return group;
    });
  },

  checkPageTitle(expectedTitle) {
    cy.title().should('eq', expectedTitle);
  },

  closeDetailsPane() {
    cy.do(
      PaneHeader({ id: 'paneHeaderpane-group-details' })
        .find(Button({ icon: 'times' }))
        .click(),
    );
  },

  clickResetAll() {
    cy.do(resetButton.click());
  },

  verifySearchFieldIsEmpty() {
    cy.expect(searchField.has({ value: '' }));
  },

  filterByStatus(statusName) {
    cy.do([Button({ text: 'Status' }).click(), Checkbox({ name: statusName }).click()]);
  },

  filterByLedgerInModal(ledgerName) {
    cy.do([
      fundModal.find(ledgerAccordionToggle).click(),
      fundModal.find(ledgerSelection).click(),
      SelectionOption(ledgerName).click(),
    ]);
    cy.wait(4000);
  },

  filterByStatusInModal(statusName) {
    cy.get('#accordion-toggle-button-fundStatus').then(($btn) => {
      const isExpanded = $btn.attr('aria-expanded') === 'true';
      if (!isExpanded) {
        cy.do(fundModal.find(statusAccordionToggle).click());
      }
    });
    cy.do(
      fundModal
        .find(Checkbox({ id: `clickable-filter-fundStatus-${statusName.toLowerCase()}` }))
        .click(),
    );
    cy.wait(4000);
  },

  verifyTotalSelectedInModal(count) {
    cy.get('[data-test-find-records-modal-save="true"]')
      .siblings('div')
      .should(($div) => {
        expect($div).to.have.length(1);
        expect($div.text().trim()).to.eq(`Total selected: ${count}`);
      });
  },

  verifyPreviousButtonInModal(enabled) {
    cy.expect(fundModal.find(prevPageButton).has({ disabled: !enabled }));
  },

  verifyNextButtonInModal(enabled) {
    cy.expect(fundModal.find(nextPageButton).has({ disabled: !enabled }));
  },

  clickNextButtonInModal() {
    cy.do(fundModal.find(nextPageButton).click());
    cy.wait(2000);
  },

  clickPreviousButtonInModal() {
    cy.do(fundModal.find(prevPageButton).click());
    cy.wait(2000);
  },

  selectAllFundsOnPage() {
    cy.do(fundModal.find(fundResultsSelectAllCheckbox).click());
  },

  verifySelectAllCheckboxInModal(checked) {
    cy.expect(fundModal.find(fundResultsSelectAllCheckbox).has({ checked }));
  },

  selectFundInModalByIndex(rowIndex) {
    cy.do(
      fundResultsList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(Checkbox())
        .click(),
    );
  },

  verifyFundsCountInModal(count) {
    cy.expect(fundResultsList.has({ rowCount: count }));
  },

  verifyRecordsFoundTextInModal() {
    cy.expect(fundModal.find(PaneHeader({ subtitle: matching(/\d+ records? found/) })).exists());
  },

  verifyPaginationIndicatorInModal() {
    cy.expect(fundModal.find(prevPageButton).exists());
  },

  clickSaveInModal() {
    cy.do(fundModal.find(Button('Save')).click());
    cy.wait(2000);
  },
};
