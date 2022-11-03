import { Checkbox, PaneHeader } from '../../../../../interactors';


export default {

  waitLoadingOpeningPurchaseOrders : () => {
    cy.expect(PaneHeader('Opening purchase orders').exists());
  },

  expectDisabledCheckboxIsOpenOrderEnabled: () => {
    cy.expect(Checkbox({ name: 'isOpenOrderEnabled'}).disabled());
  },
};
