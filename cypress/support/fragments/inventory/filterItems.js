import { Checkbox, Button, Accordion, MultiColumnListCell } from '../../../../interactors';

export default {
  toggleStatus(statusName) {
    cy.do(Checkbox(statusName).click());
  },
  switchToItem: () => {
    cy.do(Button({ id: 'segment-navigation-items' }).click());
  },
  toggleItemStatusAccordion() {
    cy.do(Accordion('Item status').clickHeader());
  },
  selectFirstItem() {
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).click());
  },
  waitLoading() {
    cy.wait('@getInstanceRelationshipTypes');
  }
};
