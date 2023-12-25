import { Button, PaneHeader, Section } from '../../../../../interactors';
import FinanceDetails from '../financeDetails';
import LedgerRollovers from './ledgerRollovers';
import LedgerRolloverDetails from './ledgerRolloverDetails';
import GroupDetails from '../groups/groupDetails';
import FundDetails from '../funds/fundDetails';
import ExportBudgetModal from '../modals/exportBudgetModal';

const ledgerDetailsPane = Section({ id: 'pane-ledger-details' });

// ledger details header
const ledgerDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-ledger-details' });
const actionsButton = Button('Actions');

export default {
  ...FinanceDetails,
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
  checkLedgerDetails({ information, financialSummary, funds } = {}) {
    if (information) {
      FinanceDetails.checkInformation(information);
    }
    if (financialSummary) {
      FinanceDetails.checkFinancialSummary(financialSummary);
    }
    if (funds) {
      FinanceDetails.checkFundsDetails(funds);
    }
  },
  openGroupDetails(name) {
    FinanceDetails.openGroupDetails(name);
    GroupDetails.waitLoading();

    return GroupDetails;
  },
  openFundDetails(name) {
    FinanceDetails.openFundDetails(name);
    FundDetails.waitLoading();

    return FundDetails;
  },
};
