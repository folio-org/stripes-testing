import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  MultiColumnList,
  MultiColumnListCell,
  MultiSelect,
  MultiSelectOption,
} from '../../../../interactors';
import { ITEM_STATUS_NAMES } from '../../constants';

export default {
  itemStatuses: [
    ITEM_STATUS_NAMES.AVAILABLE,
    ITEM_STATUS_NAMES.CHECKED_OUT,
    ITEM_STATUS_NAMES.ON_ORDER,
    ITEM_STATUS_NAMES.IN_PROCESS,
    ITEM_STATUS_NAMES.AWAITING_PICKUP,
    ITEM_STATUS_NAMES.AWAITING_DELIVERY,
    ITEM_STATUS_NAMES.IN_TRANSIT,
    ITEM_STATUS_NAMES.MISSING,
    ITEM_STATUS_NAMES.WITHDRAWN,
    ITEM_STATUS_NAMES.CLAIMED_RETURNED,
    ITEM_STATUS_NAMES.DECLARED_LOST,
    ITEM_STATUS_NAMES.LOST_AND_PAID,
    ITEM_STATUS_NAMES.PAGED,
    ITEM_STATUS_NAMES.ORDER_CLOSED,
  ],

  toggleStatus(statusName) {
    cy.wait(500);
    cy.do(MultiSelect({ id: 'itemStatus-multiselect' }).toggle());
    cy.wait(500);
    cy.do(MultiSelectOption(including(`${statusName}(`)).click());
    cy.wait(1500);
  },

  toggleItemStatusAccordion() {
    cy.do(Accordion('Item status').clickHeader());
  },

  selectInstance(title) {
    cy.do(MultiColumnListCell(title).click());
  },

  toggleAccordionItemsButton(holdingId) {
    cy.do(Button({ id: `accordion-toggle-button-holdings.${holdingId}` }).click());
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
