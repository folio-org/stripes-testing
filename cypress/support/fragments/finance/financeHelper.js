import { Button, Checkbox, MultiColumnListRow, Link, SearchField, PaneContent } from '../../../../interactors';

const searchField = SearchField({ id: 'input-record-search' });
const noResultsMessageLabel = '//span[contains(@class,"noResultsMessageLabel")]';
const chooseAFilterMessage = 'Choose a filter or enter a search query to show results.';
const fiscalResultsList = PaneContent({ id : 'fiscal-year-results-pane-content' });
const ledgerResultList = PaneContent({ id:'ledger-results-pane-content' });
const FundResultList = PaneContent({ id:'fund-results-pane-content' });
const FiscalYearResultList = PaneContent({ id:'fiscal-year-results-pane-content' });

export default {

  statusActive : 'Active',
  statusFrozen : 'Frozen',
  statusInactive : 'Inactive',

  searchByName : (name) => {
    cy.do([
      searchField.selectIndex('Name'),
      searchField.fillIn(name),
      Button('Search').click(),
    ]);
    cy.wait(4000);
  },

  searchByCode : (code) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('Code'),
      SearchField({ id: 'input-record-search' }).fillIn(code),
      Button('Search').click(),
    ]);
  },

  searchByExternalAccount : (externalAccount) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('External account number'),
      SearchField({ id: 'input-record-search' }).fillIn(externalAccount),
      Button('Search').click(),
    ]);
  },

  searchByAll : (searchValue) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).fillIn(searchValue),
      Button('Search').click(),
    ]);
  },

  selectFromResultsList: (rowNumber = 0) => {
    cy.do(MultiColumnListRow({ index: rowNumber }).click());
  },

  selectCheckboxFromResultsList: (rowNumber = 0) => {
    cy.do(MultiColumnListRow({ index: rowNumber }).find(Checkbox()).click());
  },
  selectFirstFinance: (name) => {
    cy.do(fiscalResultsList.find((Link(name))).click());
  },
  selectFirstLedger: (name) => {
    cy.do(ledgerResultList.find((Link(name))).click());
  },
  selectFirstFundRecord: (name) => {
    cy.do(FundResultList.find((Link(name))).click());
  },
  selectFirstFiscalRecord: (name) => {
    cy.do(FiscalYearResultList.find((Link(name))).click());
  },

  checkZeroSearchResultsMessage : () => {
    cy.xpath(noResultsMessageLabel)
      .should('be.visible')
      .and('have.text', chooseAFilterMessage);
  },

  clickOnCloseIconButton: () => {
    cy.do(Button({ icon: 'times' }).click());
  },

  getRandomBarcode: () => {
    return (Math.floor(100000 + Math.random() * 900000)).toString();
  },

  getRandomOrderNumber: () => {
    return (Math.floor(10000 + Math.random() * 90000)).toString();
  },

  getRandomPreffixSuffix: () => {
    return (Math.floor(100 + Math.random() * 900)).toString();
  },

  getRandomInvoiceNumber: () => {
    return (Math.floor(100000000 + Math.random() * 900000)).toString();
  }
};
