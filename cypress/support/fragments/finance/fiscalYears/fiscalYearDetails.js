import { Button, PaneHeader, Section, including } from '../../../../../interactors';
import { AppList } from '../../../../../interactors/applist';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import FinanceDetails from '../financeDetails';
import LedgerDetails from '../ledgers/ledgerDetails';

const fiscalYearDetailsSection = Section({ id: 'pane-fiscal-year-details' });
const fiscalYearDetailsHeader = PaneHeader({ id: 'paneHeaderpane-fiscal-year-details' });

export default {
  ...FinanceDetails,
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
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

  verifyFiscalYearName: (title) => {
    cy.expect(
      fiscalYearDetailsSection.find(fiscalYearDetailsHeader).has({ text: including(title) }),
    );
  },
  varifyExistsFinanceApp: () => {
    cy.expect(AppList('Finance').exists());
  },
};
