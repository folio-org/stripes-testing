import { Button, Checkbox, PaneHeader } from '../../../../../interactors';

const editPoNumberCheckbox = Checkbox('User can edit');
const saveButton = Button({ id: 'clickable-save-config' });

export default {

  waitLoadingEditPONumber: () => {
    cy.expect(PaneHeader('Edit').exists());
  },

  waitLoadingOpeningPurchaseOrders : () => {
    cy.expect(PaneHeader('Opening purchase orders').exists());
  },

  expectDisabledCheckboxIsOpenOrderEnabled: () => {
    cy.expect(Checkbox({ name: 'isOpenOrderEnabled' }).disabled());
  },

  waitLoadingPurchaseOrderLinesLimit : () => {
    cy.expect(PaneHeader('Purchase order lines limit').exists());
  },

  userCanEditPONumber : () => {
    cy.wait(4000);
    cy.do(editPoNumberCheckbox.click());
    cy.wait(4000);
    cy.do(saveButton.click());
  },

  userCanNotEditPONumber : () => {
    cy.wait(4000);
    cy.do(editPoNumberCheckbox.click());
    cy.wait(4000);
    cy.do(saveButton.click());
  },

  setPurchaseOrderLinesLimit: (polNumbers) => {
    // Need to wait,while input will be loaded(Settings menu has problems with interactors)
    cy.wait(8000);
    cy.get('input[name=value]').click().type(`{selectall}{backspace}${polNumbers}`);
    cy.wait(2000);
    cy.get('input[name=value]').click().type(`{selectall}{backspace}${polNumbers}`);
    cy.do(Button({ id: 'set-polines-limit-submit-btn' }).click());
  }
};
