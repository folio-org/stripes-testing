import { Button, TextField, SearchField } from '../../../../../interactors';

const rootFiscalYearDetailsXpath = '//*[@id="pane-fiscal-year-details"]';
const createdFiscalYearNameXpath = '//*[@id="paneHeaderpane-fiscal-year-details-pane-title"]/h2/span';
const numberOfSearchResultsHeader = '//*[@id="paneHeaderfiscal-year-results-pane-subtitle"]/span';
const zeroResultsFoundText = '0 records found';
// TODO: move all same buttons to one place related to Finance module
const saveAndClose = Button('Save & Close');
const agreements = Button('Agreements');
const buttonNew = Button('New');
const actions = Button('Actions');
const deleteButton = Button('Delete');
const searchField = SearchField({ id: 'input-record-search' });

export default {
  waitForFiscalYearDetailsLoading : () => {
    cy.xpath(rootFiscalYearDetailsXpath)
      .should('be.visible');
  },

  createDefaultFiscalYear(fiscalYear) {
    cy.do([
      buttonNew.click(),
      TextField('Name*').fillIn(fiscalYear.name),
      TextField('Code*').fillIn(fiscalYear.code),
      TextField('Period Begin Date*').fillIn(fiscalYear.periodBeginDate),
      TextField('Period End Date*').fillIn(fiscalYear.periodEndDate),
      saveAndClose.click()
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
      buttonNew.click(),
      TextField('Name*').fillIn(fiscalYearName),
      saveAndClose.click(),
      TextField('Code*').fillIn('some code'),
      saveAndClose.click(),
      TextField('Period Begin Date*').fillIn('05/05/2021'),
      saveAndClose.click(),
      // try to navigate without saving
      agreements.click(),
      Button('Keep editing').click(),
      Button('Cancel').click(),
      Button('Close without saving').click()
    ]);
  },

  searchByName : (fiscalYearName) => {
    cy.do([
      searchField.selectIndex('Name'),
      searchField.fillIn(fiscalYearName),
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
      actions.click(),
      deleteButton.click(),
      Button('Delete', { id:'clickable-fiscal-year-remove-confirmation-confirm' }).click()
    ]);
  }
};
