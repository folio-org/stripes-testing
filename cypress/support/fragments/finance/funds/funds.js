import { Button, TextField, Selection, SelectionList, SearchField, Accordion, Modal } from '../../../../../interactors';

const rootFundDetailsXpath = '//*[@id="pane-fund-details"]';
const createdFundNameXpath = '//*[@id="paneHeaderpane-fund-details-pane-title"]/h2/span';
const numberOfSearchResultsHeader = '//*[@id="paneHeaderfund-results-pane-subtitle"]/span';
const zeroResultsFoundText = '0 records found';
const budgetTitleXpath = '//*[@id="paneHeaderpane-budget-pane-title"]/h2/span';

export default {
  waitForFundDetailsLoading : () => {
    cy.xpath(rootFundDetailsXpath)
      .should('be.visible');
  },

  createDefaultFund(fund) {
    cy.do([
      Button('New').click(),
      TextField('Name*').fillIn(fund.name),
      TextField('Code*').fillIn(fund.code),
      TextField('External account*').fillIn(fund.externalAccount),
      Selection('Ledger*').open(),
      SelectionList().select(fund.ledgerName),
      Button('Save & Close').click()
    ]);
    this.waitForFundDetailsLoading();
  },

  checkCreatedFund: (fundName) => {
    cy.xpath(createdFundNameXpath)
      .should('be.visible')
      .and('have.text', fundName);
  },

  tryToCreateFundWithoutMandatoryFields: (fundName) => {
    cy.do([
      Button('New').click(),
      TextField('Name*').fillIn(fundName),
      Button('Save & Close').click(),
      TextField('Code*').fillIn('some code'),
      Button('Save & Close').click(),
      TextField('External account*').fillIn('some account'),
      Button('Save & Close').click(),
      // try to navigate without saving
      Button('Agreements').click(),
      Button('Keep editing').click,
      Button('Cancel').click(),
      Button('Close without saving').click()
    ]);
  },

  searchByName : (fundName) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('Name'),
      SearchField({ id: 'input-record-search' }).fillIn(fundName),
      Button('Search').click(),
    ]);
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  deleteFundViaActions: () => {
    cy.do([
      Button('Actions').click(),
      Button('Delete').click(),
      Button('Delete', { id:'clickable-fund-remove-confirmation-confirm' }).click()
    ]);
  },

  addBudget: (allocatedQuantity) => {
    cy.do(Accordion('Current budget').find(Button('New')).click());
    cy.expect(Modal('Current budget').exists());
    cy.do([
      Modal('Current budget').find(TextField({ name: 'allocated' })).fillIn(allocatedQuantity.toString()),
      Button('Save').click()
    ]);
  },

  checkCreatedBudget: (fundCode, fiscalYear) => {
    cy.expect(Accordion('Budget summary').exists());
    cy.expect(Accordion('Budget information').exists());
    cy.xpath(budgetTitleXpath)
      .should('be.visible')
      .and('have.text', fundCode.concat('-', fiscalYear));
  },

  deleteBudgetViaActions() {
    cy.do([
      Button('Actions').click(),
      Button('Delete').click(),
      Button('Delete', { id:'clickable-budget-remove-confirmation-confirm' }).click()
    ]);
    this.waitForFundDetailsLoading();
  },
};
