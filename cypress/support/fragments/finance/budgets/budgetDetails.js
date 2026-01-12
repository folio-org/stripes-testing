import {
  Button,
  HTML,
  Link,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneHeader,
  Section,
  including,
} from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import FinanceDetails from '../financeDetails';
import AddTransferModal from '../modals/addTransferModal';
import { TRANSFER_ACTIONS } from '../transfer/constants';
import Transactions from '../transactions/transactions';

const budgetPane = Section({ id: 'pane-budget' });
const budgetDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-budget' });
const actionsButton = budgetDetailsPaneHeader.find(Button('Actions'));

const summarySection = budgetPane.find(Section({ id: 'summary' }));
const informationSection = budgetPane.find(Section({ id: 'information' }));
const expenseClassSection = budgetPane.find(Section({ id: 'expense-classes' }));

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(budgetPane.exists());
  },
  checkBudgetDetails({ summary = [], information = [], balance = {}, expenseClass } = {}) {
    cy.wait(4000);
    summary.forEach(({ key, value }) => {
      cy.expect(
        summarySection
          .find(MultiColumnListRow({ isContainer: true, content: including(key) }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(value) }),
      );
    });
    if (information.length) {
      FinanceDetails.checkInformation(information);
    }

    if (balance.cash) {
      this.checkBalance({ name: 'Cash', value: balance.cash });
    }
    if (balance.available) {
      this.checkBalance({ name: 'Available', value: balance.available });
    }

    if (expenseClass) {
      FinanceDetails.checkExpenseClassesTableContent({
        section: expenseClassSection,
        items: [expenseClass],
      });
    }
  },
  checkBalance({ name, value }) {
    cy.expect(budgetPane.find(HTML(including(`${name} balance: ${value}`))).exists());
  },
  openAddTransferModal() {
    cy.do([actionsButton.click(), Button(TRANSFER_ACTIONS.TRANSFER).click()]);
    AddTransferModal.verifyModalView();

    return AddTransferModal;
  },
  clickDecreaseAllocationButton() {
    cy.do([actionsButton.click(), Button(TRANSFER_ACTIONS.DECREASE_ALLOCATION).click()]);
    AddTransferModal.verifyModalView({ header: TRANSFER_ACTIONS.DECREASE_ALLOCATION });

    return AddTransferModal;
  },
  clickMoveAllocationButton() {
    cy.do([actionsButton.click(), Button(TRANSFER_ACTIONS.MOVE_ALLOCATION).click()]);
    AddTransferModal.verifyModalView({ header: TRANSFER_ACTIONS.MOVE_ALLOCATION });

    return AddTransferModal;
  },
  clickViewTransactionsLink() {
    cy.do(informationSection.find(Link('View transactions')).click());
    Transactions.waitLoading();

    return Transactions;
  },
  closeBudgetDetails() {
    cy.do(budgetDetailsPaneHeader.find(Button({ icon: 'times' })).click());
    cy.expect(budgetPane.absent());
  },
  getIncreaseInAllocationValue() {
    return cy
      .get('#pane-budget')
      .find('[class*="headline"][class*="size-medium"]')
      .invoke('text')
      .then((text) => {
        const value = text.trim();
        return cy.wrap(value);
      });
  },
  checkIncreaseInAllocationValue(expected) {
    this.getIncreaseInAllocationValue().then((actual) => {
      expect(actual).to.eq(expected);
    });
  },
};
