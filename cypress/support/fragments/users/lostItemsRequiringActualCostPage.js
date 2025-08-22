import { including } from '@interactors/html';
import {
  HTML,
  Accordion,
  Button,
  Checkbox,
  ListRow,
  MultiColumnListCell,
  Pane,
} from '../../../../interactors';

const rootPane = Pane('Lost items requiring actual cost');
const lossTypeFilterAccordion = Accordion({ id: 'lossTypeFilterAccordion' });
const ellipsisButton = Button({ icon: 'ellipsis' });
const resetButton = Button({ id: 'lostItemsResetAllButton' });
const searchButton = Button({ id: 'lostItemsSearchButton' });

export default {
  waitLoading: () => cy.expect(rootPane.exists()),

  verifyFilters: () => {
    cy.expect([
      searchButton.has({ disabled: true }),
      resetButton.exists(),
      lossTypeFilterAccordion.find(Checkbox('Aged to lost')).exists(),
      lossTypeFilterAccordion.find(Checkbox('Declared lost')).exists(),
    ]);
  },

  verifyUserNotHavePermissionToAccess() {
    cy.expect(
      HTML(
        'User does not have permission to access "Lost items needing actual cost" processing page',
      ).exists(),
    );
  },

  searchByLossType(type) {
    cy.do(lossTypeFilterAccordion.find(Checkbox(type)).click());
    cy.expect(lossTypeFilterAccordion.find(Checkbox(type)).has({ checked: true }));
  },

  filterByStatus(status) {
    cy.do(Accordion({ id: 'statusFilterAccordion' }).find(Checkbox(status)).click());
  },

  clickLoadMoreIfExists() {
    cy.wait(5000);
    cy.get('body').then(($body) => {
      if ($body.find('button[id="lostItemsList-clickable-paging-button"]').length > 0) {
        cy.do(Button('Load more').click({ force: true }));
        cy.wait(1000);
      }
    });
  },

  checkResultsLossType(instanceTitle, type) {
    this.clickLoadMoreIfExists();
    this.clickLoadMoreIfExists();
    cy.expect(
      ListRow(including(instanceTitle))
        .find(MultiColumnListCell({ column: 'Loss type' }))
        .has({ content: type }),
    );
  },

  checkResultsPatronColumn(instanceTitle, patron) {
    cy.expect(
      ListRow(including(instanceTitle))
        .find(MultiColumnListCell({ column: 'Patron' }))
        .has({ content: including(patron) }),
    );
  },

  checkResultsColumn(instanceTitle, column, content) {
    cy.expect(
      ListRow(including(instanceTitle))
        .find(MultiColumnListCell({ column }))
        .has({ content: including(content) }),
    );
  },

  checkResultNotDisplayed(instanceTitle) {
    cy.expect(ListRow(including(instanceTitle)).absent());
  },

  openLoanDetails(instanceTitle) {
    cy.do([
      ListRow(including(instanceTitle)).find(ellipsisButton).click(),
      Button('Loan details').click(),
    ]);
    cy.expect(Pane(including('Loan details')).exists());
  },

  openDoNotBill(instanceTitle) {
    cy.do([
      ListRow(including(instanceTitle)).find(ellipsisButton).click(),
      Button('Do not bill').click(),
    ]);
  },

  openBillActualCost(instanceTitle) {
    cy.do([
      ListRow(including(instanceTitle)).find(ellipsisButton).click(),
      Button('Bill actual cost').click(),
    ]);
  },

  checkDropdownOptions(instanceTitle, options, disabled = false) {
    cy.do(ListRow(including(instanceTitle)).find(ellipsisButton).click());
    options.forEach((option) => {
      cy.expect(Button(option).has({ disabled }));
    });
    cy.do(ListRow(including(instanceTitle)).find(ellipsisButton).click());
  },
};
