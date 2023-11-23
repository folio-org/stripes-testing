import {
  Button,
  KeyValue,
  MultiColumnListCell,
  PaneHeader,
  Section,
  including,
} from '../../../../../interactors';
import LedgerRollovers from './ledgerRollovers';
import LedgerRolloverDetails from './ledgerRolloverDetails';
import FundDetails from '../funds/fundDetails';

const ledgerDetailsPane = Section({ id: 'pane-ledger-details' });

// ledger details header
const ledgerDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-ledger-details' });
const actionsButton = Button('Actions');

const fundsSection = Section({ id: 'fund' });

export default {
  waitLoading() {
    cy.expect(ledgerDetailsPane.exists());
  },
  expandActionsDropdown() {
    cy.do(ledgerDetailsPaneHeader.find(actionsButton).click());
  },
  openLedgerRolloverEditForm() {
    this.expandActionsDropdown();
    cy.do(Button('Rollover').click());
    LedgerRolloverDetails.waitLoading();

    return LedgerRolloverDetails;
  },
  openLedgerRolloverLogs() {
    this.expandActionsDropdown();
    cy.do(Button('Rollover logs').click());
    LedgerRollovers.waitLoading();

    return LedgerRollovers;
  },
  checkLedgeDetails({ information = [] } = {}) {
    information.forEach(({ key, value }) => {
      cy.expect(ledgerDetailsPane.find(KeyValue(key)).has({ value: including(value) }));
    });
  },
  openFundDetails({ row = 0 } = {}) {
    cy.do(fundsSection.find(MultiColumnListCell({ row, column: 'Name' })).click());
    FundDetails.waitLoading();

    return FundDetails;
  },
};
