import {
  Button,
  HTML,
  KeyValue,
  Link,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneHeader,
  Section,
  including,
} from '../../../../../interactors';
import AddTransferModal from '../modals/addTransferModal';
import Transactions from '../transactions/transactions';

const budgetPane = Section({ id: 'pane-budget' });
const budgetDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-budget' });
const actionsButton = budgetDetailsPaneHeader.find(Button('Actions'));

const summarySection = Section({ id: 'summary' });
const informationSection = Section({ id: 'information' });

export default {
  waitLoading() {
    cy.expect(budgetPane.exists());
  },
  checkBudgetDetails({ summary = [], information = [], balance = {} } = {}) {
    summary.forEach(({ key, value }) => {
      cy.expect(
        summarySection
          .find(MultiColumnListRow({ isContainer: true, content: including(key) }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(value) }),
      );
    });
    information.forEach(({ key, value }) => {
      cy.expect(informationSection.find(KeyValue(key)).has({ value: including(value) }));
    });

    if (balance.cash) {
      this.checkBalance({ name: 'Cash', value: balance.cash });
    }
    if (balance.available) {
      this.checkBalance({ name: 'Available', value: balance.available });
    }
  },
  checkBalance({ name, value }) {
    cy.expect(budgetPane.find(HTML(including(`${name} balance: ${value}`))).exists());
  },
  openAddTransferModal() {
    cy.do([actionsButton.click(), Button('Transfer').click()]);
    AddTransferModal.verifyModalView();

    return AddTransferModal;
  },
  clickViewTransactionsLink() {
    cy.do(informationSection.find(Link('View transactions')).click());
    Transactions.waitLoading();

    return Transactions;
  },
  closeBudgetDetails() {
    cy.do(budgetDetailsPaneHeader.find(Button({ icon: 'times' })).click());
  },
};
