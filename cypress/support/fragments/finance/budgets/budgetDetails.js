import {
  Button,
  HTML,
  KeyValue,
  Link,
  PaneHeader,
  Section,
  including,
} from '../../../../../interactors';
import AddTransferModal from '../modals/addTransferModal';

const budgetPane = Section({ id: 'pane-budget' });
const budgetDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-budget' });
const actionsButton = budgetDetailsPaneHeader.find(Button('Actions'));

const informationSection = Section({ id: 'information' });

export default {
  waitLoading() {
    cy.expect(budgetPane.exists());
  },
  checkBudgetDetails({ information = [], balance = {} } = {}) {
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
  },
  closeBudgetDetails() {
    cy.do(budgetDetailsPaneHeader.find(Button({ icon: 'times' })).click());
  },
};
