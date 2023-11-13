import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  ListRow,
  MultiColumnListCell,
  Pane,
} from '../../../../interactors';

const rootPane = Pane('Lost items requiring actual cost');

export default {
  waitLoading: () => cy.expect(rootPane.exists()),

  searchByLossType(type) {
    cy.do(Accordion({ id: 'lossTypeFilterAccordion' }).find(Checkbox(type)).click());
  },

  filterByStatus(status) {
    cy.do(Accordion({ id: 'statusFilterAccordion' }).find(Checkbox(status)).click());
  },

  checkResultsLossType(instanceTitle, type) {
    cy.expect(
      ListRow(including(instanceTitle))
        .find(MultiColumnListCell({ column: 'Loss type' }))
        .has({ content: type }),
    );
  },

  checkResultNotDisplayed(instanceTitle) {
    cy.expect(ListRow(including(instanceTitle)).absent());
  },

  openLoanDetails(instanceTitle) {
    cy.do([
      ListRow(including(instanceTitle))
        .find(Button({ icon: 'ellipsis' }))
        .click(),
      Button('Loan details').click(),
    ]);
    cy.expect(Pane(including('Loan details')).exists());
  },

  openDoNotBill(instanceTitle) {
    cy.do([
      ListRow(including(instanceTitle))
        .find(Button({ icon: 'ellipsis' }))
        .click(),
      Button('Do not bill').click(),
    ]);
  },

  checkDropdownOptionsDisabled(instanceTitle, options) {
    cy.do(
      ListRow(including(instanceTitle))
        .find(Button({ icon: 'ellipsis' }))
        .click(),
    );
    options.forEach((option) => {
      cy.expect(Button(option).has({ disabled: true }));
    });
  },
};
