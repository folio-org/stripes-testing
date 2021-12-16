import { Button, TextField, SearchField } from '../../../../../interactors';

const rootFiscalYearDetailsXpath = '//*[@id="pane-fiscal-year-details"]';
const createdFiscalYearNameXpath = '//*[@id="paneHeaderpane-fiscal-year-details-pane-title"]/h2/span';
const numberOfSearchResultsHeader = '//*[@id="paneHeaderfiscal-year-results-pane-subtitle"]/span';
const zeroResultsFoundText = '0 records found';

export default {
  waitForFiscalYearDetailsLoading : () => {
    cy.xpath(rootFiscalYearDetailsXpath)
      .should('be.visible');
  },

  createDefaultFiscalYear(fiscalYear) {
    cy.do([
      Button('New').click(),
      TextField('Name*').fillIn(fiscalYear.name),
      TextField('Code*').fillIn(fiscalYear.code),
      TextField('Period Begin Date*').fillIn(fiscalYear.periodBeginDate),
      TextField('Period End Date*').fillIn(fiscalYear.periodEndDate),
      Button('Save & Close').click()
    ]);
    this.waitForFiscalYearDetailsLoading();
  },

  checkCreatedFiscalYear: (fiscalYearName) => {
    cy.xpath(createdFiscalYearNameXpath)
      .should('be.visible')
      .and('have.text', fiscalYearName);
  },

  tryToCreateFiscalYearWithoutMandatoryFields: (fiscalYearName) => {
    cy.do([
      Button('New').click(),
      TextField('Name*').fillIn(fiscalYearName),
      Button('Save & Close').click(),
      TextField('Code*').fillIn('some code'),
      Button('Save & Close').click(),
      TextField('Period Begin Date*').fillIn('05/05/2021'),
      Button('Save & Close').click(),
      // try to navigate without saving
      Button('Agreements').click(),
      Button('Keep editing').click,
      Button('Cancel').click(),
      Button('Close without saving').click()
    ]);
  },

  searchByName : (fiscalYearName) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('Name'),
      SearchField({ id: 'input-record-search' }).fillIn(fiscalYearName),
      Button('Search').click(),
    ]);
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  deleteFiscalYearViaActions: () => {
    cy.do([
      Button('Actions').click(),
      Button('Delete').click(),
      Button('Delete', { id:'clickable-fiscal-year-remove-confirmation-confirm' }).click()
    ]);
  }
};
