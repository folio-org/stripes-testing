import {
  Checkbox,
  Button,
  Accordion,
  MultiColumnListCell,
  MultiColumnList,
  TextField,
} from '../../../../interactors';

export default {
  itemStatuses: [
    'Available',
    'Checked out',
    'On order',
    'In process',
    'Awaiting pickup',
    'Awaiting delivery',
    'In transit',
    'Missing',
    'Withdrawn',
    'Claimed returned',
    'Declared lost',
    'Lost and paid',
    'Paged',
    'Order closed',
  ],

  toggleStatus(statusName) {
    cy.do(TextField({ label: 'itemStatus-field' }).fillIn(statusName));
    // need to wait until status is uploaded
    cy.wait(1500);
    cy.do(TextField({ label: 'itemStatus-field' }).focus());
    cy.do(Checkbox(statusName).click());
  },

  toggleItemStatusAccordion() {
    cy.do(Accordion('Item status').clickHeader());
  },

  selectInstance(title) {
    cy.do(MultiColumnListCell(title).click());
  },

  toggleAccordionItemsButton(holdingId) {
    cy.do(Button({ id: `accordion-toggle-button-${holdingId}` }).click());
  },

  verifyItemWithStatusExists(holdingId, status) {
    cy.expect(
      MultiColumnList({ id: `list-items-${holdingId}` })
        .find(MultiColumnListCell(status))
        .exists(),
    );
  },

  waitItemsLoading() {
    cy.wait(['@getItems', '@getHoldings']);
  },
};
