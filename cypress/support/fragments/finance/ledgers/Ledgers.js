import { Button } from '../../../../../interactors';
import NewLedger from './newLedger';

export default class Ledgers {
  static #rootLedgerDetailsXpath = '//*[@id="pane-ledger-details"]';
  static #createdLedgerNameXpath = '//*[@id="paneHeaderpane-ledger-details-pane-title"]/h2/span';

  static #newButton = Button('New');

  static createDefaultLedger(defaultLedger = NewLedger.defaultLedger) {
    cy.expect(this.#newButton.exists());
    cy.do(this.#newButton.click());
    NewLedger.waitLoading();
    NewLedger.fillMandatoryFields(defaultLedger);
    NewLedger.save();
    this.waitForLedgerDetailsLoading();
    // TODO: check ability to work through interactors
    this.checkCreatedLedgerName(defaultLedger);
  }

  static waitForLedgerDetailsLoading() {
    cy.xpath(this.#rootLedgerDetailsXpath)
      .should('be.visible');
  }

  static checkCreatedLedgerName(ledger) {
    cy.xpath(this.#createdLedgerNameXpath)
      .should('be.visible')
      .and('have.text', ledger.name);
  }
}