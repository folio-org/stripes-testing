import { KeyValue, PaneHeader, Section, Select, including } from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import { GROUP_VIEW_FIELDS } from '../../../constants/finance/group';
import FinanceDetails from '../financeDetails';

const groupDetailsPane = Section({ id: 'pane-group-details' });
const informationSection = groupDetailsPane.find(Section({ id: 'information' }));
const expenseClassSection = groupDetailsPane.find(Section({ id: 'expenseClasses' }));
const groupDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-group-details' });

// Unlike the ledger pane, the select has no label of its own and sits inside the "Fiscal year" key value
const fiscalYearSelect = informationSection
  .find(KeyValue(GROUP_VIEW_FIELDS.FISCAL_YEAR))
  .find(Select());

export default {
  ...FinanceDetails,
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(groupDetailsPane.exists());
  },
  verifyGroupName: (title) => {
    cy.expect(groupDetailsPane.find(groupDetailsPaneHeader).has({ text: including(title) }));
  },
  selectFiscalYear(fiscalYearCode) {
    cy.do(fiscalYearSelect.choose(fiscalYearCode));
  },
  checkInformation(information = []) {
    information.forEach(({ key, value }) => {
      if (key === GROUP_VIEW_FIELDS.FISCAL_YEAR) {
        cy.expect(fiscalYearSelect.has({ checkedOptionText: including(String(value)) }));
      } else {
        FinanceDetails.checkInformation([{ key, value }]);
      }
    });
  },
  checkGroupDetails({ information, financialSummary, funds, expenseClass, expenseClasses } = {}) {
    if (information) {
      this.checkInformation(information);
    }
    if (financialSummary) {
      FinanceDetails.checkFinancialSummary(financialSummary);
    }
    if (funds) {
      FinanceDetails.checkFundsDetails(funds);
    }
    const classes = expenseClasses || (expenseClass ? [expenseClass] : null);
    if (classes) {
      FinanceDetails.checkExpenseClassesTableContent({
        section: expenseClassSection,
        items: classes,
      });
    }
  },
};
