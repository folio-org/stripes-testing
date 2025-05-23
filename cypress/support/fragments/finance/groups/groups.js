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
  Checkbox,
  MultiColumnListHeader,
  SelectionOption,
  Link,
  SearchField,
  including,
  HTML,
} from '../../../../../interactors';
import GroupDetails from './groupDetails';
import FinanceDetails from '../financeDetails';

const newButton = Button('New');
const nameField = TextField('Name*');
const codeField = TextField('Code*');
const fundModal = Modal('Select funds');
const resetButton = Button({ id: 'reset-groups-filters' });
const searchField = SearchField({ id: 'input-record-search' });
const searchButton = Button('Search');
const summarySection = Section({ id: 'financial-summary' });

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
};
