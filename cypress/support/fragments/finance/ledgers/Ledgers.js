import { Button } from '../../../../../interactors';
import NewLedger from './newLedger';

const rootLedgerDetailsXpath = '//*[@id="pane-ledger-details"]';
const createdLedgerNameXpath = '//*[@id="paneHeaderpane-ledger-details-pane-title"]/h2/span';

const newButton = Button('New');

export const waitForLedgerDetailsLoading = () => {
  cy.xpath(rootLedgerDetailsXpath)
    .should('be.visible');
};

export const checkCreatedLedgerName = (ledger) => {
  cy.xpath(createdLedgerNameXpath)
    .should('be.visible')
    .and('have.text', ledger.name);
};

export const createDefaultLedger = (defaultLedger = NewLedger.defaultLedger) => {
  cy.expect(newButton.exists());
  cy.do(newButton.click());
  NewLedger.waitLoading();
  NewLedger.fillMandatoryFields(defaultLedger);
  NewLedger.save();
  waitForLedgerDetailsLoading();
  // TODO: check ability to work through interactors
  checkCreatedLedgerName(defaultLedger);
};
