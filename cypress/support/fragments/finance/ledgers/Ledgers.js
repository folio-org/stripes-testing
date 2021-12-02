import { Button, SearchField } from '../../../../../interactors';
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
    cy.expect(newButton.exists());
    cy.do(newButton.click());
    NewLedger.waitLoading();
    NewLedger.fillMandatoryFields(defaultLedger);
    NewLedger.save();
    this.waitForLedgerDetailsLoading();
  },

  searchByName : (ledgerName) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('Name'),
      SearchField({ id: 'input-record-search' }).fillIn(ledgerName),
      Button('Search').click(),
    ]);
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
  }
};
