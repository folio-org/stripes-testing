import {
  Button,
  HTML,
  KeyValue,
  MultiColumnListCell,
  PaneHeader,
  Section,
  including,
} from '../../../../../interactors';
import FundEditForm from './fundEditForm';
import BudgetDetails from '../budgets/budgetDetails';
import AddBudgetModal from '../modals/addBudgetModal';
import Transactions from '../transactions/transactions';

const fundDetailsPane = Section({ id: 'pane-fund-details' });

// fund details header
const fundDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-fund-details' });
const actionsButton = Button('Actions');

const currentBudgetSection = Section({ id: 'currentBudget' });
const plannedBudgetSection = Section({ id: 'plannedBudget' });
const previousBudgetsSection = Section({ id: 'previousBudgets' });

export default {
  waitLoading: () => {
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
  checkFundDetails({ information = [], currentBudget, plannedBudgets, previousBudgets } = {}) {
    information.forEach(({ key, value }) => {
      cy.expect(fundDetailsPane.find(KeyValue(key)).has({ value: including(value) }));
    });

    if (currentBudget) {
      this.checkCurrentBudget(currentBudget);
    }

    if (plannedBudgets) {
      this.checkPlannedBudgets(plannedBudgets);
    }

    if (previousBudgets) {
      this.checkPreviousBudgets(previousBudgets);
    }
  },
  checkBudgets(budgets, section) {
    budgets.forEach((budget, index) => {
      if (budget.name) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Name' }))
            .has({ content: including(budget.name) }),
        );
      }
      if (budget.allocated) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Allocated' }))
            .has({ content: including(budget.allocated) }),
        );
      }
      if (budget.unavailable) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Unavailable' }))
            .has({ content: including(budget.unavailable) }),
        );
      }
      if (budget.available) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Available' }))
            .has({ content: including(budget.available) }),
        );
      }
    });

    if (!budgets.length) {
      cy.expect(section.find(HTML('The list contains no items')).exists());
    }
  },
  checkCurrentBudget(budget) {
    const budgets = budget ? [budget] : [];
    this.checkBudgets(budgets, currentBudgetSection);
  },
  checkPlannedBudgets(budgets = []) {
    this.checkBudgets(budgets, plannedBudgetSection);
  },
  checkPreviousBudgets(budgets = []) {
    this.checkBudgets(budgets, previousBudgetsSection);
  },
  closeFundDetails() {
    cy.do(fundDetailsPaneHeader.find(Button({ icon: 'times' })).click());
  },
};
