import { Button, KeyValue, Link, PaneHeader, Section, including } from '../../../../../interactors';

const budgetPane = Section({ id: 'pane-budget' });
const budgetDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-budget' });

const informationSection = Section({ id: 'information' });

export default {
  waitLoading() {
    cy.expect(budgetPane.exists());
  },
  checkBudgetDetails({ information = [] } = {}) {
    information.forEach(({ key, value }) => {
      cy.expect(informationSection.find(KeyValue(key)).has({ value: including(value) }));
    });
  },
  clickViewTransactionsLink() {
    cy.do(informationSection.find(Link('View transactions')).click());
  },
  closeBudgetDetails() {
    cy.do(budgetDetailsPaneHeader.find(Button({ icon: 'times' })).click());
  },
};
