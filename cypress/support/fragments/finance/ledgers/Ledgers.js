import { Button, Accordion, Checkbox, SelectionList, Selection, SearchField } from '../../../../../interactors';
import NewLedger from './newLedger';

const rootLedgerDetailsXpath = '//*[@id="pane-ledger-details"]';
const createdLedgerNameXpath = '//*[@id="paneHeaderpane-ledger-details-pane-title"]/h2/span';
const numberOfSearchResultsHeader = '//*[@id="paneHeaderledger-results-pane-subtitle"]/span';

const newButton = Button('New');

const zeroResultsFoundText = '0 records found';

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
    cy.do(newButton.click());
    NewLedger.waitLoading();
    NewLedger.fillMandatoryFields(defaultLedger);
    NewLedger.save();
    this.waitForLedgerDetailsLoading();
  },

  resetFilters: () => {
    cy.do(Button({ id: 'reset-ledgers-filters' }).click());
  },

  tryToCreateLedgerWithoutMandatoryFields(ledgerName) {
    cy.expect(newButton.exists());
    cy.do(newButton.click());
    NewLedger.waitLoading();
    NewLedger.fillOnlyNameAndCode(ledgerName);
    NewLedger.save();
    NewLedger.closeWithoutSaving();
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
