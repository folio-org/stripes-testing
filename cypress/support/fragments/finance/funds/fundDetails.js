import {
  KeyValue,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  including,
} from '../../../../../interactors';
import BudgetDetails from '../budgets/budgetDetails';

const fundDetailsPane = Section({ id: 'pane-fund-details' });
const currentBudgetSection = Section({ id: 'currentBudget' });
const previousBudgetsSection = Section({ id: 'previousBudgets' });

export default {
  waitLoading: () => {
    cy.expect(fundDetailsPane.exists());
  },
  openCurrentBudgetDetails() {
    cy.do(
      currentBudgetSection
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .click(),
    );
    BudgetDetails.waitLoading();

    return BudgetDetails;
  },
  checkFundDetails({ information = [], currentBudget, previousBudgets } = {}) {
    information.forEach(({ key, value }) => {
      cy.expect(fundDetailsPane.find(KeyValue(key)).has({ value: including(value) }));
    });

    if (currentBudget) {
      this.checkCurrentBudget(currentBudget);
    }

    if (previousBudgets) {
      this.checkPreviousBudgets(previousBudgets);
    }
  },
  checkBudgets(budgets, section) {
    budgets.forEach((budget, index) => {
      cy.expect([
        section
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 0 }))
          .has({ content: including(budget.name) }),
        section
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(budget.allocated) }),
      ]);
    });
  },
  checkCurrentBudget(budget) {
    this.checkBudgets([budget], currentBudgetSection);
  },
  checkPreviousBudgets(budgets) {
    this.checkBudgets(budgets, previousBudgetsSection);
  },
};
