import { Button, Accordion, Checkbox, SelectionList, Selection, SearchField, TextField } from '../../../../../interactors';

const rootLedgerDetailsXpath = '//*[@id="pane-ledger-details"]';
const createdLedgerNameXpath = '//*[@id="paneHeaderpane-ledger-details-pane-title"]/h2/span';
const numberOfSearchResultsHeader = '//*[@id="paneHeaderledger-results-pane-subtitle"]/span';

const zeroResultsFoundText = '0 records found';
const fiscalYearCss = 'select[name^="fiscalYearOneId"]';


export default {
  waitForLedgerDetailsLoading : () => {
    cy.xpath(rootLedgerDetailsXpath)
      .should('be.visible');
  },

  checkZeroSearchResultsHeader : () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  checkCreatedLedgerName : (ledger) => {
    cy.xpath(createdLedgerNameXpath)
      .should('be.visible')
      .and('have.text', ledger.name);
  },

  createDefaultLedger(defaultLedger) {
    cy.do([
      Button('New').click(),
      TextField('Name*').fillIn(defaultLedger.name),
      TextField('Code*').fillIn(defaultLedger.code),
    ]);
    // TODO: check ability to work through interactors
    cy.get(fiscalYearCss)
      .select(defaultLedger.fiscalYear);
    cy.do(Button('Save & Close').click());
    this.waitForLedgerDetailsLoading();
  },

  resetFilters: () => {
    cy.do(Button({ id: 'reset-ledgers-filters' }).click());
  },

  tryToCreateLedgerWithoutMandatoryFields(ledgerName) {
    cy.do([
      Button('New').click(),
      TextField('Name*').fillIn(ledgerName),
      Button('Save & Close').click(),
      TextField('Code*').fillIn('some code'),
      Button('Save & Close').click(),
      // try to navigate without saving
      Button('Agreements').click(),
      Button('Keep editing').click,
      Button('Cancel').click(),
      Button('Close without saving').click()
    ]);
  },

  deleteLedgerViaActions: () => {
    cy.do([
      Button('Actions').click(),
      Button('Delete').click(),
      Button('Delete', { id:'clickable-ledger-remove-confirmation-confirm' }).click()
    ]);
  },

  searchByStatusUnitsAndName(status, acquisitionUnitsName, ledgerName) {
    this.selectStatusInSearch(status);
    cy.do([
      Accordion({ id: 'acqUnitIds' }).clickHeader(),
      Selection({ id: 'acqUnitIds-selection' }).open(),
      SelectionList({ id: 'sl-container-acqUnitIds-selection' }).select(acquisitionUnitsName),
      SearchField({ id: 'input-record-search' }).fillIn(ledgerName),
      Button('Search').click(),
    ]);
  },

  selectStatusInSearch: (ledgerStatus) => {
    cy.do(Accordion({ id: 'ledgerStatus' }).clickHeader());
    switch (ledgerStatus) {
      case 'frozen':
        cy.do(Checkbox({ id: 'clickable-filter-ledgerStatus-frozen' }).click());
        break;
      case 'active':
        cy.do(Checkbox({ id: 'clickable-filter-ledgerStatus-active' }).click());
        break;
      case 'inactive':
        cy.do(Checkbox({ id: 'clickable-filter-ledgerStatus-inactive' }).click());
        break;
      default:
        cy.log('No such status like ' + ledgerStatus + '. Please use frozen, active or inactive');
    }
  }
};
