import { Button, RadioButton, Select } from '../../../../interactors';

export default {
  verifyItemsForOnlyViewPermission() {
    cy.expect([
      RadioButton('Inventory - items').has({ disabled: true }),
      Select('Record identifier').has({ disabled: true }),
      Button('or choose file').has({ disabled: true }),
      Button('Actions').absent()
    ]);
  }
};
