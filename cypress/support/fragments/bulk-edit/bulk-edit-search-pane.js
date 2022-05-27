import { Button, Modal, RadioButton, Select } from '../../../../interactors';

export default {
  verifyItemsForOnlyViewPermission() {
    cy.expect([
      RadioButton('Inventory - items').has({ disabled: true }),
      Select('Record identifier').has({ disabled: true }),
      Button('or choose file').has({ disabled: true }),
      Button('Actions').absent()
    ]);
  },

  selectRecordIdentifier(value) {
    cy.do(Select('Record identifier').choose(value));
  },

  uploadFile(fileName) {
    cy.get('input[type=file]').attachFile(fileName, { allowEmpty: true });
  },

  verifyModalName(name) {
    cy.expect(Modal(name).exists());
    cy.do(Button('Cancel').click());
  }
};
