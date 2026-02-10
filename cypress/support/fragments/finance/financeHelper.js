import {
  Button,
  Checkbox,
  MultiColumnListRow,
  Link,
  SearchField,
  PaneContent,
  Pane,
  including,
  MultiColumnListCell,
} from '../../../../interactors';
import FundDetails from './funds/fundDetails';
import LedgerDetails from './ledgers/ledgerDetails';

const searchField = SearchField({ id: 'input-record-search' });
const searchButton = Button('Search');
const noResultsMessageLabel = '//span[contains(@class,"noResultsMessageLabel")]';
const chooseAFilterMessage = 'Choose a filter or enter a search query to show results.';
const fiscalResultsList = PaneContent({ id: 'fiscal-year-results-pane-content' });
const ledgerResultList = PaneContent({ id: 'ledger-results-pane-content' });
const FundResultList = PaneContent({ id: 'fund-results-pane-content' });
const filtersPane = Pane({ id: including('filters-pane') });
const fiscalYearButton = Button('Fiscal year');
const ledgerButton = Button('Ledger');
const groupButton = Button('Group');
const fundButton = Button('Fund');
const resetButton = Button('Reset all');

export default {
  statusActive: 'Active',
  statusFrozen: 'Frozen',
  statusInactive: 'Inactive',

  switchSearchType({ type }) {
    cy.do(Button(type).click());
  },
  searchByName: (name) => {
    cy.wait(4000);
    cy.do([searchField.selectIndex('Name'), searchField.fillIn(name), Button('Search').click()]);
    cy.wait(4000);
  },

  searchByCode: (code) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('Code'),
      SearchField({ id: 'input-record-search' }).fillIn(code),
      Button('Search').click(),
    ]);
  },

  searchByExternalAccount: (externalAccount) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('External account number'),
      SearchField({ id: 'input-record-search' }).fillIn(externalAccount),
      Button('Search').click(),
    ]);
  },

  searchByAll: (searchValue) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).fillIn(searchValue),
      Button('Search').click(),
    ]);
  },
  selectFromLookUpView({ itemName }) {
    cy.do([
      searchField.fillIn(itemName),
      searchButton.click(),
      MultiColumnListCell({ content: itemName }).click(),
    ]);
  },
  selectFromResultsList: (rowNumber = 0) => {
    cy.do(MultiColumnListRow({ index: rowNumber }).click());
  },

  selectCheckboxFromResultsList: (rowNumber = 0) => {
    cy.do(MultiColumnListRow({ index: rowNumber }).find(Checkbox()).click());
  },
  selectFirstFinance: (name) => {
    cy.do(fiscalResultsList.find(Link(name)).click());
  },
  selectFirstLedger: (name) => {
    cy.do(ledgerResultList.find(Link(name)).click());
    LedgerDetails.checkLedgerDetails({ information: [{ key: 'Name', value: name }] });

    return LedgerDetails;
  },
  selectFirstFundRecord: (name) => {
    cy.do(FundResultList.find(Link(name)).click());
    FundDetails.checkFundDetails({ information: [{ key: 'Name', value: name }] });

    return FundDetails;
  },
  selectFirstFiscalRecord: (name) => {
    cy.do(fiscalResultsList.find(Link(name)).click());
  },

  checkZeroSearchResultsMessage: () => {
    cy.xpath(noResultsMessageLabel).should('be.visible').and('have.text', chooseAFilterMessage);
  },

  clickOnCloseIconButton: () => {
    cy.do(Button({ icon: 'times' }).click());
  },

  getRandomBarcode: () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  getRandomOrderNumber: () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  },

  getRandomPrefixSuffix: () => {
    return Math.floor(100 + Math.random() * 900).toString();
  },

  getRandomInvoiceNumber: () => {
    return Math.floor(100000000 + Math.random() * 900000).toString();
  },

  clickFiscalYearButton() {
    cy.do(filtersPane.find(fiscalYearButton).click());
  },

  clickLedgerButton() {
    cy.do(filtersPane.find(ledgerButton).click());
  },

  clickGroupButton() {
    cy.do(filtersPane.find(groupButton).click());
  },

  clickFundButton() {
    cy.do(filtersPane.find(fundButton).click());
  },
  selectFiscalYearsNavigation: () => {
    cy.get('[data-test-finance-navigation-fiscalyear="true"]')
      .should('be.visible', { timeout: 10000 })
      .click();
  },

  selectLedgersNavigation: () => {
    cy.get('[data-test-finance-navigation-ledger="true"]')
      .should('be.visible', { timeout: 10000 })
      .click();
  },

  selectGroupsNavigation: () => {
    cy.get('[data-test-finance-navigation-group="true"]').click();
  },

  selectFundsNavigation: () => {
    cy.get('[data-test-finance-navigation-fund="true"]').click();
  },

  resetFilters: () => {
    cy.do(resetButton.click());
    cy.expect(resetButton.is({ disabled: true }));
  },
};
