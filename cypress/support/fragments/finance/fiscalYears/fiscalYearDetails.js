import { Button, PaneHeader, Section } from '../../../../../interactors';
import FinanceDetails from '../financeDetails';
import LedgerDetails from '../ledgers/ledgerDetails';

const fiscalYearDetailsSection = Section({ id: 'pane-fiscal-year-details' });
const fiscalYearDetailsHeader = PaneHeader({ id: 'paneHeaderpane-fiscal-year-details' });

export default {
  ...FinanceDetails,
  waitLoading() {
    cy.expect(fiscalYearDetailsSection.exists());
  },
  checkFiscalYearDetails({ information, financialSummary, ledgers, groups, funds } = {}) {
    if (information) {
      FinanceDetails.checkInformation(information);
    }
    if (financialSummary) {
      FinanceDetails.checkFinancialSummary(financialSummary);
    }
    if (ledgers) {
      FinanceDetails.checkLedgersDetails(ledgers);
    }
    if (groups) {
      FinanceDetails.checkGroupsDetails(groups);
    }
    if (funds) {
      FinanceDetails.checkFundsDetails(funds);
    }
  },
  openLedgerDetails(name) {
    FinanceDetails.openLedgerDetails(name);
    LedgerDetails.waitLoading();

    return LedgerDetails;
  },
  closeFiscalYearDetails() {
    cy.do(fiscalYearDetailsHeader.find(Button({ icon: 'times' })).click());
  },
};
