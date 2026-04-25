import { Button, Checkbox, PaneHeader, Section, including, Pane } from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import FinanceDetails from '../financeDetails';
import FundDetails from '../funds/fundDetails';
import GroupDetails from '../groups/groupDetails';
import ExportBudgetModal from '../modals/exportBudgetModal';
import LedgerEditForm from './ledgerEditForm';
import LedgerRolloverDetails from './ledgerRolloverDetails';
import LedgerRollovers from './ledgerRollovers';

const ledgerDetailsPane = Section({ id: 'pane-ledger-details' });

// ledger details header
const ledgerDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-ledger-details' });
const ledgerDetailsPaneAfterRollover = Pane({ id: 'pane-ledger-rollover-in-progress' });
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const encumbranceLimitsCheckbox = Checkbox({ labelText: 'Enforce all budget encumbrance limits' });
const expenditureLimitsCheckbox = Checkbox({ labelText: 'Enforce all budget expenditure limits' });

export default {
  ...FinanceDetails,
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(ledgerDetailsPane.exists());
  },
  waitForLoadingLedgerDetailAfterRollover() {
    cy.expect(ledgerDetailsPaneAfterRollover.exists());
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
  checkLedgerDetails({
    information,
    financialSummary,
    funds,
    encumbranceLimitChecked,
    expenditureLimitChecked,
  } = {}) {
    if (information) {
      FinanceDetails.checkInformation(information);
    }
    if (financialSummary) {
      FinanceDetails.checkFinancialSummary(financialSummary);
    }
    if (funds) {
      FinanceDetails.checkFundsDetails(funds);
    }
    if (encumbranceLimitChecked !== undefined) {
      cy.expect(
        ledgerDetailsPane
          .find(encumbranceLimitsCheckbox)
          .has({ visible: true, checked: encumbranceLimitChecked, disabled: true }),
      );
    }
    if (expenditureLimitChecked !== undefined) {
      cy.expect(
        ledgerDetailsPane
          .find(expenditureLimitsCheckbox)
          .has({ visible: true, checked: expenditureLimitChecked, disabled: true }),
      );
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

  verifyLedgerName: (title) => {
    cy.expect(ledgerDetailsPane.find(ledgerDetailsPaneHeader).has({ text: including(title) }));
  },

  selectEditOption() {
    this.expandActionsDropdown();
    cy.do(editButton.click());
    LedgerEditForm.waitLoading();
  },
};
