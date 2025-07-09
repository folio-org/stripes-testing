import {
  Button,
  MultiColumnListCell,
  PaneHeader,
  Section,
  including,
} from '../../../../../interactors';
import FinanceDetails from '../financeDetails';
import FundEditForm from './fundEditForm';
import BudgetDetails from '../budgets/budgetDetails';
import AddBudgetModal from '../modals/addBudgetModal';
import Transactions from '../transactions/transactions';

const fundDetailsPane = Section({ id: 'pane-fund-details' });

// fund details header
const fundDetailsPaneHeader = fundDetailsPane.find(
  PaneHeader({ id: 'paneHeaderpane-fund-details' }),
);
const actionsButton = Button('Actions');

const currentBudgetSection = fundDetailsPane.find(Section({ id: 'currentBudget' }));
const currentExpenseClassesSection = fundDetailsPane.find(Section({ id: 'currentExpenseClasses' }));
const plannedBudgetSection = fundDetailsPane.find(Section({ id: 'plannedBudget' }));
const previousBudgetsSection = fundDetailsPane.find(Section({ id: 'previousBudgets' }));

export default {
  ...FinanceDetails,
  waitLoading: () => {
    cy.wait(4000);
    cy.expect(fundDetailsPane.exists());
  },
  expandActionsDropdown() {
    cy.do(fundDetailsPaneHeader.find(actionsButton).click());
  },
  openFundEditForm() {
    this.expandActionsDropdown();
    cy.do(Button('Edit').click());
    FundEditForm.waitLoading();
    FundEditForm.verifyFormView();

    return FundEditForm;
  },
  viewTransactionsForCurrentBudget() {
    this.expandActionsDropdown();

    cy.do(Button('View transactions for current budget').click());

    Transactions.waitLoading();

    return Transactions;
  },
  clickAddCurrentBudget() {
    return this.clickAddNewBudget({ section: currentBudgetSection, modalHeader: 'Current budget' });
  },
  clickAddPlannedBudget() {
    return this.clickAddNewBudget({ section: plannedBudgetSection, modalHeader: 'Planned budget' });
  },
  clickAddNewBudget({ section, modalHeader }) {
    cy.do(section.find(Button('New')).click());
    AddBudgetModal.verifyModalView(modalHeader);

    return AddBudgetModal;
  },
  openCurrentBudgetDetails(index = 0) {
    return this.openBudgetDetails({ index, section: currentBudgetSection });
  },
  openPlannedBudgetDetails(index = 0) {
    return this.openBudgetDetails({ index, section: plannedBudgetSection });
  },
  openPreviousBudgetDetails(index = 0) {
    return this.openBudgetDetails({ index, section: previousBudgetsSection });
  },
  openBudgetDetails({ index = 0, section } = {}) {
    cy.do(section.find(MultiColumnListCell({ row: index, column: 'Name' })).click());
    BudgetDetails.waitLoading();

    return BudgetDetails;
  },
  checkFundDetails({
    information,
    currentBudget,
    currentExpenseClasses,
    plannedBudgets,
    previousBudgets,
  } = {}) {
    if (information) {
      FinanceDetails.checkInformation(information);
    }

    if (currentBudget) {
      this.checkCurrentBudget(currentBudget);
    }
    if (currentExpenseClasses) {
      this.checkCurrentExpenseClasses(currentExpenseClasses);
    }
    if (plannedBudgets) {
      this.checkPlannedBudgets(plannedBudgets);
    }

    if (previousBudgets) {
      this.checkPreviousBudgets(previousBudgets);
    }
  },
  checkCurrentBudget(budget) {
    const budgets = budget ? [budget] : [];
    FinanceDetails.checkTableContent({ section: currentBudgetSection, items: budgets });
  },
  checkPlannedBudgets(budgets = []) {
    FinanceDetails.checkTableContent({ section: plannedBudgetSection, items: budgets });
  },
  checkPreviousBudgets(budgets = []) {
    FinanceDetails.checkTableContent({ section: previousBudgetsSection, items: budgets });
  },
  checkCurrentExpenseClasses(expenseClasses) {
    FinanceDetails.checkExpenseClassesTableContent({
      section: currentExpenseClassesSection,
      items: expenseClasses,
    });
  },
  closeFundDetails() {
    cy.do(fundDetailsPaneHeader.find(Button({ icon: 'times' })).click());
  },

  verifyFundName: (title) => {
    cy.expect(fundDetailsPaneHeader.has({ text: including(title) }));
  },
};
