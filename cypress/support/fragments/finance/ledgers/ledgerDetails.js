import {
  Button,
  HTML,
  KeyValue,
  MultiColumnListCell,
  PaneHeader,
  Section,
  including,
} from '../../../../../interactors';
import LedgerRollovers from './ledgerRollovers';
import LedgerRolloverDetails from './ledgerRolloverDetails';
import FundDetails from '../funds/fundDetails';
import ExportBudgetModal from '../modals/exportBudgetModal';

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
  exportBudgetInformation({ fiscalYear }) {
    this.expandActionsDropdown();
    cy.do(Button('Export budget information (CSV)').click());
    ExportBudgetModal.verifyModalView({ fiscalYear });

    return ExportBudgetModal;
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
  checkLedgeDetails({ information = [], funds } = {}) {
    information.forEach(({ key, value }) => {
      cy.expect(ledgerDetailsPane.find(KeyValue(key)).has({ value: including(value) }));
    });

    if (funds) {
      this.checkFunds(funds);
    }
  },
  checkFunds(funds = []) {
    funds.forEach((fund, index) => {
      if (fund.name) {
        cy.expect(
          fundsSection
            .find(MultiColumnListCell({ row: index, column: 'Name' }))
            .has({ content: including(fund.name) }),
        );
      }
      if (fund.allocated) {
        cy.expect(
          fundsSection
            .find(MultiColumnListCell({ row: index, column: 'Allocated' }))
            .has({ content: including(fund.allocated) }),
        );
      }
      if (fund.unavailable) {
        cy.expect(
          fundsSection
            .find(MultiColumnListCell({ row: index, column: 'Unavailable' }))
            .has({ content: including(fund.unavailable) }),
        );
      }
      if (fund.available) {
        cy.expect(
          fundsSection
            .find(MultiColumnListCell({ row: index, column: 'Available' }))
            .has({ content: including(fund.available) }),
        );
      }
    });

    if (!funds.length) {
      cy.expect(fundsSection.find(HTML('The list contains no items')).exists());
    }
  },
  openFundDetails({ row = 0 } = {}) {
    cy.do(fundsSection.find(MultiColumnListCell({ row, column: 'Name' })).click());
    FundDetails.waitLoading();

    return FundDetails;
  },
};
