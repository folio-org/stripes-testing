import { Button, Checkbox, PaneHeader, TextField } from '../../../../../interactors';


export default {

  waitLoadingOpeningPurchaseOrders : () => {
    cy.expect(PaneHeader('Opening purchase orders').exists());
  },

  expectDisabledCheckboxIsOpenOrderEnabled: () => {
    cy.expect(Checkbox({ name: 'isOpenOrderEnabled'}).disabled());
  },

  waitLoadingPurchaseOrderLinesLimit : () => {
    cy.expect(PaneHeader('Purchase order lines limit').exists());
  },

  setPurchaseOrderLinesLimit: (polNumbers) => {
    // Need to wait,while input will be loaded(Settings menu has problems with interactors)
    cy.wait(4000);
    cy.get('input[name=value]').type(polNumbers);
    cy.do(Button({id: 'set-polines-limit-submit-btn'}).click());
  }
};
