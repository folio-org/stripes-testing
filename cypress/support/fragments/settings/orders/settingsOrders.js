import { Button, Checkbox, PaneHeader, TextField } from '../../../../../interactors';


export default {

  waitLoadingOpeningPurchaseOrders : () => {
    cy.expect(PaneHeader('Opening purchase orders').exists());
  },

  expectDisabledCheckboxIsOpenOrderEnabled: () => {
    cy.expect(Checkbox({ name: 'isOpenOrderEnabled'}).disabled());
  },

  setPurchaseOrderLinesLimit: (polNumbers) => {
    cy.do([
      TextField({name: 'value'}).fillIn(polNumbers),
      Button({id: 'set-polines-limit-submit-btn'}).click(),
    ]);
  }
};
