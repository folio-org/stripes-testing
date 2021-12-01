import { Button } from '../../../../../interactors';
import NewLedger from './newLedger';

const rootLedgerDetailsXpath = '//*[@id="pane-ledger-details"]';
const createdLedgerNameXpath = '//*[@id="paneHeaderpane-ledger-details-pane-title"]/h2/span';

const newButton = Button('New');

export default {
  waitForLedgerDetailsLoading : () => {
    cy.xpath(rootLedgerDetailsXpath)
      .should('be.visible');
  },

  checkCreatedLedgerName : (ledger) => {
    cy.xpath(createdLedgerNameXpath)
      .should('be.visible')
      .and('have.text', ledger.name);
  },

  createDefaultLedger(defaultLedger = NewLedger.defaultLedger) {
    cy.expect(newButton.exists());
    cy.do(newButton.click());
    NewLedger.waitLoading();
    NewLedger.fillMandatoryFields(defaultLedger);
    NewLedger.save();
    this.waitForLedgerDetailsLoading();
    // TODO: check ability to work through interactors
    this.checkCreatedLedgerName(defaultLedger);
  },

  deleteLedgerViaActions: () => {
    cy.do([
      Button('Actions').click(),
      Button('Delete').click(),
      Button('Delete', { id:'clickable-ledger-remove-confirmation-confirm' }).click()
    ]);
  }
};
